import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from '../cart/cart.module.css';
import { listOrdersAPI, getLatestDraftOrderAPI } from '../../../utils/functions';

export default function Orders() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftId, setDraftId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const list = await listOrdersAPI();
        if (!cancelled) setItems(Array.isArray(list) ? list : []);
        // try to fetch latest draft
        try {
          const did = await getLatestDraftOrderAPI();
          if (!cancelled) setDraftId(did);
        } catch (_) {}
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || 'שגיאה בטעינה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fmtDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('he-IL');
    } catch { return iso || ''; }
  };

  // Try to extract delivery date/time from various possible fields
  const fmtDelivery = (o) => {
    if (!o) return '';
    // Common possibilities from backend
    const dateFields = [
      o.delivery_date,
      o.order_date,
      o.set_delivery_date,
      o.delivery_datetime, // may include both
    ].filter(Boolean);
    const timeFields = [
      o.delivery_time,
      o.set_delivery_time,
    ].filter(Boolean);

    // If delivery_datetime provided, format it fully
    if (o.delivery_datetime) {
      try { return new Date(o.delivery_datetime).toLocaleString('he-IL'); } catch {}
    }
    const dateStr = dateFields.length ? dateFields[0] : null;
    const timeStr = timeFields.length ? timeFields[0] : null;
    if (dateStr && timeStr) {
      // Combine date+time
      try { return new Date(`${dateStr}T${timeStr}`).toLocaleString('he-IL'); } catch {}
      return `${dateStr} ${timeStr}`;
    }
    if (dateStr) return fmtDate(dateStr);
    if (timeStr) return String(timeStr);
    return '';
  };

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.planHeader}>
        <div className={styles.planHeaderRow}>
          <h2 className={styles.planTitle}>ההזמנות שלי</h2>
        </div>
        <div className={styles.planHeaderRow} style={{ gap: 8 }}>
          {draftId && (
            <button className={styles.btnPrimary} onClick={() => navigate(`/orders/${draftId}`)}>המשך הזמנה</button>
          )}
          <button className={styles.btn} onClick={() => navigate('/cart')}>הזמן עכשיו</button>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</div>}
      {loading && <div>טוען...</div>}

      {!loading && items.length === 0 && (
        <div className={styles.mealSection}>
          <div style={{ color: '#6b7280' }}>אין הזמנות להצגה.</div>
          <div style={{ marginTop: 12, display:'flex', gap:8 }}>
            {draftId && (
              <button className={styles.btnPrimary} onClick={() => navigate(`/orders/${draftId}`)}>המשך הזמנה</button>
            )}
            <button className={styles.btn} onClick={() => navigate('/cart')}>הזמן עכשיו</button>
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <section className={styles.mealSection}>
          <ul className={styles.mealList}>
            {items.map((o) => (
              <li key={o.order_id} className={styles.mealItem}>
                <div className={styles.mealBody}>
                  <div className={styles.mealNameLink}>
                    הזמנה #{o.order_id}
                  </div>
                  <div className={styles.smallDark}>
                    מצב: {o.status || '—'} • סכום: {Number(o.total_price || 0).toFixed(2)} ₪ • תאריך: {fmtDate(o.created_at)}
                  </div>
                  {fmtDelivery(o) && (
                    <div className={styles.smallMuted}>מועד משלוח: {fmtDelivery(o)}</div>
                  )}
                  {o.total_calories != null && (
                    <div className={styles.smallMuted}>סה"כ קלוריות: {Number(o.total_calories || 0)}</div>
                  )}
                </div>
                <div>
                  <Link className={styles.btnPrimary} to={`/orders/${o.order_id}`}>פרטים</Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
