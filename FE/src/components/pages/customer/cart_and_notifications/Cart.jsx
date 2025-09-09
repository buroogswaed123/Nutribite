import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './cart.module.css';
import {
  getCartAPI,
  getCartSummaryAPI,
  updateCartItemAPI,
  removeCartItemAPI,
  clearCartAPI,
  getCalorieGoal,
  setCalorieGoal,
  getCurrentPlanGoalAPI,
} from '../../../../utils/functions';

function resolveImageUrl(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  s = s.replace(/\\/g, '/').replace(/^\/+/, '');
  if (/^uploads\//i.test(s)) return `http://localhost:3000/${s}`;
  return `http://localhost:3000/uploads/${s}`;
}

export default function Cart() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({ total_price: 0, total_items: 0, total_calories: 0 });
  const [goal, setGoal] = useState(getCalorieGoal());
  const [showExceed, setShowExceed] = useState(false);
  // plan items viewer removed

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [list, sum] = await Promise.all([
        getCartAPI(),
        getCartSummaryAPI(),
      ]);
      setItems(Array.isArray(list) ? list : []);
      setSummary(sum || { total_price: 0, total_items: 0, total_calories: 0 });
    } catch (e) {
      setError(e?.message || 'שגיאה בטעינת העגלה');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // Initialize goal from current plan if available
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const g = await getCurrentPlanGoalAPI();
        if (!cancelled && Number.isFinite(Number(g)) && Number(g) > 0) {
          setGoal(Number(g));
          setCalorieGoal(Number(g));
        }
      } catch (_) { /* ignore; keep local goal */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // plan viewer removed

  const onQtyChange = async (row, nextQty) => {
    const q = Math.max(0, Math.min(Number(nextQty) || 0, Number(row.stock || 0)));
    try {
      await updateCartItemAPI(row.id, q);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'שגיאה בעדכון כמות');
    }
  };

  const onRemove = async (row) => {
    try { await removeCartItemAPI(row.id); await refresh(); }
    catch (e) { setError(e?.response?.data?.message || e.message || 'שגיאה במחיקה'); }
  };

  const onClear = async () => {
    if (!window.confirm('לנקות את כל העגלה?')) return;
    try { await clearCartAPI(); await refresh(); }
    catch (e) { setError(e?.response?.data?.message || e.message || 'שגיאה בניקוי העגלה'); }
  };

  const exceedGoal = useMemo(() => Number(summary.total_calories || 0) > Number(goal || 0), [summary, goal]);

  // plan groups/viewer removed

  return (
    <div className={styles.page} dir="rtl">
      {/* Header bar resembling Plan page */}
      <div className={styles.planHeader}>
        <div className={styles.planHeaderRow}>
          <h2 className={styles.planTitle}>העגלה שלך</h2>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onClear} disabled={items.length === 0}>נקה עגלה</button>
          <button className={styles.btn} onClick={() => navigate('/plan')}>פתח תוכנית</button>
        </div>
        <div className={styles.planHeaderRow}>
          <label>יעד קלוריות יומי</label>
          <input
            type="number"
            min={1}
            value={goal}
            onChange={(e) => {
              const v = Math.max(1, Number(e.target.value) || 0);
              setGoal(v);
              setCalorieGoal(v);
            }}
            style={{ width: 120 }}
          />
          <div className={styles.planCalories} style={{ color: exceedGoal ? '#b91c1c' : undefined }}>
            <span className={styles.dot} /> סה"כ {Math.round(summary.total_calories)} ק"ק
          </div>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</div>}
      {loading && <div>טוען עגלה...</div>}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {items.map((it) => (
            <div key={it.id} className={styles.itemRow}>
              <img
                src={resolveImageUrl(it.picture)}
                alt={it.recipe_name}
                className={styles.itemThumb}
                onError={(e)=>{ e.currentTarget.style.display='none' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{it.recipe_name}</div>
                <div className={styles.smallDark}>{Number(it.calories || 0)} קלוריות למנה</div>
                <div className={styles.smallMuted}>מלאי: {it.stock ?? '—'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className={styles.btn} onClick={() => onQtyChange(it, Math.max(0, Number(it.quantity) - 1))}>-</button>
                <input
                  type="number"
                  value={it.quantity}
                  min={0}
                  max={Number(it.stock || 0)}
                  onChange={(e) => onQtyChange(it, e.target.value)}
                  style={{ width: 64, textAlign: 'center' }}
                />
                <button className={styles.btn} onClick={() => onQtyChange(it, Math.min(Number(it.stock || 0), Number(it.quantity) + 1))}>+</button>
              </div>
              <div style={{ width: 100, textAlign: 'end' }}>{(Number(it.price) * Number(it.quantity)).toFixed(2)} ₪</div>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => onRemove(it)}>הסר</button>
            </div>
          ))}
          {items.length === 0 && (
            <div className={styles.itemRow}>העגלה ריקה</div>
          )}
        </div>
      )}

      {/* plan items viewer removed */}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>פריטים: {summary.total_items}</div>
          <div>סה"כ שקל: {Number(summary.total_price || 0).toFixed(2)} ₪</div>
          <button
            className={styles.btnPrimary}
            onClick={() => {
              if (exceedGoal) {
                setShowExceed(true);
              } else {
                navigate('/order');
              }
            }}
            disabled={items.length === 0}
          >
            הזמין עכשיו
          </button>
        </div>
      </div>

      {/* Exceed modal */}
      {showExceed && (
        <div onClick={() => setShowExceed(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ background:'#fff', borderRadius:8, padding:16, width: '95%', maxWidth: 520 }}>
            <h3 style={{ marginTop: 0 }}>אזהרה: חריגת קלוריות</h3>
            <p>סך הקלוריות בעגלה ({Math.round(summary.total_calories)} ק"ק) גבוה מיעד הקלוריות היומי ({goal} ק"ק). להמשיך?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className={styles.btn} onClick={() => setShowExceed(false)}>בטל</button>
              <button className={styles.btnPrimary} onClick={() => { setShowExceed(false); navigate('/order'); }}>המשך</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}