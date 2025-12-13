import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styles from '../cart/cart.module.css';
import { getSessionUser, getCurrentCustomerId, getOrderAPI, createNotificationAPI } from '../../../utils/functions';
import { generateOrderReceiptPDF } from '../../../utils/receipt';

export default function OrderDetails() {
  const { id } = useParams(); // order id
  const orderId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({}); // per-field validation errors
  const [confirmed, setConfirmed] = useState(false);
  const [paypalConfirming, setPaypalConfirming] = useState(false);
  const [paypalConfirmed, setPaypalConfirmed] = useState(false);
  const [showPayNotice, setShowPayNotice] = useState(false);

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
  const [orderData, setOrderData] = useState(null); // { order, items }
  const [paymentGroupId, setPaymentGroupId] = useState(null);
  const [childOrders, setChildOrders] = useState([]); // [{ order_id, category_id, delivery_time, total_price }]
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const isDraft = !!(orderData?.order?.order_status === 'draft');

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
          const resCust = await fetch(`/api/customers/${cid}`, { credentials: 'include' });
          if (resCust.ok) {
            const c = await resCust.json();
            setName(c.name || '');
            setPhone(c.phone_number || '');
            setPaypal(c.paypal_email || '');
          }
        } catch {}
        // Load address
        try {
          const resAddr = await fetch(`/api/customers/${cid}/address`, { credentials: 'include' });
          if (resAddr.ok) {
            const a = await resAddr.json();
            setCity(a.city || '');
            setStreet(a.street || '');
            setHouseNum(a.house_Num || '');
            setFloor(a.floor || '');
            setCityCode(a.city_code || '');
          }
        } catch {}
        // Load order total or grouped totals
        try {
          const st = location?.state || {};
          const pgid = st?.payment_group_id || null;
          const children = Array.isArray(st?.orders) ? st.orders : [];
          setPaymentGroupId(pgid);
          setChildOrders(children);
          if (children.length > 0) {
            const sum = children.reduce((s, o) => s + Number(o.total_price || 0), 0);
            setOrderTotal(sum);
            // Also load primary order details for receipt and items preview
            if (Number.isFinite(orderId)) {
              const ord = await getOrderAPI(orderId);
              setOrderData(ord || null);
            }
          } else if (Number.isFinite(orderId)) {
            const ord = await getOrderAPI(orderId);
            const total = Number(ord?.order?.total_price || 0);
            setOrderTotal(total);
            setOrderData(ord || null);
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

  // Auto-download receipt when navigated with ?action=download-receipt
  useEffect(() => {
    try {
      const qs = new URLSearchParams(location.search || '');
      const action = qs.get('action');
      if (action === 'download-receipt' && orderData && !autoDownloaded) {
        const ord = orderData?.order || { order_id: orderId };
        const items = Array.isArray(orderData?.items) ? orderData.items : [];
        generateOrderReceiptPDF({
          siteName: 'Nutribite',
          orderId,
          order: ord,
          items,
          deliveryFee,
          customerName: name,
          paymentMethod: paypal ? `PayPal (${paypal})` : '—',
        });
        setAutoDownloaded(true);
      }
    } catch (_) {}
  }, [location.search, orderData, orderId, autoDownloaded]);

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
        const res = await fetch(`/api/customers/${custId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          try { const j = await res.json(); throw new Error(j?.message || 'שמירה נכשלה'); } catch { throw new Error('שמירה נכשלה'); }
        }
      }

      // Send confirmation notification once (best-effort)
      try {
        if (user?.user_id) {
          const res = await fetch(`/api/notifications/user/${user.user_id}`, { credentials: 'include' });
          let existing = [];
          if (res.ok) existing = await res.json();
          const hasConfirmation = Array.isArray(existing) && existing.some(n => (
            String(n.type) === 'order' && Number(n.related_id) === Number(orderId) &&
            (String(n.title || '').includes('אושרה') || /Order\s*#\s*${orderId}\s*confirmed/i.test(String(n.title || '')))
          ));
          if (!hasConfirmation) {
            await createNotificationAPI({
              user_id: user.user_id,
              type: 'order',
              related_id: orderId,
              title: `הזמנה #${orderId} אושרה`,
              description: `לתשלום (כולל משלוח): ${grandTotal.toFixed(2)}₪`,
            });
          }
        }
      } catch (e) {
        // Non-fatal for UI
        console.warn('Notification send failed:', e?.message || e);
      }

      // Show read-only summary on this page
      // Mark order(s) as confirmed in backend
      const idsToConfirm = (childOrders && childOrders.length > 0)
        ? childOrders.map(o => o.order_id)
        : [orderId];
      for (const oid of idsToConfirm) {
        const res = await fetch(`/api/orders/${oid}/confirm`, { method: 'POST', credentials: 'include' });
        if (!res.ok) {
          try { const j = await res.json(); throw new Error(j?.message || 'אישור הזמנה נכשל'); } catch { throw new Error('אישור הזמנה נכשל'); }
        }
      }
      setConfirmed(true);
    } catch (e) {
      setError(e?.message || 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  const onRebuildCart = async () => {
    try {
      setSaving(true);
      setError('');
      const res = await fetch(`/api/orders/${orderId}/rebuild_cart`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        try { const j = await res.json(); throw new Error(j?.message || 'שחזור לעגלה נכשל'); } catch { throw new Error('שחזור לעגלה נכשל'); }
      }
      // Go back to scheduling page with items restored
      navigate('/order');
    } catch (e) {
      setError(e?.message || 'שחזור לעגלה נכשל');
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
        <div className={styles.mealSection} style={{ maxWidth: 640, marginInline: 'auto' }}>
          {/* Card: Customer + Address */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>פרטי לקוח ומשלוח</h3>
            <div style={{ display:'grid', gap:12 }}>
              <div>
                <label className={styles.fieldLabel}>שם מלא</label>
                <input className={styles.input} value={name} onChange={(e)=>setName(e.target.value)} />
                {fieldErrors.name && <div className={styles.fieldError}>{fieldErrors.name}</div>}
              </div>
              <div>
                <label className={styles.fieldLabel}>טלפון</label>
                <input className={styles.input} value={phone} onChange={(e)=>setPhone(e.target.value)} />
                {fieldErrors.phone && <div className={styles.fieldError}>{fieldErrors.phone}</div>}
              </div>
              <div className={styles.formGrid}>
                <div>
                  <label className={styles.fieldLabel}>עיר</label>
                  <input className={styles.input} value={city} onChange={(e)=>setCity(e.target.value)} />
                  {fieldErrors.city && <div className={styles.fieldError}>{fieldErrors.city}</div>}
                </div>
                <div>
                  <label className={styles.fieldLabel}>מיקוד</label>
                  <input className={styles.input} value={cityCode} onChange={(e)=>setCityCode(e.target.value)} />
                </div>
                <div>
                  <label className={styles.fieldLabel}>רחוב</label>
                  <input className={styles.input} value={street} onChange={(e)=>setStreet(e.target.value)} />
                  {fieldErrors.street && <div className={styles.fieldError}>{fieldErrors.street}</div>}
                </div>
                <div>
                  <label className={styles.fieldLabel}>מס׳ בית</label>
                  <input className={styles.input} value={houseNum} onChange={(e)=>setHouseNum(e.target.value)} />
                  {fieldErrors.houseNum && <div className={styles.fieldError}>{fieldErrors.houseNum}</div>}
                </div>
                <div>
                  <label className={styles.fieldLabel}>קומה</label>
                  <input className={styles.input} value={floor} onChange={(e)=>setFloor(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Grouped orders summary if applicable */}
          {childOrders.length > 0 && (
            <div className={styles.card} style={{ marginTop: 12 }}>
              <h3 className={styles.cardTitle}>פירוט הזמנות לפי קטגוריה</h3>
              <div style={{ display:'grid', gap:8 }}>
                {childOrders.map((o) => (
                  <div key={o.order_id} style={{ display:'flex', justifyContent:'space-between', color:'#374151' }}>
                    <span>#{o.order_id} • זמן: {o.delivery_time || '—'}</span>
                    <span>{Number(o.total_price || 0).toFixed(2)} ₪</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Card: PayPal (moved under totals) */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>תשלום PayPal</h3>
            <div className={styles.formGrid}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className={styles.fieldLabel}>PayPal אימייל</label>
                <input className={styles.input} type="email" value={paypal} onChange={(e)=>setPaypal(e.target.value)} />
                {fieldErrors.paypal && <div className={styles.fieldError}>{fieldErrors.paypal}</div>}
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap: 8 }}>
                {!paypalConfirmed ? (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    disabled={paypalConfirming || !paypal || saving}
                    onClick={async () => {
                      setPaypalConfirming(true);
                      // simulate short confirm animation
                      await new Promise(r => setTimeout(r, 600));
                      setPaypalConfirming(false);
                      setPaypalConfirmed(true);
                      setShowPayNotice(true);
                      setTimeout(() => setShowPayNotice(false), 2000);
                      // finalize order on confirm
                      await onConfirm();
                      setTimeout(() => setPaypalConfirmed(false), 2000);
                    }}
                  >
                    {paypalConfirming || saving ? 'מאשר…' : 'אשר תשלום'}
                  </button>
                ) : (
                  <button type="button" className={styles.successPill}>אושר ✓</button>
                )}
              </div>
              {showPayNotice && (
                <div style={{ gridColumn: '1 / -1', color:'#374151', marginTop: 6 }}>
                  התשלום יחויב לכתובת: <strong>{paypal || '—'}</strong>
                </div>
              )}
            </div>
          </div>

          <div className={styles.footerActions} style={{ marginTop: 16 }}>
            {isDraft ? (
              <>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  disabled={saving}
                  onClick={onRebuildCart}
                  title="חזרה לעמוד ההזמנה והעגלה (משחזר פריטים)"
                >
                  חזרה
                </button>
                <button className={`${styles.btn}`} disabled={saving} onClick={onRebuildCart}>שחזר לעגלה</button>
              </>
            ) : (
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                disabled={saving}
                onClick={() => navigate('/orders')}
              >
                חזרה לרשימת הזמנות
              </button>
            )}
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
            <button
              className={styles.btn}
              onClick={() => {
                try {
                  const ord = orderData?.order || { order_id: orderId };
                  const items = Array.isArray(orderData?.items) ? orderData.items : [];
                  generateOrderReceiptPDF({
                    siteName: 'Nutribite',
                    orderId,
                    order: ord,
                    items,
                    deliveryFee,
                    customerName: name,
                    paymentMethod: paypal ? `PayPal (${paypal})` : '—',
                  });
                } catch (e) {
                  // eslint-disable-next-line no-alert
                  alert('נכשלה יצירת קובץ הקבלה');
                }
              }}
            >
              הורד קבלה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
