import React, { useContext, useEffect, useState } from 'react';
import styles from './profile.module.css';
import { AuthContext } from '../../../../app/App';

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
                }
            } catch (e) {
                setError(e.message || 'שגיאה');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser?.user_id]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!custId) return;
        try {
            setSaving(true);
            setError('');
            setSuccess('');
            const body = {
                name,
                phone_number: phone,
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