import React, { useContext, useEffect, useState } from 'react';
import styles from './profile.module.css';
import { AuthContext } from '../../../../app/App';
import { canonicalizeUserInputToHebrew } from '../../../../utils/allergens';
import { ALLERGEN_ALIASES } from '../../../../utils/allergens';

export default function Settings() {
    const { currentUser } = useContext(AuthContext) || {};
    const [custId, setCustId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [street, setStreet] = useState('');
    const [houseNum, setHouseNum] = useState('');
    const [floor, setFloor] = useState('');
    const [cityCode, setCityCode] = useState('');
    const [paypal, setPaypal] = useState(''); // UI only for now
    const [birthdate, setBirthdate] = useState('');
    // Allergies
    const [allergies, setAllergies] = useState([]); // [{comp_id, name}]
    const [allergyInput, setAllergyInput] = useState('');

    // Load customer and address
    useEffect(() => {
        const load = async () => {
            try {
                if (!currentUser?.user_id) return;
                setLoading(true);
                setError('');
                setSuccess('');
                // Get customer by user
                const resCust = await fetch(`http://localhost:3000/api/customers/by-user/${currentUser.user_id}`, { credentials: 'include' });
                if (!resCust.ok) {
                    try { const j = await resCust.json(); throw new Error(j?.message || 'שגיאה בטעינת פרטי הלקוח'); } catch { throw new Error('שגיאה בטעינת פרטי הלקוח'); }
                }
                const customer = await resCust.json();
                setCustId(customer.cust_id);
                setName(customer.name || '');
                setPhone(customer.phone_number || '');
                setPaypal(customer.paypal_email || '');
                // normalize birthdate to yyyy-mm-dd for <input type="date">
                if (customer.birthdate) {
                    const d = String(customer.birthdate);
                    const iso = d.length >= 10 ? d.slice(0,10) : d;
                    setBirthdate(iso);
                } else {
                    setBirthdate('');
                }
                // Try load address
                if (customer.cust_id) {
                    const resAddr = await fetch(`http://localhost:3000/api/customers/${customer.cust_id}/address`, { credentials: 'include' });
                    if (resAddr.ok) {
                        const addr = await resAddr.json();
                        setCity(addr.city || '');
                        setStreet(addr.street || '');
                        setHouseNum(addr.house_Num || '');
                        setFloor(addr.floor || '');
                        setCityCode(addr.city_code || '');
                    }
                    // Load allergies
                    const resAll = await fetch(`http://localhost:3000/api/customers/${customer.cust_id}/allergies`, { credentials: 'include' });
                    if (resAll.ok) {
                        const list = await resAll.json();
                        setAllergies(Array.isArray(list) ? list : []);
                    }
                }
            } catch (e) {
                setError(e.message || 'שגיאה');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser?.user_id]);

    // Add allergy by name (canonicalized to Hebrew)
    const addAllergy = async (name) => {
        const trimmed = String(name || '').trim();
        if (!trimmed || !custId) return;
        // Canonicalize to Hebrew category key (also handles English input)
        const canonical = canonicalizeUserInputToHebrew(trimmed);
        if (!canonical) {
            setAllergyInput('');
            return;
        }
        // Prevent duplicates by canonical form
        const hasDup = allergies.some(a => {
            const existingCanon = canonicalizeUserInputToHebrew(a?.name);
            return existingCanon && existingCanon === canonical;
        });
        if (hasDup) {
            setAllergyInput('');
            return;
        }
        try {
            const res = await fetch(`http://localhost:3000/api/customers/${custId}/allergies`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: canonical }),
            });
            if (!res.ok) {
                try { const j = await res.json(); throw new Error(j?.message || 'הוספת אלרגיה נכשלה'); } catch { throw new Error('הוספת אלרגיה נכשלה'); }
            }
            const item = await res.json();
            setAllergies(prev => [...prev, item]);
            setAllergyInput('');
        } catch (e) {
            setError(e.message || 'שגיאה');
        }
    };

    const removeAllergy = async (comp_id) => {
        if (!custId) return;
        try {
            const res = await fetch(`http://localhost:3000/api/customers/${custId}/allergies/${comp_id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!res.ok) {
                try { const j = await res.json(); throw new Error(j?.message || 'מחיקה נכשלה'); } catch { throw new Error('מחיקה נכשלה'); }
            }
            setAllergies(prev => prev.filter(a => String(a.comp_id) !== String(comp_id)));
        } catch (e) {
            setError(e.message || 'שגיאה');
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!custId) return;
        try {
            setSaving(true);
            setError('');
            setSuccess('');
            // Validate birthdate is not in the future
            if (birthdate) {
                const todayStr = new Date().toISOString().slice(0,10);
                if (birthdate > todayStr) {
                    setSaving(false);
                    setError('תאריך הלידה לא יכול להיות עתידי');
                    return;
                }
            }
            const body = {
                name,
                phone_number: phone,
                birthdate: birthdate || null,
                city,
                street,
                house_Num: houseNum,
                floor,
                city_code: cityCode,
                paypal_email: paypal,
            };
            const res = await fetch(`http://localhost:3000/api/customers/${custId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                try { const j = await res.json(); throw new Error(j?.message || 'שמירה נכשלה'); } catch { throw new Error('שמירה נכשלה'); }
            }
            setSuccess('נשמר בהצלחה');
        } catch (e2) {
            setError(e2.message || 'שמירה נכשלה');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <form className={styles.form} dir="rtl" onSubmit={onSubmit}>
                <label htmlFor="name">שם</label>
                <input className={styles.formInput} type="text" id="name" name="name" value={name} onChange={(e)=>setName(e.target.value)} />

                <label htmlFor="birthdate">תאריך לידה</label>
                <input
                  className={styles.formInput}
                  type="date"
                  id="birthdate"
                  name="birthdate"
                  value={birthdate}
                  max={new Date().toISOString().slice(0,10)}
                  onChange={(e)=>setBirthdate(e.target.value)}
                />

                <fieldset className={styles.formField}>
                    <legend className={styles.formLegend}>כתובת</legend>
                    <div className={styles.formGrid}>
                        <div className={styles.formField}>
                            <label htmlFor="city">עיר</label>
                            <input className={styles.formInput} type="text" id="city" name="city" value={city} onChange={(e)=>setCity(e.target.value)} />
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="street">רחוב</label>
                            <input className={styles.formInput} type="text" id="street" name="street" value={street} onChange={(e)=>setStreet(e.target.value)} />
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="house_Num">מספר בית</label>
                            <input className={styles.formInput} type="text" id="house_Num" name="house_Num" value={houseNum} onChange={(e)=>setHouseNum(e.target.value)} />
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="floor">קומה</label>
                            <input className={styles.formInput} type="text" id="floor" name="floor" value={floor} onChange={(e)=>setFloor(e.target.value)} />
                        </div>
                        <div className={styles.formField}>
                            <label htmlFor="city_code">מיקוד</label>
                            <input className={styles.formInput} type="text" id="city_code" name="city_code" value={cityCode} onChange={(e)=>setCityCode(e.target.value)} />
                        </div>
                    </div>
                </fieldset>

                <label htmlFor="paypal">אמצעי תשלום</label>
                <input className={styles.formInput} type="email" id="paypal" name="paypal" value={paypal} onChange={(e)=>setPaypal(e.target.value)} />

                <label htmlFor="phone">טלפון</label>
                <input className={styles.formInput} type="tel" id="phone" name="phone" value={phone} onChange={(e)=>setPhone(e.target.value)} />

                <fieldset className={styles.formField}>
                    <legend className={styles.formLegend}>אלרגיות</legend>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                className={styles.formInput}
                                type="text"
                                placeholder="הקלידו אלרגיה ולחצו אנטר"
                                value={allergyInput}
                                onChange={(e)=>setAllergyInput(e.target.value)}
                                onKeyDown={(e)=>{
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addAllergy(allergyInput);
                                    }
                                }}
                            />
                            <button type="button" className={styles.primaryBtn} onClick={()=>addAllergy(allergyInput)}>הוסף</button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {allergies.map(a => (
                                <span key={a.comp_id} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 8px', background:'#eef0f3', borderRadius:9999 }}>
                                    {a.name}
                                    <button type="button" onClick={()=>removeAllergy(a.comp_id)} style={{ border:'none', background:'transparent', cursor:'pointer' }} aria-label={`הסר ${a.name}`}>×</button>
                                </span>
                            ))}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>
                            קטגוריות מוכרות: {Object.keys(ALLERGEN_ALIASES).join(', ')}. אפשר להקליד גם באנגלית (יומר אוטומטית לעברית).
                        </div>
                    </div>
                </fieldset>

                {loading && <span>טוען…</span>}
                {error && <span style={{ color: '#b91c1c' }}>{error}</span>}
                {success && <span style={{ color: '#065f46' }}>{success}</span>}

                <button className={styles.primaryBtn} type="submit" disabled={saving || loading}>
                    {saving ? 'שומר…' : 'שמירה'}
                </button>
            </form>
        </div>
    );
}