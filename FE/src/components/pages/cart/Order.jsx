import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './cart.module.css';
import {
  getCartAPI,
  getCartSummaryAPI,
  checkoutOrderAPI,
  ensureImageUrl,
} from '../../../utils/functions';

// Order of categories for display: breakfast → drink → snack → lunch → dinner → dessert
const HEBREW_CATEGORY_ORDER = new Map([
  ['ארוחת בוקר', 1],
  ['משקה', 2],
  ['משקאות', 2],
  ['חטיף', 3],
  ['חטיפים', 3],
  ['ארוחת צהריים', 4],
  ['ארוחת צהרים', 4],
  ['צהריים', 4],
  ['צהרים', 4],
  ['ארוחת ערב', 5],
  ['קינוח', 6],
  ['קינוחים', 6],
]);

function orderIndexForCategory(name) {
  const he = String(name || '').trim();
  return HEBREW_CATEGORY_ORDER.get(he) ?? 999;
}

export default function Order() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total_price: 0, total_items: 0, total_calories: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  // schedule: { [category_id]: { date: 'YYYY-MM-DD', time: 'HH:mm' } }
  const [schedule, setSchedule] = useState({});

  const refresh = async () => {
    setLoading(true);
    setErr('');
    try {
      const [list, sum] = await Promise.all([getCartAPI(), getCartSummaryAPI()]);
      setItems(Array.isArray(list) ? list : []);
      setSummary(sum || { total_price: 0, total_items: 0, total_calories: 0 });
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const groups = useMemo(() => {
    const map = new Map();
    for (const it of (items || [])) {
      const key = String(it.category_id || '0');
      if (!map.has(key)) map.set(key, { id: it.category_id || 0, name: it.category_name || 'אחר', items: [] });
      map.get(key).items.push(it);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const ai = orderIndexForCategory(a.name);
      const bi = orderIndexForCategory(b.name);
      if (ai !== bi) return ai - bi;
      return String(a.name).localeCompare(String(b.name));
    });
    return arr;
  }, [items]);

  const validateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    const now = new Date();

    const [hh, mm] = (timeStr || '').split(':').map(n => Number(n));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;
    if (hh < 6 || hh > 23) return false; // allowed 06:00–23:59

    const dt = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(dt.getTime())) return false;
    return dt.getTime() >= now.getTime();
  };

  const onPlace = async () => {
    try {
      // ensure each category has a valid schedule
      for (const g of groups) {
        const sc = schedule[g.id] || {};
        if (!validateTime(sc.date, sc.time)) {
          setErr(`אנא בחר/י תאריך ושעה תקפים לקטגוריה: ${g.name} (06:00–23:00, לא בעבר)`);
          return;
        }
      }

      // Build payload: backend expects schedule[categoryId] as an ISO-like datetime string
      const payloadSchedule = {};
      for (const g of groups) {
        const sc = schedule[g.id] || {};
        payloadSchedule[String(g.id)] = `${sc.date}T${sc.time}`;
      }
      const payload = { schedule: payloadSchedule };
      const data = await checkoutOrderAPI(payload);
      const orderId = data?.order_id;
      if (!orderId) throw new Error('Order creation failed');
      navigate(`/orders/${orderId}`);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || 'שגיאה בהזמנה');
    }
  };

  return (
    <div className={styles.page} dir="rtl">
      <div className={styles.planHeader}>
        <div className={styles.planHeaderRow}>
          <h2 className={styles.planTitle}>פרטי הזמנה</h2>
        </div>
        <div className={styles.planHeaderRow}>
          <div className={styles.planCalories}><span className={styles.dot} /> פריטים: {summary.total_items}</div>
          <div className={styles.planCalories}><span className={styles.dot} /> סך הכל: {Number(summary.total_price || 0).toFixed(2)} ₪</div>
        </div>
      </div>

      {err && <div style={{ color: '#b91c1c', marginBottom: 8 }}>{err}</div>}
      {loading && <div>טוען...</div>}

      {!loading && groups.map(g => {
        const sc = schedule[g.id] || {};
        const catTotalPrice = g.items.reduce((s, it) => s + Number(it.unit_price_gross ?? it.price) * Number(it.quantity), 0);
        const catTotalCal = g.items.reduce((s, it) => s + Number(it.calories || 0) * Number(it.quantity), 0);
        return (
          <section key={g.id} className={styles.mealSection}>
            <div className={styles.mealHeader}>
              <div>
                <h3 className={styles.mealTitle}>{g.name}</h3>
                <div className={styles.mealCalories}>
                  <span className={styles.dot} /> {Math.round(catTotalCal)} ק״ק • {catTotalPrice.toFixed(2)} ₪
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label>תאריך</label>
                <input
                  type="date"
                  value={sc.date || ''}
                  onChange={(e) => setSchedule(prev => ({ ...prev, [g.id]: { ...prev[g.id], date: e.target.value } }))}
                />
                <label>שעה</label>
                <input
                  type="time"
                  min="06:00"
                  max="23:00"
                  value={sc.time || ''}
                  onChange={(e) => setSchedule(prev => ({ ...prev, [g.id]: { ...prev[g.id], time: e.target.value } }))}
                />
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
                    <div className={styles.smallMuted}>
                      מחיר ליחידה (כולל מע"מ): {(Number(it.unit_price_gross ?? it.price) || 0).toFixed(2)} ₪
                      {typeof it.tax_amount !== 'undefined' && (
                        <> • מע"מ ליחידה: {(Number(it.tax_amount) || 0).toFixed(2)} ₪</>
                      )}
                    </div>
                  </div>
                  <div>{(Number(it.unit_price_gross ?? it.price) * Number(it.quantity)).toFixed(2)} ₪</div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className={styles.footerActions}>
        <button className={styles.btnPrimary} disabled={items.length === 0} onClick={onPlace}>
          בצע הזמנה
        </button>
      </div>
    </div>
  );
}