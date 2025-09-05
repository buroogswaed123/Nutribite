import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchRecipes, getCurrentCustomerId, listPlansAPI, getPlanAPI, createPlanAPI, addPlanProductAPI, updatePlanProductAPI, deletePlanProductAPI, fetchCustomerAllergiesAPI } from '../../../../utils/functions';
import { buildAllergenSetFromNames, itemHasAllergen } from '../../../../utils/allergens';
import styles from './plan.module.css';
import { useEligibleMenu } from '../../../../hooks/useMenu';

// ---------- Constants and Utilities ----------

const HEBREW_CATEGORY_ORDER = new Map([
  ['ארוחת בוקר', 1],
  ['משקה', 2],
  ['משקאות', 2],
  ['ארוחת צהריים', 3],
  ['חטיף', 4],
  ['חטיפים', 4],
  ['ארוחת ערב', 5],
  ['קינוח', 6],
  ['קינוחים', 6],
]);

function orderIndexForCategory(name) {
  const he = String(name || '').trim();
  return HEBREW_CATEGORY_ORDER.get(he) ?? 999;
}

// Resolve images like Menu.jsx (recipes often carry picture/imageUrl)
function resolveImageUrl(raw) {
  if (!raw) return '';
  const s = String(raw);
  if (/^https?:\/\//i.test(s)) return s;
  const cleaned = s.replace(/\\/g, '/').replace(/^\/+/, '');
  if (/^uploads\//i.test(cleaned)) return `http://localhost:3000/${cleaned}`;
  return `http://localhost:3000/uploads/${cleaned}`;
}

// API calls are centralized in utils/functions.js and hooks/useMenu.js

// ---------- Pure helpers (data shaping) ----------

function buildCategoryData(plan, eligible, allergies) {
  if (!plan || !Array.isArray(eligible) || eligible.length === 0) {
    return { perCat: null, cats: [] };
  }

  const allergenSet = buildAllergenSetFromNames(allergies);

  // Safety filters: diet type and allergens
  const filtered = eligible.filter(it => {
    const dietOk = !plan.diet_type_id || Number(it.diet_type_id) === Number(plan.diet_type_id);
    if (!dietOk) return false;
    if (itemHasAllergen(it, allergenSet)) return false;
    return true;
  });

  // Group by category
  const byCat = new Map();
  for (const it of filtered) {
    const key = it.category_id || 'unknown';
    if (!byCat.has(key)) {
      byCat.set(key, { items: [], category_name: it.category_name || `קטגוריה #${key}` });
    }
    byCat.get(key).items.push(it);
  }

  // Targets per category
  const entries = Array.from(byCat.entries());
  const catCount = Math.max(entries.length, 1);
  const target = {
    calories: Number(plan.calories_per_day || 0),
    protein_g: Number(plan.protein_g || 0),
    carbs_g: Number(plan.carbs_g || 0),
    fats_g: Number(plan.fats_g || 0),
  };
  const perCat = {
    calories: target.calories / catCount,
    protein_g: target.protein_g / catCount,
    carbs_g: target.carbs_g / catCount,
    fats_g: target.fats_g / catCount,
  };

  // Sort each category by macro distance to perCat
  const cats = entries.map(([catId, obj]) => {
    const sorted = obj.items.slice().sort((a, b) => {
      const dist = (x) => (
        Math.abs((x.calories || 0) - perCat.calories) * 1.0 +
        Math.abs((x.protein_g || 0) - perCat.protein_g) * 4.0 +
        Math.abs((x.carbs_g || 0) - perCat.carbs_g) * 2.0 +
        Math.abs((x.fats_g || 0) - perCat.fats_g) * 9.0
      );
      return dist(a) - dist(b);
    });
    return { catId, category_name: obj.category_name, items: sorted };
  }).sort((a, b) => {
    const ai = orderIndexForCategory(a.category_name);
    const bi = orderIndexForCategory(b.category_name);
    if (ai !== bi) return ai - bi;
    return String(a.category_name).localeCompare(String(b.category_name));
  });

  return { perCat, cats };
}

function computeSwapCandidates(swapFor, recipes) {
  if (!swapFor || !Array.isArray(recipes)) return [];
  const calPerServing = Number(swapFor.calories || 0);
  if (!calPerServing || calPerServing <= 0) return [];
  const min = Math.floor(calPerServing * 0.9);
  const max = Math.ceil(calPerServing * 1.1);
  const arr = recipes.filter(r => {
    const c = Number(r.calories || r.cal || 0);
    return c >= min && c <= max;
  });
  return arr.sort((a, b) => {
    const da = Math.abs((a.calories || 0) - calPerServing);
    const db = Math.abs((b.calories || 0) - calPerServing);
    return da - db;
  }).slice(0, 30);
}

function calcTotalCalories(items) {
  if (!items) return 0;
  return items.reduce((sum, it) => sum + (Number(it.calories || 0) * Number(it.servings || 1)), 0);
}

function computeSuggestions(categoryData, catIdx, plan) {
  const picks = [];
  for (const c of (categoryData.cats || [])) {
    const arr = c.items || [];
    if (!arr.length) continue;
    const idx = Math.max(0, Math.min((catIdx[c.catId] ?? 0), arr.length - 1));
    picks.push({ ...arr[idx], _catId: c.catId, _category_name: c.category_name, _idx: idx, _len: arr.length });
  }

  const total = picks.reduce((acc, it) => {
    acc.calories += Number(it.calories || 0);
    acc.protein_g += Number(it.protein_g || 0);
    acc.carbs_g += Number(it.carbs_g || 0);
    acc.fats_g += Number(it.fats_g || 0);
    return acc;
  }, { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 });

  let extra = null;
  const targetCal = Number(plan?.calories_per_day || 0);
  if (targetCal && total.calories < targetCal) {
    const pickedIds = new Set(picks.map(p => Number(p.product_id)));
    const pool = [];
    for (const c of (categoryData.cats || [])) {
      for (let i = 0; i < (c.items || []).length; i++) {
        const it = c.items[i];
        const pid = Number(it.product_id);
        if (pickedIds.has(pid)) continue;
        pool.push({ ...it, _catId: c.catId, _category_name: c.category_name, _idx: i, _len: c.items.length });
      }
    }
    let best = null;
    let bestDiff = Infinity;
    for (const cand of pool) {
      const t = total.calories + Number(cand.calories || 0);
      const diff = Math.abs(targetCal - t);
      if (diff < bestDiff) { bestDiff = diff; best = cand; }
    }
    if (best) extra = { ...best, _extra: true };
  }

  return { picks, extra, total, perCat: categoryData.perCat, catCount: (categoryData.cats || []).length };
}

// ---------- Presentational helpers (small, focused) ----------

function CategoryCard({ cat, idx, onPrev, onNext }) {
  const arr = cat.items || [];
  const it = arr[idx];
  return (
    <div className={styles.catCard}>
      <div className={styles.catCardHeader}>
        <div className={styles.catTitle}>{cat.category_name}</div>
        <div className={styles.catHeaderBtns}>
          <button onClick={onPrev} title="החלף לפריט קודם" className={styles.btnSmall}>◀</button>
          <button onClick={onNext} title="החלף לפריט הבא" className={styles.btnSmall}> ▶</button>
        </div>
      </div>

      {!it && <div className={styles.emptyCategory}>אין הצעות בקטגוריה זו</div>}

      {it && (
        <div className={styles.catItem}>
          <img
            src={resolveImageUrl(it.picture || it.imageUrl)}
            alt={it.name}
            className={styles.cardImage}
            onError={(e)=>{ e.currentTarget.style.display='none' }}
          />
          <div className={styles.catTitle}>{it.name}</div>
          <div className={styles.smallMuted}>#{idx+1} מתוך {arr.length}</div>
          <div className={styles.smallDark}>
            {it.calories} קלוריות • חלבון {it.protein_g ?? '—'}g • פחמימות {it.carbs_g ?? '—'}g • שומן {it.fats_g ?? '—'}g
          </div>
        </div>
      )}
    </div>
  );
}

function ExtraSuggestionCard({ it }) {
  return (
    <div className={styles.catCard}>
      <div className={styles.catCardHeader}>
        <div className={styles.catTitle}>תוספת</div>
      </div>
      <div className={styles.catItem}>
        <img
          src={resolveImageUrl(it.picture || it.imageUrl)}
          alt={it.name}
          className={styles.cardImage}
          onError={(e)=>{ e.currentTarget.style.display='none' }}
        />
        <div className={styles.catTitle}>{it.name}</div>
        <div className={styles.smallDark}>
          {it.calories} קלוריות • חלבון {it.protein_g ?? '—'}g • פחמימות {it.carbs_g ?? '—'}g • שומן {it.fats_g ?? '—'}g
        </div>
      </div>
    </div>
  );
}

function CurrentItemCard({ it, onOpen, onRemove, onUpdateServings }) {
  const perServing = Number(it.calories || 0);
  const servings = Number(it.servings || 1);
  const totalCal = Math.round(perServing * servings);

  return (
    <div onClick={() => onOpen(it)} className={styles.itemCard}>
      <div className={styles.itemCardHeader}>
        <div className={styles.itemTitle}>{it.product_name || it.name || `מוצר #${it.product_id}`}</div>
        <div className={styles.itemMeta}>{perServing} קלוריות לכל מנה • {servings} מנות • סה״כ {totalCal} ק״ק</div>
      </div>
      <div className={styles.itemActions}>
        <button
          onClick={(e) => { e.stopPropagation(); onUpdateServings(it, Math.max(1, servings - 1)); }}
          title="- מנה"
          className={styles.btn}
        >-</button>
        <button
          onClick={(e) => { e.stopPropagation(); onUpdateServings(it, servings + 1); }}
          title="+ מנה"
          className={styles.btn}
        >+</button>
        <button onClick={(e) => { e.stopPropagation(); onOpen(it); }} title="פרטים" className={styles.btn}>פרטים</button>
        <button onClick={(e) => { e.stopPropagation(); onRemove(it); }} title="הסר" className={`${styles.btn} ${styles.btnDanger}`}>הסר</button>
      </div>
    </div>
  );
}

function Modal({ open, onClose, className = '', children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} className={styles.overlay}>
      <div onClick={(e) => e.stopPropagation()} className={`${styles.modal} ${className}`}>
        {children}
      </div>
    </div>
  );
}

function ItemInfoModal({ open, item, onClose }) {
  if (!open || !item) return null;
  const pic = item?.picture || item?.imageUrl;
  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.modalContent}>
        {pic ? (
          <img
            src={resolveImageUrl(pic)}
            alt={item.product_name || item.name || ''}
            className={styles.modalImage}
            onError={(e)=>{ e.currentTarget.style.display='none'; }}
          />
        ) : (
          <div className={styles.placeholderBox}>
            <span className={styles.placeholderText}>תמונה</span>
          </div>
        )}

        <div className={styles.modalDetails}>
          <h2 className={styles.noMarginTop}>{item.product_name || item.name || `מוצר #${item.product_id}`}</h2>
          <div className={styles.modalMetaGroup}>
            <span className={styles.inlineItem}>{item.calories} קלוריות למנה</span>
          </div>
          <div className={styles.modalMetaGroup}>
            <span className={styles.inlineItem}>חלבון: {item.protein_g ?? '—'}g</span>
            <span className={styles.inlineItem}>פחמימות: {item.carbs_g ?? '—'}g</span>
            <span>שומנים: {item.fats_g ?? '—'}g</span>
          </div>
          <div className={styles.modalActions}>
            <button onClick={onClose} className={styles.btn}>סגור</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SaveSuccessModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div onClick={onClose} className={`${styles.overlay} ${styles.overlayHigh}`}>
      <div onClick={(e) => e.stopPropagation()} className={`${styles.modal} ${styles.modalNarrow}`}>
        <h3 className={styles.noMarginTop}>התוכנית נשמרה בהצלחה</h3>
        <div className={`${styles.modalMetaGroup} ${styles.textDark}`}>השינויים נשמרו לתוכנית הנוכחית.</div>
        <div className={`${styles.modalActions} ${styles.justifyEnd}`}>
          <button onClick={onClose} className={styles.btn}>סגור</button>
        </div>
      </div>
    </div>
  );
}

