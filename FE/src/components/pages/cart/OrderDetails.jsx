import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './cart.module.css';
import { getOrderAPI, ensureImageUrl } from '../../../utils/functions';

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('');
      try {
        const data = await getOrderAPI(id);
        setOrder(data);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || 'שגיאה בטעינת הזמנה');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const items = order?.items || [];
  const schedule = order?.order?.schedule || {}; // expected: { [category_id]: { date, time } }

  const groups = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = String(it.category_id || '0');
      if (!map.has(key)) map.set(key, { id: it.category_id || 0, name: it.category_name || 'אחר', items: [] });
      map.get(key).items.push(it);
    }
    return Array.from(map.values());
  }, [items]);

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.planHeader}>
        <div className={styles.planHeaderRow}>
          <h2 className={styles.planTitle}>הזמנה #{order?.order?.order_id || id}</h2>
        </div>
      </div>

      {err && <div style={{ color: '#b91c1c', marginBottom: 8 }}>{err}</div>}
      {loading && <div>טוען...</div>}

      {!loading && groups.map(g => {
        const sc = schedule[g.id] || {};
        const catTotalPrice = g.items.reduce((s, it) => s + Number(it.price) * Number(it.quantity), 0);
        const catTotalCal = g.items.reduce((s, it) => s + Number(it.calories || 0) * Number(it.quantity), 0);
        return (
          <section key={g.id} className={styles.mealSection}>
            <div className={styles.mealHeader}>
              <div>
                <h3 className={styles.mealTitle}>{g.name}</h3>
                <div className={styles.mealCalories}>
                  <span className={styles.dot} /> {Math.round(catTotalCal)} ק״ק • {catTotalPrice.toFixed(2)} ₪
                </div>
                <div className={styles.smallMuted}>
                  זמן מתוכנן: {sc.date || '—'} {sc.time || ''}
                </div>
              </div>
            </div>
            <ul className={styles.mealList}>
              {g.items.map(it => (
                <li key={it.id} className={styles.mealItem}>
                  <img
                    src={ensureImageUrl(it.picture)}
                    alt={it.recipe_name}
                    className={styles.mealThumb}
                    onError={(e)=>{ e.currentTarget.style.display='none' }}
                  />
                  <div className={styles.mealBody}>
                    <div className={styles.mealNameLink}>{it.recipe_name}</div>
                    <div className={styles.smallDark}>{Number(it.calories || 0)} ק״ק למנה • כמות: {it.quantity}</div>
                  </div>
                  <div>{(Number(it.price) * Number(it.quantity)).toFixed(2)} ₪</div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}