import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchRecipes, getSessionUser, getCurrentCustomerId } from '../../../../utils/functions';

// Resolve images like Menu.jsx (recipes often carry picture/imageUrl)
function resolveImageUrl(raw) {
  if (!raw) return '';
  const s = String(raw);
  if (/^https?:\/\//i.test(s)) return s;
  const cleaned = s.replace(/\\/g, '/').replace(/^\/+/, '');
  if (/^uploads\//i.test(cleaned)) return `http://localhost:3000/${cleaned}`;
  return `http://localhost:3000/uploads/${cleaned}`;
}

const api = {
  async listPlans(customerId) {
    const qs = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : '';
    const res = await fetch(`http://localhost:3000/api/plan${qs}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to list plans');
    return await res.json();
  },
  async getPlan(planId) {
    const res = await fetch(`http://localhost:3000/api/plan/${planId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get plan');
    return await res.json();
  },
  async createPlan(payload) {
    const res = await fetch(`http://localhost:3000/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create plan');
    return await res.json();
  },
  async addPlanProduct(planId, product_id, servings = 1) {
    const res = await fetch(`http://localhost:3000/api/plan/${planId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ product_id, servings }),
    });
    if (!res.ok) throw new Error('Failed to add product');
    return await res.json();
  },
  async updatePlanProduct(planId, linkId, servings) {
    const res = await fetch(`http://localhost:3000/api/plan/${planId}/products/${linkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ servings }),
    });
    if (!res.ok) throw new Error('Failed to update product');
    return await res.json();
  },
  async deletePlanProduct(planId, linkId) {
    const res = await fetch(`http://localhost:3000/api/plan/${planId}/products/${linkId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to delete product');
    return await res.json();
  },
};

export default function Plan() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [plan, setPlan] = useState(null); // includes items array
  const [allergies, setAllergies] = useState([]); // [{ comp_id, name }]
  const [swapFor, setSwapFor] = useState(null); // item to be swapped
  const [swapOpen, setSwapOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  // One-time save success modal
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [hasShownSaveSuccess, setHasShownSaveSuccess] = useState(false);
  // Suggestions visibility control (collapse after first save)
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasAutoCollapsedSuggestions, setHasAutoCollapsedSuggestions] = useState(false);

  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [eligible, setEligible] = useState([]); // allergy-safe menu items
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [catIdx, setCatIdx] = useState({}); // category_id -> selected index within that category
  const autoOptimizedRef = useRef(false);

  // Initial load: user session -> plan load/create
  const didRunRef = useRef(false);
  useEffect(() => {
    if (didRunRef.current) return; // guard StrictMode double-invoke
    didRunRef.current = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        // Resolve correct customer_id (this will also rely on session; if unavailable, it will throw)
        const customerId = await getCurrentCustomerId();

        // Load plans for this customer; if none, create an empty plan
        const plans = await api.listPlans(customerId);
        let planId = null;
        if (Array.isArray(plans) && plans.length > 0) {
          planId = plans[0].plan_id; // latest first as per backend ORDER BY
        } else {
          const { plan_id } = await api.createPlan({ customer_id: customerId });
          planId = plan_id;
        }
        const full = await api.getPlan(planId);
        setPlan(full);

        // Fetch customer allergies to hard-filter on FE (safety)
        try {
          const resA = await fetch(`http://localhost:3000/api/customers/${customerId}/allergies`, { credentials: 'include' });
          if (resA.ok) {
            const arr = await resA.json();
            setAllergies(Array.isArray(arr) ? arr : []);
          } else {
            setAllergies([]);
          }
        } catch { setAllergies([]); }

        // Preload recipes (used for swap suggestions). We keep it simple here.
        setRecipesLoading(true);
        const items = await fetchRecipes({});
        setRecipes(items);

        // Fetch allergy-safe eligible products for this customer (and plan diet type if present)
        try {
          setEligibleLoading(true);
          const q = new URLSearchParams();
          q.set('customer_id', String(customerId));
          if (full?.diet_type_id) q.set('dietType', String(full.diet_type_id));
          const res = await fetch(`http://localhost:3000/api/menu/eligible?${q.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setEligible(Array.isArray(data?.items) ? data.items : []);
          } else {
            setEligible([]);
          }
        } finally {
          setEligibleLoading(false);
        }
      } catch (e) {
        // If unauthorized, prompt login
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

  const totalCalories = useMemo(() => {
    if (!plan?.items) return 0;
    return plan.items.reduce((sum, it) => sum + (Number(it.calories || 0) * Number(it.servings || 1)), 0);
  }, [plan]);

  const openItemModal = (item) => {
    setSelectedItem(item);
    setModalOpen(true);
  };
  const closeItemModal = () => {
    setModalOpen(false);
    setSelectedItem(null);
  };

  const openSwap = (item) => {
    setSwapFor(item);
    setSwapOpen(true);
  };
  const closeSwap = () => {
    setSwapOpen(false);
    setSwapFor(null);
  };

  // Suggest recipes similar by calories ±10%.
  const swapCandidates = useMemo(() => {
    if (!swapFor || !Array.isArray(recipes)) return [];
    const calPerServing = Number(swapFor.calories || 0);
    if (!calPerServing || calPerServing <= 0) return [];
    const min = Math.floor(calPerServing * 0.9);
    const max = Math.ceil(calPerServing * 1.1);
    const arr = recipes.filter(r => {
      const c = Number(r.calories || r.cal || 0);
      return c >= min && c <= max;
    });
    // sort by closest calories
    return arr.sort((a, b) => {
      const da = Math.abs((a.calories || 0) - calPerServing);
      const db = Math.abs((b.calories || 0) - calPerServing);
      return da - db;
    }).slice(0, 30);
  }, [swapFor, recipes]);

  const refreshPlan = async () => {
    if (!plan?.plan_id) return;
    const refreshed = await api.getPlan(plan.plan_id);
    setPlan(refreshed);
  };

  const onAddToCart = (it) => {
    // Stub for now
    alert(`TODO: הוספה לעגלה: ${it.product_name || it.name || it.product_id}`);
  };

  const onOrderAll = () => {
    // Stub for now
    alert('TODO: הזמנה של כל הפריטים בתוכנית');
  };

  // Build per-category candidate lists (sorted by closeness to per-category macro targets)
  const categoryData = useMemo(() => {
    if (!plan || !Array.isArray(eligible) || eligible.length === 0) return { perCat: null, cats: [] };

    // Build allergen name set (lowercase, trimmed)
    const allergenSet = new Set(
      (allergies || []).map(a => String(a.name || a).toLowerCase().trim()).filter(Boolean)
    );

    // Helper: does item contain any allergen by known fields
    const itemHasAllergen = (it) => {
      if (!allergenSet.size) return false;
      const toWords = (v) => {
        if (!v) return [];
        if (Array.isArray(v)) return v.map(x => (typeof x === 'string' ? x : (x?.name || '')));
        return String(v).split(/[;,]/);
      };
      const fields = [];
      // Common shapes coming from DB
      fields.push(...toWords(it.components));
      fields.push(...toWords(it.ingredients));
      fields.push(...toWords(it.allergens));
      // Fallback to scanning description/name for explicit allergen tokens
      const nameDesc = [it.name, it.description].filter(Boolean).join(' ').toLowerCase();
      const norm = fields.map(s => String(s || '').toLowerCase().trim()).filter(Boolean);
      for (const al of allergenSet) {
        if (norm.some(s => s.includes(al))) return true;
        // As a last resort, look for explicit mention in name/description
        if (al && nameDesc.includes(al)) return true;
      }
      return false;
    };

    // Ensure diet type matches plan (safety in case BE filter changes) and filter allergens
    const filtered = eligible.filter(it => {
      const dietOk = !plan.diet_type_id || Number(it.diet_type_id) === Number(plan.diet_type_id);
      if (!dietOk) return false;
      if (itemHasAllergen(it)) return false;
      return true;
    });
    const byCat = new Map();
    for (const it of filtered) {
      const key = it.category_id || 'unknown';
      if (!byCat.has(key)) byCat.set(key, { items: [], category_name: it.category_name || `קטגוריה #${key}` });
      byCat.get(key).items.push(it);
    }
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
    // Sort each category by weighted macro distance to perCat
    // Category order mapping (English/Hebrew variants)
    const orderIndexForCategory = (name) => {
      const s = String(name || '').toLowerCase().trim();
      const he = String(name || '').trim();
      const map = new Map([
        ['breakfast', 1], ['ארוחת בוקר', 1],
        ['drink', 2], ['drinks', 2], ['משקה', 2], ['משקאות', 2],
        ['lunch', 3], ['ארוחת צהריים', 3],
        ['snack', 4], ['חטיף', 4], ['חטיפים', 4],
        ['dinner', 5], ['ארוחת ערב', 5],
        ['dessert', 6], ['קינוח', 6], ['קינוחים', 6],
      ]);
      if (map.has(s)) return map.get(s);
      if (map.has(he)) return map.get(he);
      return 999; // unknown goes to end
    };

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
    }).sort((a,b) => {
      const ai = orderIndexForCategory(a.category_name);
      const bi = orderIndexForCategory(b.category_name);
      if (ai !== bi) return ai - bi;
      return String(a.category_name).localeCompare(String(b.category_name));
    });
    return { perCat, cats };
  }, [plan, eligible, allergies]);

  // Initialize/reset selection index per category when categories change
  useEffect(() => {
    const next = {};
    for (const c of (categoryData.cats || [])) next[c.catId] = 0;
    setCatIdx(next);
    autoOptimizedRef.current = false; // allow re-optimization on new data
  }, [categoryData.cats?.map(c => c.catId).join(',')]);

  // Compute current picks and totals using selected indices
  const suggestions = useMemo(() => {
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
    // If goal not reached, propose an extra item (best next by bringing calories closer to goal)
    let extra = null;
    const targetCal = Number(plan?.calories_per_day || 0);
    if (targetCal && total.calories < targetCal) {
      // Build a pool of remaining candidates not already picked (by product_id)
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
      // Score by absolute difference to target after adding
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
  }, [categoryData, catIdx]);

  const cycleCategory = (catId, dir = 1) => {
    const cat = (categoryData.cats || []).find(c => c.catId === catId);
    if (!cat || !cat.items?.length) return;
    setCatIdx(prev => {
      const curr = prev[catId] ?? 0;
      const next = (curr + dir + cat.items.length) % cat.items.length;
      return { ...prev, [catId]: next };
    });
  };

  // Auto-optimize initial picks to get closer to target calories (greedy, single-run per data load)
  useEffect(() => {
    const target = Number(plan?.calories_per_day || 0);
    if (!target || (categoryData.cats || []).length === 0) return;
    if (eligibleLoading) return;
    if (autoOptimizedRef.current) return;

    // Work on a local copy of indices starting at current catIdx
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
        // Try moving forward if possible
        if (curr + 1 < arr.length) {
          const trial = { ...localIdx, [c.catId]: curr + 1 };
          const t = calcTotal(trial);
          if (Math.abs(t - target) < currDiff && Math.abs(t - target) < Math.abs(bestTotal - target)) {
            bestCat = c.catId;
            bestIdx = curr + 1;
            bestTotal = t;
          }
        }
        // Try moving backward if possible
        if (curr - 1 >= 0) {
          const trial = { ...localIdx, [c.catId]: curr - 1 };
          const t = calcTotal(trial);
          if (Math.abs(t - target) < currDiff && Math.abs(t - target) < Math.abs(bestTotal - target)) {
            bestCat = c.catId;
            bestIdx = curr - 1;
            bestTotal = t;
          }
        }
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
  }, [eligibleLoading, categoryData.cats, plan?.calories_per_day]);

  const addSuggestionToPlan = async (prod) => {
    if (!plan?.plan_id) return;
    try {
      const productId = prod.product_id;
      if (!Number.isFinite(Number(productId))) throw new Error('product_id חסר או לא תקין');
      await api.addPlanProduct(plan.plan_id, Number(productId), 1);
      await refreshPlan();
    } catch (e) {
      setErr(e.message || 'שגיאה בהוספת פריט מההצעות');
    }
  };

  const onChangeServings = async (it, newServings) => {
    try {
      const v = Number(newServings);
      if (!Number.isFinite(v) || v <= 0) return;
      await api.updatePlanProduct(plan.plan_id, it.plan_product_id, v);
      await refreshPlan();
    } catch (e) {
      setErr(e.message || 'שגיאה בעדכון מנות');
    }
  };

  const onRemoveItem = async (it) => {
    if (!plan) return;
    try {
      await api.deletePlanProduct(plan.plan_id, it.plan_product_id);
      await refreshPlan();
    } catch (e) {
      setErr(e.message || 'שגיאה במחיקת פריט');
    }
  };

  const onConfirmSwap = async (candidate) => {
    if (!swapFor || !plan) return;
    try {
      // Note: Assuming recipe_id can be used as product_id. Adjust if you have a mapping layer.
      const newProductId = candidate.recipe_id || candidate.id || candidate.product_id;
      if (!Number.isFinite(Number(newProductId))) {
        throw new Error('לא ניתן להחליף: product_id חסר או לא תקין');
      }
      // Remove old link, add new with same servings
      await api.deletePlanProduct(plan.plan_id, swapFor.plan_product_id);
      await api.addPlanProduct(plan.plan_id, Number(newProductId), Number(swapFor.servings || 1));
      await refreshPlan();
      closeSwap();
    } catch (e) {
      setErr(e.message || 'שגיאה בהחלפת הפריט');
    }
  };

  if (loading) {
    return <div style={{ padding: 16 }}>טוען תוכנית...</div>;
  }

  if (err) {
    return <div style={{ padding: 16, color: '#b91c1c' }}>{err}</div>;
  }

  if (!plan) {
    return <div style={{ padding: 16 }}>לא נמצאה תוכנית</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0 }}>תוכנית מותאמת</h1>
        <div style={{ color: '#374151' }}>
          סה״כ קלוריות בתוכנית: <strong>{totalCalories}</strong>
        </div>
      </div>

      <div style={{ marginTop: 12, marginBottom: 8, color: '#4b5563' }}>
        לקוח #{plan.customer_id} • יעד יומי: {plan.calories_per_day ?? '—'} ק״ק
      </div>

      {/* Suggestions section: collapsible */}
      <div style={{ marginTop: 12, marginBottom: 16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ color:'#374151', fontWeight:600 }}>הצעות לתכנון</div>
          <button
            onClick={() => setShowSuggestions(s => !s)}
            style={{ border:'1px solid #e5e7eb', padding:'6px 10px', borderRadius:8, background:'#fff', cursor:'pointer' }}
          >{showSuggestions ? 'הסתר' : 'הצג'} הצעות</button>
        </div>

        {showSuggestions && (
          <div style={{ marginTop: 8, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:10, padding:12 }}>
            {/* Compact summary: goal, count, current calories */}
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', color:'#374151' }}>
              <div>יעד: <strong>{plan.calories_per_day ?? '—'}</strong> ק"ק</div>
              <div>פריטים נבחרים: <strong>{(suggestions.picks || []).length}</strong></div>
              <div>קלוריות נוכחי: <strong>{Math.round(suggestions.total.calories)}</strong></div>
            </div>

            {/* Columns by category */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12, marginTop: 10 }}>
              {(categoryData.cats || []).map((cat) => {
                const arr = cat.items || [];
                const idx = Math.max(0, Math.min((catIdx[cat.catId] ?? 0), Math.max(arr.length - 1, 0)));
                const it = arr[idx];
                return (
                  <div key={cat.catId} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' }}>
                    <div style={{ padding: 10, background:'#f3f4f6', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ fontWeight:600 }}>{cat.category_name}</div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button
                          onClick={() => cycleCategory(cat.catId, -1)}
                          title="החלף לפריט קודם"
                          style={{ border:'1px solid #e5e7eb', padding:'4px 8px', borderRadius:6, background:'#fff', cursor:'pointer' }}
                        >◀</button>
                        <button
                          onClick={() => cycleCategory(cat.catId, +1)}
                          title="החלף לפריט הבא"
                          style={{ border:'1px solid #e5e7eb', padding:'4px 8px', borderRadius:6, background:'#fff', cursor:'pointer' }}
                        > ▶</button>
                      </div>
                    </div>
                    {!it && (
                      <div style={{ padding: 10, color:'#6b7280' }}>אין הצעות בקטגוריה זו</div>
                    )}
                    {it && (
                      <div style={{ padding: 10, display:'grid', gap:8 }}>
                        <img
                          src={resolveImageUrl(it.picture || it.imageUrl)}
                          alt={it.name}
                          style={{ width:'100%', height:140, objectFit:'cover', borderRadius:6 }}
                          onError={(e)=>{ e.currentTarget.style.display='none' }}
                        />
                        <div style={{ fontWeight:600 }}>{it.name}</div>
                        <div style={{ fontSize:12, color:'#6b7280' }}>#{idx+1} מתוך {arr.length}</div>
                        <div style={{ fontSize:13, color:'#374151' }}>{it.calories} קלוריות • חלבון {it.protein_g ?? '—'}g • פחמימות {it.carbs_g ?? '—'}g • שומן {it.fats_g ?? '—'}g</div>
                        {/* Removed per-item add button; saving happens via bottom action */}
                      </div>
                    )}
                  </div>
                );
              })}
              {(!eligibleLoading && (categoryData.cats || []).length === 0) && (
                <div style={{ padding: 10, color:'#6b7280' }}>אין עדיין הצעות. ודאו שהוגדר סוג דיאטה ושקיימים פריטים מתאימים ללא אלרגנים.</div>
              )}
              {/* Extra suggestion column if goal not reached */}
              {suggestions.extra && (
                <div key="extra" style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' }}>
                  <div style={{ padding: 10, background:'#f3f4f6', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ fontWeight:600 }}>תוספת</div>
                  </div>
                  <div style={{ padding: 10, display:'grid', gap:8 }}>
                    <img
                      src={resolveImageUrl(suggestions.extra.picture || suggestions.extra.imageUrl)}
                      alt={suggestions.extra.name}
                      style={{ width:'100%', height:140, objectFit:'cover', borderRadius:6 }}
                      onError={(e)=>{ e.currentTarget.style.display='none' }}
                    />
                    <div style={{ fontWeight:600 }}>{suggestions.extra.name}</div>
                    <div style={{ fontSize:13, color:'#374151' }}>{suggestions.extra.calories} קלוריות • חלבון {suggestions.extra.protein_g ?? '—'}g • פחמימות {suggestions.extra.carbs_g ?? '—'}g • שומן {suggestions.extra.fats_g ?? '—'}g</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Current plan items (compact view). Visible when suggestions are hidden */}
      {(!showSuggestions && plan.items && plan.items.length > 0) && (
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 8, color:'#374151', fontWeight:600 }}>פריטי תוכנית נוכחיים</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, minmax(240px, 1fr))', gap: 12 }}>
            {plan.items.map((it) => {
              const perServing = Number(it.calories || 0);
              const servings = Number(it.servings || 1);
              const totalCal = Math.round(perServing * servings);
              return (
                <div key={it.plan_product_id}
                     onClick={() => openItemModal(it)}
                     style={{ cursor:'pointer', background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ padding: 12, borderBottom:'1px solid #f3f4f6', background:'#fafafa' }}>
                    <div style={{ fontWeight:600, marginBottom:4 }}>{it.product_name || it.name || `מוצר #${it.product_id}`}</div>
                    <div style={{ fontSize:13, color:'#6b7280' }}>{perServing} קלוריות לכל מנה • {servings} מנות • סה״כ {totalCal} ק״ק</div>
                  </div>
                  <div style={{ padding: 12, display:'flex', gap:8, justifyContent:'flex-end' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); openItemModal(it); }}
                      title="פרטים"
                      style={{ border:'1px solid #e5e7eb', padding:'6px 10px', borderRadius:8, background:'#fff', cursor:'pointer' }}
                    >פרטים</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveItem(it); }}
                      title="הסר"
                      style={{ border:'1px solid #e5e7eb', padding:'6px 10px', borderRadius:8, background:'#fff', cursor:'pointer', color:'#b91c1c' }}
                    >הסר</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div style={{ marginTop: 16, display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button
          onClick={async () => {
            try {
              // Build list to save: current picks plus extra if present
              const itemsToSave = [...(suggestions.picks || [])];
              if (suggestions.extra) itemsToSave.push(suggestions.extra);
              // Avoid adding duplicates that are already in plan
              const existing = new Set((plan.items || []).map(it => Number(it.product_id)));
              for (const it of itemsToSave) {
                const pid = Number(it.product_id);
                if (!Number.isFinite(pid) || existing.has(pid)) continue;
                await api.addPlanProduct(plan.plan_id, pid, 1);
              }
              await refreshPlan();
              // Show success modal only on the first successful save action
              if (!hasShownSaveSuccess) {
                setSaveSuccessOpen(true);
                setHasShownSaveSuccess(true);
                // Auto-collapse suggestions once on first save to avoid duplicate-feel UI
                if (!hasAutoCollapsedSuggestions) {
                  setShowSuggestions(false);
                  setHasAutoCollapsedSuggestions(true);
                }
              }
            } catch (e) {
              setErr(e.message || 'שגיאה בשמירת התוכנית');
            }
          }}
          style={{ background:'#3b82f6', color:'#fff', border:'none', padding:'10px 14px', borderRadius:8, cursor:'pointer' }}
        >
          שמור תוכנית
        </button>
        <button
          onClick={onOrderAll}
          style={{ background:'#10b981', color:'#fff', border:'none', padding:'10px 14px', borderRadius:8, cursor:'pointer' }}
        >
          הזמן הכל
        </button>
      </div>

      {/* Item info modal */}
      {modalOpen && selectedItem && (
        <div
          onClick={closeItemModal}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background:'#fff', borderRadius: 10, maxWidth: 720, width: '95%', padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {/* Show image in modal if available, else placeholder */}
              {(() => {
                const pic = selectedItem?.picture || selectedItem?.imageUrl;
                if (pic) {
                  return (
                    <img
                      src={resolveImageUrl(pic)}
                      alt={selectedItem.product_name || selectedItem.name || ''}
                      style={{ width: 260, height: 200, objectFit: 'cover', borderRadius: 8, background:'#f3f4f6' }}
                      onError={(e)=>{ e.currentTarget.style.display='none'; }}
                    />
                  );
                }
                return (
                  <div style={{ width: 260, height: 200, background:'#f3f4f6', borderRadius: 8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:'#9ca3af' }}>תמונה</span>
                  </div>
                );
              })()}
              <div style={{ flex:1, minWidth: 240 }}>
                <h2 style={{ marginTop:0 }}>{selectedItem.product_name || selectedItem.name || `מוצר #${selectedItem.product_id}`}</h2>
                <div style={{ marginBottom:8 }}>
                  <span style={{ marginInlineEnd:12 }}>{selectedItem.calories} קלוריות למנה</span>
                </div>
                <div style={{ marginBottom:8 }}>
                  <span style={{ marginInlineEnd:12 }}>חלבון: {selectedItem.protein_g ?? '—'}g</span>
                  <span style={{ marginInlineEnd:12 }}>פחמימות: {selectedItem.carbs_g ?? '—'}g</span>
                  <span>שומנים: {selectedItem.fats_g ?? '—'}g</span>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
                  <button
                    onClick={closeItemModal}
                    style={{ border:'1px solid #e5e7eb', padding:'8px 12px', borderRadius:8, background:'#fff', cursor:'pointer' }}
                  >
                    סגור
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* One-time Save success modal */}
      {saveSuccessOpen && (
        <div
          onClick={() => setSaveSuccessOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background:'#fff', borderRadius: 10, maxWidth: 520, width: '95%', padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            <h3 style={{ marginTop:0, marginBottom:8 }}>התוכנית נשמרה בהצלחה</h3>
            <div style={{ color:'#374151', marginBottom: 12 }}>
              השינויים נשמרו לתוכנית הנוכחית.
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button
                onClick={() => setSaveSuccessOpen(false)}
                style={{ border:'1px solid #e5e7eb', padding:'8px 12px', borderRadius:8, background:'#fff', cursor:'pointer' }}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap modal */}
      {swapOpen && swapFor && (
        <div
          onClick={closeSwap}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background:'#fff', borderRadius: 10, maxWidth: 860, width: '95%', padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            <h3 style={{ marginTop:0, marginBottom:8 }}>בחרו תחליף דומה</h3>
            <div style={{ color:'#6b7280', marginBottom: 8 }}>
              מציג הצעות לפי קלוריות ±10% מהפריט הנוכחי. ניתן לעדכן בהמשך סינונים מתקדמים (קטגוריה/דיאטה) כאשר אותם שדות יהיו זמינים למוצרים.
            </div>

            {recipesLoading && <div>טוען הצעות...</div>}

            {!recipesLoading && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12, maxHeight: '60vh', overflowY: 'auto' }}>
                {swapCandidates.map(c => (
                  <div key={c.recipe_id || c.id}
                       style={{ cursor:'pointer', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}
                       onClick={() => onConfirmSwap(c)}
                  >
                    <img
                      src={resolveImageUrl(c.picture || c.imageUrl)}
                      alt={c.name}
                      style={{ width:'100%', height:140, objectFit:'cover' }}
                      onError={(e)=>{ e.currentTarget.style.display='none' }}
                    />
                    <div style={{ padding: 10 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>{c.name}</div>
                      <div style={{ fontSize: 13, color:'#6b7280' }}>{c.calories} קלוריות</div>
                    </div>
                  </div>
                ))}
                {swapCandidates.length === 0 && (
                  <div style={{ color:'#6b7280' }}>לא נמצאו תחליפים מתאימים לפי הקלוריות</div>
                )}
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
              <button
                onClick={closeSwap}
                style={{ border:'1px solid #e5e7eb', padding:'8px 12px', borderRadius:8, background:'#fff', cursor:'pointer' }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}