function SwapModal({ open, onClose, candidates, recipesLoading, onConfirm }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} className={styles.modalWide}>
      <h3 className={styles.noMarginTop}>בחרו תחליף דומה</h3>
      <div className={`${styles.modalMetaGroup} ${styles.textMuted}`}>
        מציג הצעות לפי קלוריות ±10% מהפריט הנוכחי. ניתן לעדכן בהמשך סינונים מתקדמים (קטגוריה/דיאטה) כאשר אותם שדות יהיו זמינים למוצרים.
      </div>

      {recipesLoading && <div>טוען הצעות...</div>}

      {!recipesLoading && (
        <div className={styles.swapGrid}>
          {candidates.map(c => (
            <div key={c.recipe_id || c.id} className={styles.swapCard} onClick={() => onConfirm(c)}>
              <img
                src={resolveImageUrl(c.picture || c.imageUrl)}
                alt={c.name}
                className={styles.swapImg}
                onError={(e)=>{ e.currentTarget.style.display='none' }}
              />
              <div className={styles.swapCardBody}>
                <div className={styles.swapCardTitle}>{c.name}</div>
                <div className={styles.swapCardCal}>{c.calories} קלוריות</div>
              </div>
            </div>
          ))}
          {candidates.length === 0 && (
            <div className={styles.noEligible}>לא נמצאו תחליפים מתאימים לפי הקלוריות</div>
          )}
        </div>
      )}

      <div className={styles.swapActions}>
        <button onClick={onClose} className={styles.btn}>ביטול</button>
      </div>
    </Modal>
  );
}

