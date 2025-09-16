import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from '../cart/cart.module.css';
import { getSessionUser, getCurrentCustomerId, getOrderAPI, createNotificationAPI } from '../../../utils/functions';

export default function OrderDetails() {
  const { id } = useParams(); // order id
  const orderId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({}); // per-field validation errors
  const [confirmed, setConfirmed] = useState(false);

  // User + customer
  const [user, setUser] = useState(null);
  const [custId, setCustId] = useState(null);

  // Prefilled from Settings if available
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [houseNum, setHouseNum] = useState('');
  const [floor, setFloor] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [paypal, setPaypal] = useState('');

  // Order totals
  const [orderTotal, setOrderTotal] = useState(0);

  const deliveryFee = 12;
  const grandTotal = useMemo(() => Number(orderTotal || 0) + deliveryFee, [orderTotal]);
  const emailRegex = /.+@.+\..+/;

  const validate = () => {
    const errs = {};
    if (!String(name).trim()) errs.name = 'נדרש שם מלא';
    if (!String(phone).trim()) errs.phone = 'נדרש טלפון';
    if (!String(city).trim()) errs.city = 'נדרשת עיר';
    if (!String(street).trim()) errs.street = 'נדרש רחוב';
    if (!String(houseNum).trim()) errs.houseNum = 'נדרש מספר בית';
    if (paypal && !emailRegex.test(String(paypal))) errs.paypal = 'דוא"ל לא תקין';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const u = await getSessionUser();
        if (cancelled) return;
        setUser(u);
        const cid = await getCurrentCustomerId();
        if (cancelled) return;
        setCustId(cid);
        // Load existing customer info
        try {
          const resCust = await fetch(`http://localhost:3000/api/customers/${cid}`, { credentials: 'include' });
          if (resCust.ok) {
            const c = await resCust.json();
            setName(c.name || '');
            setPhone(c.phone_number || '');
            setPaypal(c.paypal_email || '');
          }
        } catch {}
        // Load address
        try {
          const resAddr = await fetch(`http://localhost:3000/api/customers/${cid}/address`, { credentials: 'include' });
          if (resAddr.ok) {
            const a = await resAddr.json();
            setCity(a.city || '');
            setStreet(a.street || '');
            setHouseNum(a.house_Num || '');
            setFloor(a.floor || '');
            setCityCode(a.city_code || '');
          }
        } catch {}
        // Load order total
        try {
          if (Number.isFinite(orderId)) {
            const ord = await getOrderAPI(orderId);
            const total = Number(ord?.order?.total_price || 0);
            setOrderTotal(total);
          }
        } catch {}
      } catch (e) {
        if (!cancelled) setError(e?.message || 'שגיאה בטעינה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  const onConfirm = async () => {
    try {
      setSaving(true);
      setError('');
      if (!validate()) { setSaving(false); return; }
      // Save customer basics
      if (custId) {
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
      }

      // Send notifications (best-effort)
      try {
        if (user?.user_id) {
          await createNotificationAPI({
            user_id: user.user_id,
            type: 'order',
            related_id: orderId,
            title: `Order #${orderId} confirmed`,
            description: `סכום כולל (כולל משלוח): ${grandTotal.toFixed(2)}₪`,
          });
        }
      } catch (e) {
        // Non-fatal for UI
        console.warn('Notification send failed:', e?.message || e);
      }

      // Show read-only summary on this page
      setConfirmed(true);
    } catch (e) {
      setError(e?.message || 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.planHeader}>
        <div className={styles.planHeaderRow}>
          <h2 className={styles.planTitle}>פרטי משלוח והזמנה</h2>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</div>}
      {loading && <div>טוען...</div>}

      {!loading && !confirmed && (
        <div className={styles.mealSection} style={{ maxWidth: 560 }}>
          <div className={styles.mealHeader} style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <label>שם מלא
              <input className={styles.search} value={name} onChange={(e)=>setName(e.target.value)} />
              {fieldErrors.name && <div style={{ color:'#b91c1c', fontSize:12 }}>{fieldErrors.name}</div>}
            </label>
            <label>טלפון
              <input className={styles.search} value={phone} onChange={(e)=>setPhone(e.target.value)} />
              {fieldErrors.phone && <div style={{ color:'#b91c1c', fontSize:12 }}>{fieldErrors.phone}</div>}
            </label>
            <div style={{ display:'grid', gap:8, gridTemplateColumns:'1fr 1fr' }}>
              <label>עיר
                <input className={styles.search} value={city} onChange={(e)=>setCity(e.target.value)} />
                {fieldErrors.city && <div style={{ color:'#b91c1c', fontSize:12 }}>{fieldErrors.city}</div>}
              </label>
              <label>מיקוד
                <input className={styles.search} value={cityCode} onChange={(e)=>setCityCode(e.target.value)} />
              </label>
              <label>רחוב
                <input className={styles.search} value={street} onChange={(e)=>setStreet(e.target.value)} />
                {fieldErrors.street && <div style={{ color:'#b91c1c', fontSize:12 }}>{fieldErrors.street}</div>}
              </label>
              <label>מס׳ בית
                <input className={styles.search} value={houseNum} onChange={(e)=>setHouseNum(e.target.value)} />
                {fieldErrors.houseNum && <div style={{ color:'#b91c1c', fontSize:12 }}>{fieldErrors.houseNum}</div>}
              </label>
              <label>קומה
                <input className={styles.search} value={floor} onChange={(e)=>setFloor(e.target.value)} />
              </label>
            </div>
            <label>PayPal אימייל
              <input className={styles.search} type="email" value={paypal} onChange={(e)=>setPaypal(e.target.value)} />
              {fieldErrors.paypal && <div style={{ color:'#b91c1c', fontSize:12 }}>{fieldErrors.paypal}</div>}
            </label>
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span>סכום הזמנה</span>
              <span>{Number(orderTotal || 0).toFixed(2)} ₪</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', color:'#6b7280' }}>
              <span>דמי משלוח</span>
              <span>{deliveryFee.toFixed(2)} ₪</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:600, marginTop:6 }}>
              <span>לתשלום</span>
              <span>{grandTotal.toFixed(2)} ₪</span>
            </div>
            <div style={{ marginTop: 8, color:'#6b7280' }}>
              ישלח חיוב ל-PayPal: <strong>{paypal || '—'}</strong>
            </div>
          </div>

          <div className={styles.footerActions} style={{ marginTop: 16 }}>
            <button className={styles.btnPrimary} disabled={saving} onClick={onConfirm}>
              {saving ? 'שומר…' : 'אישור הזמנה'}
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} disabled={saving} onClick={()=>navigate(-1)}>חזרה</button>
          </div>
        </div>
      )}

      {/* Read-only confirmation summary */}
      {!loading && confirmed && (
        <div className={styles.mealSection} style={{ maxWidth: 560 }}>
          <h3 className={styles.mealTitle}>סיכום הזמנה</h3>
          <div style={{ display:'grid', gap:8 }}>
            <div><strong>שם מלא:</strong> {name || '—'}</div>
            <div><strong>טלפון:</strong> {phone || '—'}</div>
            <div><strong>כתובת:</strong> {street || '—'} {houseNum || ''}, {city || '—'} {cityCode ? `(${cityCode})` : ''}{floor ? `, קומה ${floor}` : ''}</div>
            <div><strong>PayPal:</strong> {paypal || '—'}</div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span>סכום הזמנה</span>
              <span>{Number(orderTotal || 0).toFixed(2)} ₪</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', color:'#6b7280' }}>
              <span>דמי משלוח</span>
              <span>{deliveryFee.toFixed(2)} ₪</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:600, marginTop:6 }}>
              <span>לתשלום</span>
              <span>{grandTotal.toFixed(2)} ₪</span>
            </div>
            <div style={{ marginTop: 8, color:'#6b7280' }}>
              ישלח חיוב ל-PayPal: <strong>{paypal || '—'}</strong>
            </div>
          </div>
          <div className={styles.footerActions} style={{ marginTop: 16 }}>
            <button className={styles.btnPrimary} onClick={()=>navigate('/customerhome')}>סיום</button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={()=>setConfirmed(false)}>עריכה</button>
          </div>
        </div>
      )}
    </div>
  );
}
