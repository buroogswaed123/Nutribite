import React, { useEffect, useMemo, useState } from 'react';
import Loading from '../../common/Loading';
import { useNavigate } from 'react-router-dom';
import styles from './cart.module.css';
import {
  getCartAPI,
  getCartSummaryAPI,
  checkoutOrderAPI,
  ensureImageUrl,
  getSessionUser,
  createNotificationAPI,
  fetchNotificationsAPI,
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
  const [placing, setPlacing] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingInfo, setMissingInfo] = useState({ missingDates: [], missingTimes: [] });
  // schedule: { [category_id]: { date: 'YYYY-MM-DD', time: 'HH:mm' } }
  const [schedule, setSchedule] = useState({});
  const DRAFT_KEY = 'nb_order_schedule';
  const [applyAllDate, setApplyAllDate] = useState(''); // YYYY-MM-DD

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

  // Load any saved schedule draft on first render
  useEffect(() => {
    try {
      const raw = (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem(DRAFT_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setSchedule(parsed);
        }
      }
    } catch (_) { /* ignore */ }
    // no cleanup needed
  }, []);

  // Persist schedule draft as it changes
  useEffect(() => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(schedule || {}));
      }
    } catch (_) { /* ignore */ }
  }, [schedule]);

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

  // Derived flag: any category invalid (for top label)
  const anyInvalid = useMemo(() => {
    try {
      if (!groups || groups.length === 0) return false;
      for (const g of groups) {
        const sc = schedule[g.id] || {};
        if (!validateTime(sc.date, sc.time)) return true;
      }
      return false;
    } catch (_) { return false; }
  }, [groups, schedule]);

  // Derived flag: all categories have valid date/time (compute after groups exists)
  const allValid = useMemo(() => {
    try {
      if (!groups || groups.length === 0) return false;
      for (const g of groups) {
        const sc = schedule[g.id] || {};
        if (!validateTime(sc.date, sc.time)) return false;
      }
      return true;
    } catch (_) { return false; }
  }, [groups, schedule]);

  const validateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [hh, mm] = (timeStr || '').split(':').map(n => Number(n));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;
    if (hh < 6 || hh > 23) return false; // allowed 06:00–23:59

    const dt = new Date(`${dateStr}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`);
    if (isNaN(dt.getTime())) return false;

    // Date must be in [today, today+7]
    const dtDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    if (dtDay.getTime() < today.getTime()) return false;
    if (dtDay.getTime() > weekAhead.getTime()) return false;

    // If date is today, time must not be in the past
    if (dtDay.getTime() === today.getTime() && dt.getTime() < now.getTime()) return false;
    return true;
  };

  // Helpers for input min/max attributes
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const weekAheadStr = (() => {
    const t = new Date();
    t.setDate(t.getDate() + 7);
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  })();
  const currentTimeRounded = () => {
    const d = new Date();
    // Round up to next 5 minutes
    const ms = 5 * 60 * 1000;
    const rounded = new Date(Math.ceil(d.getTime() / ms) * ms);
    return `${String(rounded.getHours()).padStart(2,'0')}:${String(rounded.getMinutes()).padStart(2,'0')}`;
  };

  // Utilities
  const toMinutes = (t) => { const [h,m] = String(t).split(':').map(Number); return h*60 + (m||0); };
  const clampTime = (t) => {
    const minT = '06:00';
    const maxT = '23:59';
    const tm = toMinutes(t);
    return tm < toMinutes(minT) ? minT : (tm > toMinutes(maxT) ? maxT : t);
  };

  const addMinutes = (dateObj, minutes) => {
    const d = new Date(dateObj.getTime());
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  };

  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fmtTime = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

  // Standard default time by category name
  const standardTimeForCategory = (name) => {
    const he = String(name || '').trim();
    // breakfast, drink, snack, lunch, dinner, dessert
    if (['ארוחת בוקר'].includes(he)) return '08:00';
    if (['משקה','משקאות'].includes(he)) return '09:00';
    if (['חטיף','חטיפים'].includes(he)) return '16:00';
    if (['ארוחת צהריים','ארוחת צהרים','צהריים','צהרים'].includes(he)) return '13:00';
    if (['ארוחת ערב'].includes(he)) return '19:00';
    if (['קינוח','קינוחים'].includes(he)) return '20:00';
    return '12:00';
  };

  const onPlace = async () => {
    try {
      setPlacing(true);
      // Check for missing date/time
      const missingDates = [];
      const missingTimes = [];
      for (const g of groups) {
        const sc = schedule[g.id] || {};
        if (!sc.date) missingDates.push(g);
        if (!sc.time) missingTimes.push(g);
      }
      if (missingDates.length > 0 || missingTimes.length > 0) {
        setMissingInfo({ missingDates, missingTimes });
        setShowMissingModal(true);
        setPlacing(false);
        return;
      }

      // Validate current schedule
      for (const g of groups) {
        const sc = schedule[g.id] || {};
        if (!validateTime(sc.date, sc.time)) {
          const dStr = sc.date || '—';
          const tStr = sc.time || '—';
          setErr(`אנא בחר/י תאריך ושעה לקטגוריה: ${g.name} (06:00–23:00). נבחר: ${dStr} ${tStr}`);
          try { console.warn('Invalid schedule for category', { category: g, schedule: sc }); } catch (_) {}
          setPlacing(false);
          return;
        }
      }

      // Build payload: backend expects schedule[categoryId] as an ISO-like datetime string
      const payloadSchedule = {};
      for (const g of groups) {
        const sc = schedule[g.id] || {};
        payloadSchedule[String(g.id)] = `${sc.date}T${sc.time}`;
      }
      // We do not send applyToAll; schedule remains per-category
      try { /* optionally log */ } catch (_) {}
      const data = await checkoutOrderAPI({ schedule: payloadSchedule });
      const childOrders = Array.isArray(data?.orders) ? data.orders : [];
      const orderId = data?.order_id || (childOrders[0]?.order_id);
      if (!orderId) throw new Error('Order creation failed');
      // Create a notification so the user can continue setup later
      try {
        const user = await getSessionUser();
        if (user && user.user_id) {
          // Avoid duplicates: skip if there is an unread continue-notification for this order
          let hasExisting = false;
          try {
            const existing = await fetchNotificationsAPI(user.user_id);
            hasExisting = Array.isArray(existing) && existing.some(n => (
              String(n.type) === 'order' && Number(n.related_id) === Number(orderId) &&
              String(n.title || '').includes('המשך הגדרת ההזמנה') && n.status !== 'read'
            ));
          } catch(_) {}
          if (!hasExisting) {
            await createNotificationAPI({
              user_id: user.user_id,
              type: 'order',
              related_id: orderId,
              title: `המשך הגדרת ההזמנה #${orderId}`,
              description: 'לחצו כדי להמשיך בהגדרת ההזמנה שלכם',
            });
          }
        }
      } catch (_) { /* non-fatal */ }
      // Do NOT clear draft; keep schedule in sessionStorage so going back retains values
      navigate(`/orders/${orderId}`, { state: { orders: childOrders } });
    } catch (e) {
      const serverMsg = e?.response?.data?.message;
      const serverErr = e?.response?.data?.error;
      const full = serverMsg ? (serverErr ? `${serverMsg}: ${serverErr}` : serverMsg) : (e.message || 'שגיאה בהזמנה');
      setErr(full);
      try { console.error('Checkout failed:', e); } catch (_) {}
    }
    finally {
      setPlacing(false);
    }
  };

  // Handler for modal actions (apply defaults based on rules)
  const applyDefaultsForMissing = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24*60*60*1000);
    const plus40 = addMinutes(now, 40);
    const plus40SameDay = (plus40.getFullYear() === today.getFullYear() && plus40.getMonth() === today.getMonth() && plus40.getDate() === today.getDate());
    const plus40Time = fmtTime(plus40);
    const withinHours = plus40SameDay && toMinutes(clampTime(plus40Time)) >= toMinutes('06:00') && toMinutes(clampTime(plus40Time)) <= toMinutes('23:59');
    const todayStrLocal = fmtDate(today);
    const tomorrowStr = fmtDate(tomorrow);
    const plus40Clamped = clampTime(plus40Time);

    setSchedule(prev => {
      const next = { ...prev };
      for (const g of groups) {
        const current = next[g.id] || {};
        const hasDate = !!current.date;
        const hasTime = !!current.time;

        // Case A: no date and no time
        if (!hasDate && !hasTime) {
          if (withinHours) {
            // Use today + 40 mins
            next[g.id] = { date: todayStrLocal, time: plus40Clamped };
          } else {
            // Too late today → set to tomorrow with category default time
            let t = standardTimeForCategory(g.name);
            t = clampTime(t);
            next[g.id] = { date: tomorrowStr, time: t };
          }
          continue;
        }

        // Case B: date is set for today, but time missing → use today + 40 if within hours; else tomorrow default
        if (hasDate && current.date === todayStrLocal && !hasTime) {
          if (withinHours) {
            next[g.id] = { ...current, time: plus40Clamped };
          } else {
            let t = standardTimeForCategory(g.name);
            t = clampTime(t);
            next[g.id] = { date: tomorrowStr, time: t };
          }
          continue;
        }

        // Case C: time set without date, and time is later than today+40 → auto make the date today
        if (!hasDate && hasTime) {
          try {
            const [hh, mm] = String(current.time).split(':').map(Number);
            if (Number.isFinite(hh) && Number.isFinite(mm)) {
              const tm = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
              if (withinHours && toMinutes(tm) >= toMinutes(plus40Clamped)) {
                next[g.id] = { date: todayStrLocal, time: clampTime(tm) };
                continue;
              }
            }
          } catch (_) { /* ignore parse error */ }
          // otherwise leave as-is (user must choose a date)
        }

        // Case D: date exists but time missing (not today) → set per-category standard time respecting min if date is today
        if (hasDate && !hasTime) {
          let t = standardTimeForCategory(g.name);
          const minT = (current.date === todayStrLocal) ? currentTimeRounded() : '06:00';
          if (toMinutes(t) < toMinutes(minT)) t = minT;
          t = clampTime(t);
          next[g.id] = { ...current, time: t };
          continue;
        }

        // Other cases (already has both, or other combos not specified) → leave untouched
      }
      return next;
    });

    setShowMissingModal(false);
    setMissingInfo({ missingDates: [], missingTimes: [] });
  };

  return (
    <div className={styles.page} dir="rtl">
      {/* Missing fields modal */}
      {showMissingModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 50 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:16, width:'min(520px, 92vw)', boxShadow:'0 10px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin:'0 0 8px 0' }}>חסרים שדות</h3>
            <div style={{ color:'#374151', marginBottom: 12 }}>
              נראה כי לא כל הקטגוריות כוללות תאריך/שעה. אפשר לערוך ידנית או לקבוע זמני ברירת מחדל.
            </div>
            <ul style={{ margin:'0 0 12px 18px', color:'#6b7280', fontSize:13 }}>
              {missingInfo.missingDates?.length > 0 && (
                <li>חסרים תאריכים ב-{missingInfo.missingDates.length} קטגוריות</li>
              )}
              {missingInfo.missingTimes?.length > 0 && (
                <li>חסרות שעות ב-{missingInfo.missingTimes.length} קטגוריות</li>
              )}
            </ul>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className={styles.btn} onClick={() => { setShowMissingModal(false); }}>
                עריכה
              </button>
              <button className={styles.btnPrimary} onClick={applyDefaultsForMissing}>
                קבע זמן ברירת מחדל
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.planHeader}>
        <div className={styles.planHeaderRow}>
          <h2 className={styles.planTitle}>פרטי הזמנה</h2>
        </div>
        <div className={styles.planHeaderRow}>
          <div className={styles.planCalories}><span className={styles.dot} /> פריטים: {summary.total_items}</div>
          <div className={styles.planCalories}><span className={styles.dot} /> סך הכל: {Number(summary.total_price || 0).toFixed(2)} ₪</div>
        </div>
      </div>
      {/* Single top validation label under header */}
      {!loading && anyInvalid && (
        <div style={{ color: '#b91c1c', marginTop: 8 }}>בחר/י תאריך ושעה (06:00–23:59)</div>
      )}
      {err && <div style={{ color: '#b91c1c', marginBottom: 8 }}>{err}</div>}
      {loading && <Loading text="טוען עגלה..." />}

      {/* Apply DATE for all categories (keeps each category's time as-is) */}
      <div className={styles.mealSection} style={{ marginTop: 12 }}>
        <div className={styles.mealHeader} style={{ display:'flex', gap: 8, alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end' }}>
          <input
            type="date"
            value={applyAllDate}
            onChange={(e)=> {
              setApplyAllDate(e.target.value);
              setErr('');
            }}
            min={todayStr}
            max={weekAheadStr}
          />
          <button
            className={styles.btn}
            onClick={() => {
              setErr('');
              if (!applyAllDate) { setErr('אנא בחר/י תאריך'); return; }
              const d = new Date(`${applyAllDate}T12:00:00`);
              if (isNaN(d.getTime())) { setErr('תאריך לא תקין'); return; }
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const weekAhead = new Date(today.getTime() + 7*24*60*60*1000);
              const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
              if (dDay.getTime() < today.getTime() || dDay.getTime() > weekAhead.getTime()) { setErr('הטווח המותר הוא היום ועד שבוע קדימה'); return; }
              const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              setSchedule(prev => {
                const next = { ...prev };
                for (const g of groups) {
                  const prevTime = prev[g.id]?.time || '';
                  next[g.id] = { date: dateStr, time: prevTime };
                }
                return next;
              });
            }}
          >
            קבע תאריך לכל הקטגוריות
          </button>
        </div>
      </div>

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
              {/* Inputs */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap:'wrap', marginInlineStart:'auto', justifyContent:'flex-end' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
                  <input
                    type="date"
                    min={todayStr}
                    max={weekAheadStr}
                    value={sc.date || ''}
                    onChange={(e) => setSchedule(prev => ({ ...prev, [g.id]: { ...prev[g.id], date: e.target.value } }))}
                  />
                  <label style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>תאריך</label>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
                  <input
                    type="time"
                    min={(sc.date === todayStr) ? currentTimeRounded() : '06:00'}
                    max="23:59"
                    value={sc.time || ''}
                    onChange={(e) => setSchedule(prev => ({ ...prev, [g.id]: { ...prev[g.id], time: e.target.value } }))}
                  />
                  <label style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>שעה</label>
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
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={items.length === 0 || placing}
          onClick={onPlace}
          title={
            placing ? 'מבצע הזמנה...'
            : (items.length === 0 ? 'העגלה ריקה' : '')
          }
        >
          {placing ? 'מגיש…' : 'בצע הזמנה'}
        </button>
      </div>
    </div>
  );
}