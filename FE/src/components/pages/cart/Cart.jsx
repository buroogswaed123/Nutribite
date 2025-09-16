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
} from '../../../utils/functions';

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
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null); // disable row controls during async
  const [summary, setSummary] = useState({ total_price: 0, total_items: 0, total_calories: 0 });
  const [goal, setGoal] = useState(getCalorieGoal());
  const [showExceed, setShowExceed] = useState(false);
  // plan items viewer removed

  const refresh = async (silent = false) => {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
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
    const requested = Math.max(1, Math.min(Number(nextQty) || 1, Number(row.stock || 0)));
    try {
      setBusyId(row.id);
      const res = await updateCartItemAPI(row.id, requested);
      const serverQty = Number(res?.quantity ?? requested);
      if (serverQty < requested) {
        setNotice(`הכמות עודכנה למקסימום במלאי (${serverQty}) עבור "${row.recipe_name}"`);
        // auto-clear after a short delay
        setTimeout(() => setNotice(''), 3000);
      }
      await refresh(true);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'שגיאה בעדכון כמות');
    }
    finally {
      setBusyId(null);
    }
  };

  const onRemove = async (row) => {
    try { 
      setBusyId(row.id);
      await removeCartItemAPI(row.id); await refresh(true); 
    }
    catch (e) { setError(e?.response?.data?.message || e.message || 'שגיאה במחיקה'); }
    finally { setBusyId(null); }
  };

  const onClear = async () => {
    if (!window.confirm('לנקות את כל העגלה?')) return;
    try { 
      setBusyId('clear');
      await clearCartAPI(); await refresh(); 
    }
    catch (e) { setError(e?.response?.data?.message || e.message || 'שגיאה בניקוי העגלה'); }
    finally { setBusyId(null); }
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
      {notice && (
        <div style={{ position:'fixed', top: 16, right: 16, zIndex: 2000, color: '#065f46', background:'#ecfdf5', border:'1px solid #a7f3d0', padding:'8px 12px', borderRadius:6 }}>
          {notice}
        </div>
      )}
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
                <div className={styles.smallMuted}>
                  מחיר ליחידה (כולל מע"מ): {(Number(it.unit_price_gross ?? it.price) || 0).toFixed(2)} ₪
                  {typeof it.tax_amount !== 'undefined' && (
                    <> • מע"מ ליחידה: {(Number(it.tax_amount) || 0).toFixed(2)} ₪</>
                  )}
                </div>
                {/* Stock hidden from customers */}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className={styles.btn} disabled={busyId===it.id || Number(it.quantity) <= 1} onClick={() => onQtyChange(it, Math.max(1, Number(it.quantity) - 1))}>-</button>
                <input
                  type="number"
                  value={it.quantity}
                  min={1}
                  max={Number(it.stock || 0)}
                  onChange={(e) => onQtyChange(it, e.target.value)}
                  style={{ width: 64, textAlign: 'center' }}
                />
                <button className={styles.btn} disabled={busyId===it.id} onClick={() => onQtyChange(it, Math.min(Number(it.stock || 0), Number(it.quantity) + 1))}>+</button>
              </div>
              <div style={{ width: 120, textAlign: 'end' }}>
                {(Number(it.unit_price_gross ?? it.price) * Number(it.quantity)).toFixed(2)} ₪
              </div>
              <button className={`${styles.btn} ${styles.btnDanger}`} disabled={busyId===it.id} onClick={() => onRemove(it)}>הסר</button>
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