// ---------- Main Component ----------

export default function Plan() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [plan, setPlan] = useState(null);
  const [allergies, setAllergies] = useState([]);
  const [swapFor, setSwapFor] = useState(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [hasShownSaveSuccess, setHasShownSaveSuccess] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasAutoCollapsedSuggestions, setHasAutoCollapsedSuggestions] = useState(false);

  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [catIdx, setCatIdx] = useState({});
  const autoOptimizedRef = useRef(false);

  // Initial load
  const didRunRef = useRef(false);
  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    (async () => {
      try {
        setLoading(true);
        setErr('');
        const cid = await getCurrentCustomerId();
        setCustomerId(cid);

        const plans = await listPlansAPI(cid);
        let planId = plans?.[0]?.plan_id;
        if (!planId) {
          const { plan_id } = await createPlanAPI({ customer_id: cid });
          planId = plan_id;
        }
        const full = await getPlanAPI(planId);
        setPlan(full);

        try {
          const data = await fetchCustomerAllergiesAPI(cid);
          setAllergies(Array.isArray(data) ? data : []);
        } catch {
          setAllergies([]);
        }

        setRecipesLoading(true);
        setRecipes(await fetchRecipes({}));

        // eligible menu is handled by useEligibleMenu hook
      } catch (e) {
        const msg = e?.message || '';
        if (/401|403/.test(msg) || /unauthor/i.test(msg)) {
          setErr('יש להתחבר כדי לראות תוכנית');
        } else {
          setErr(msg || 'שגיאה בטעינת התוכנית');
        }
      } finally {
        setRecipesLoading(false);
        setLoading(false);
      }
    })();
  }, []);

  const totalCalories = useMemo(() => calcTotalCalories(plan?.items), [plan]);

  // Use centralized hook for eligible menu
  const { items: eligible, loading: eligibleLoading } = useEligibleMenu({ customerId, dietType: plan?.diet_type_id });
  const categoryData = useMemo(() => buildCategoryData(plan, eligible, allergies), [plan, eligible, allergies]);

  // Reset cat selection when categories change
  useEffect(() => {
    const next = {};
    for (const c of (categoryData.cats || [])) next[c.catId] = 0;
    setCatIdx(next);
    autoOptimizedRef.current = false;
  }, [categoryData.cats?.map(c => c.catId).join(',')]);

  // Suggestions snapshot from current selections
  const suggestions = useMemo(
    () => computeSuggestions(categoryData, catIdx, plan),
    [categoryData, catIdx, plan]
  );

  const cycleCategory = (catId, dir = 1) => {
    const cat = (categoryData.cats || []).find(c => c.catId === catId);
    if (!cat || !cat.items?.length) return;
    setCatIdx(prev => {
      const curr = prev[catId] ?? 0;
      const next = (curr + dir + cat.items.length) % cat.items.length;
      return { ...prev, [catId]: next };
    });
  };

  const cycleAllCategories = (dir = 1) => {
    setCatIdx(prev => {
      const nextIdx = { ...prev };
      for (const c of (categoryData.cats || [])) {
        const arr = c.items || [];
        if (!arr.length) continue;
        const curr = prev[c.catId] ?? 0;
        nextIdx[c.catId] = (curr + dir + arr.length) % arr.length;
      }
      return nextIdx;
    });
  };

  // One-time auto-optimize by calories
  useEffect(() => {
    const target = Number(plan?.calories_per_day || 0);
    if (!target || (categoryData.cats || []).length === 0) return;
    if (eligibleLoading || autoOptimizedRef.current) return;

    const localIdx = { ...catIdx };
    for (const c of (categoryData.cats || [])) {
      if (typeof localIdx[c.catId] !== 'number') localIdx[c.catId] = 0;
    }

    const calcTotal = (indices) => {
      let t = 0;
      for (const c of (categoryData.cats || [])) {
        const arr = c.items || [];
        if (!arr.length) continue;
        const i = Math.max(0, Math.min(indices[c.catId] ?? 0, arr.length - 1));
        t += Number(arr[i].calories || 0);
      }
      return t;
    };

    let currentTotal = calcTotal(localIdx);
    let iterations = 0;
    let improved = true;
    while (iterations < 60 && Math.abs(currentTotal - target) > 50 && improved) {
      improved = false;
      let bestCat = null;
      let bestIdx = null;
      let bestTotal = currentTotal;
      const currDiff = Math.abs(currentTotal - target);

      for (const c of (categoryData.cats || [])) {
        const arr = c.items || [];
        if (!arr.length) continue;
        const curr = localIdx[c.catId] ?? 0;
        const tryMove = (nextIdx) => {
          const trial = { ...localIdx, [c.catId]: nextIdx };
          const t = calcTotal(trial);
          if (Math.abs(t - target) < currDiff && Math.abs(t - target) < Math.abs(bestTotal - target)) {
            bestCat = c.catId; bestIdx = nextIdx; bestTotal = t;
          }
        };
        if (curr + 1 < arr.length) tryMove(curr + 1);
        if (curr - 1 >= 0) tryMove(curr - 1);
      }

      if (bestCat != null) {
        localIdx[bestCat] = bestIdx;
        currentTotal = bestTotal;
        improved = true;
      }
      iterations += 1;
    }

    setCatIdx(localIdx);
    autoOptimizedRef.current = true;
  }, [eligibleLoading, categoryData.cats, plan?.calories_per_day]); // eslint-disable-line react-hooks/exhaustive-deps

  const swapCandidates = useMemo(() => computeSwapCandidates(swapFor, recipes), [swapFor, recipes]);

  const refreshPlan = async () => {
    if (!plan?.plan_id) return;
    const refreshed = await getPlanAPI(plan.plan_id);
    setPlan(refreshed);
  };

  const onRemoveItem = async (it) => {
    if (!plan) return;
    try {
      await deletePlanProductAPI(plan.plan_id, it.plan_product_id);
      await refreshPlan();
    } catch (e) {
      setErr(e.message || 'שגיאה במחיקת פריט');
    }
  };

  const onUpdateServings = async (it, newServings) => {
    try {
      const v = Number(newServings);
      if (!Number.isFinite(v) || v <= 0) return;
      await updatePlanProductAPI(plan.plan_id, it.plan_product_id, v);
      await refreshPlan();
    } catch (e) {
      setErr(e.message || 'שגיאה בעדכון מנות');
    }
  };

  const onConfirmSwap = async (candidate) => {
    if (!swapFor || !plan) return;
    try {
      const newProductId = candidate.recipe_id || candidate.id || candidate.product_id;
      if (!Number.isFinite(Number(newProductId))) {
        throw new Error('לא ניתן להחליף: product_id חסר או לא תקין');
      }
      await deletePlanProductAPI(plan.plan_id, swapFor.plan_product_id);
      await addPlanProductAPI(plan.plan_id, Number(newProductId), Number(swapFor.servings || 1));
      await refreshPlan();
      setSwapOpen(false);
      setSwapFor(null);
    } catch (e) {
      setErr(e.message || 'שגיאה בהחלפת הפריט');
    }
  };

  const totalPlanCalories = totalCalories;

  // ---------- Render ----------

  if (loading) return <div className={styles.pad16}>טוען תוכנית...</div>;
  if (err) return <div className={`${styles.pad16} ${styles.errorText}`}>{err}</div>;
  if (!plan) return <div className={styles.pad16}>לא נמצאה תוכנית</div>;

  return (
    <div className={styles.page} dir="rtl">
      {/* Plan header (list-style) */}
      <div className={styles.planHeader}>
        <div className={styles.planHeaderRow}>
          <div>
            <h1 className={styles.planTitle}>התוכנית שלכם</h1>
            <div className={styles.planCalories}>
            <span className={styles.dot} /> {Math.round(suggestions.total.calories)} / {Number(plan?.calories_per_day || 0) || '—'} קלוריות
          </div>
          </div>
          <button
            className={`${styles.refreshBtn} ${styles.headerRefresh}`}
            title="רענון כללי לכל הקטגוריות"
            onClick={() => cycleAllCategories(+1)}
          >↻</button>
        </div>
      </div>

      {/* Meal sections in two columns by group (always show all categories) */}
      <div className={styles.columns}>
        {(() => {
          const findCatByAliases = (aliases) => (categoryData.cats || []).find(c => aliases.includes(c.category_name));
          const leftDefs = [
            { label: 'ארוחת בוקר', aliases: ['ארוחת בוקר'] },
            { label: 'משקאות', aliases: ['משקה','משקאות'] },
            { label: 'ארוחת צהריים', aliases: ['ארוחת צהריים'] },
          ];
          const rightDefs = [
            { label: 'חטיפים', aliases: ['חטיף','חטיפים'] },
            { label: 'ארוחת ערב', aliases: ['ארוחת ערב'] },
            { label: 'קינוחים', aliases: ['קינוח','קינוחים'] },
          ];

          const renderSection = (def) => {
            const cat = findCatByAliases(def.aliases) || null;
            const arr = cat?.items || [];
            const idx = cat ? Math.max(0, Math.min((catIdx[cat.catId] ?? 0), Math.max(arr.length - 1, 0))) : 0;
            const it = arr[idx];
            const sectionCalories = it ? Number(it.calories || 0) : 0;
            return (
              <section key={def.label} className={styles.mealSection}>
                <div className={styles.mealHeader}>
                  <div>
                    <h2 className={styles.mealTitle}>{def.label}</h2>
                    <div className={styles.mealCalories}><span className={styles.dot} /> {sectionCalories} קלוריות</div>
                  </div>
                  <button
                    className={styles.refreshBtn}
                    title="רענון הצעה"
                    onClick={() => { if (cat && arr.length) cycleCategory(cat.catId, +1); }}
                    disabled={!cat || !arr.length}
                  >↻</button>
                </div>
                <ul className={styles.mealList}>
                  {it && (
                    <li className={styles.mealItem}>
                      <img
                        src={resolveImageUrl(it.picture || it.imageUrl)}
                        alt={it.name}
                        className={styles.mealThumb}
                        onError={(e)=>{ e.currentTarget.style.display='none' }}
                        onClick={() => { setSelectedItem(it); setModalOpen(true); }}
                      />
                      <div className={styles.mealBody} onClick={() => { setSelectedItem(it); setModalOpen(true); }}>
                        <div className={styles.mealNameLink}>{it.name}</div>
                        <div className={styles.mealServing}>1 מנה</div>
                      </div>
                    </li>
                  )}
                  {!it && (<li className={styles.mealItemEmpty}>אין פריטים זמינים בקטגוריה זו</li>)}
                </ul>
              </section>
            );
          };

          return (
            <>
              <div className={styles.col}>
                {leftDefs.map(renderSection)}
              </div>
              <div className={styles.col}>
                {rightDefs.map(renderSection)}
              </div>
            </>
          );
        })()}
      </div>

      {/* Footer actions */}
      <div className={styles.footerActions}>
        <button
          onClick={async () => {
            try {
              const itemsToSave = [...(suggestions.picks || [])];
              if (suggestions.extra) itemsToSave.push(suggestions.extra);
              const existing = new Set((plan.items || []).map(it => Number(it.product_id)));
              for (const it of itemsToSave) {
                const pid = Number(it.product_id);
                if (!Number.isFinite(pid) || existing.has(pid)) continue;
                await addPlanProductAPI(plan.plan_id, pid, 1);
              }
              await refreshPlan();
              if (!hasShownSaveSuccess) {
                setSaveSuccessOpen(true);
                setHasShownSaveSuccess(true);
              }
            } catch (e) {
              setErr(e.message || 'שגיאה בשמירת התוכנית');
            }
          }}
          className={styles.btnPrimary}
        >
          שמור תוכנית
        </button>
      </div>

      {/* Modals */}
      <ItemInfoModal open={modalOpen} item={selectedItem} onClose={() => { setModalOpen(false); setSelectedItem(null); }} />
      <SaveSuccessModal open={saveSuccessOpen} onClose={() => setSaveSuccessOpen(false)} />
      <SwapModal
        open={swapOpen && !!swapFor}
        onClose={() => { setSwapOpen(false); setSwapFor(null); }}
        candidates={swapCandidates}
        recipesLoading={recipesLoading}
        onConfirm={onConfirmSwap}
      />
    </div>
  );
}