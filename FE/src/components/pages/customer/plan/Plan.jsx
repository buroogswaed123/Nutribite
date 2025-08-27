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
  const [swapFor, setSwapFor] = useState(null); // item to be swapped
  const [swapOpen, setSwapOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);

  // Initial load: user session -> plan load/create
  const didRunRef = useRef(false);
  useEffect(() => {
    if (didRunRef.current) return; // guard StrictMode double-invoke
    didRunRef.current = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const u = await getSessionUser();
        if (!u) {
          setErr('יש להתחבר כדי לראות תוכנית');
          setLoading(false);
          return;
        }

        // Resolve correct customer_id
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

        // Preload recipes (used for swap suggestions). We keep it simple here.
        setRecipesLoading(true);
        const items = await fetchRecipes({});
        setRecipes(items);
      } catch (e) {
        setErr(e.message || 'שגיאה בטעינת התוכנית');
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

      {/* Items list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {(plan.items || []).map((it) => {
          const perServing = Number(it.calories || 0);
          const servings = Number(it.servings || 1);
          const totalCal = Math.round(perServing * servings);
          return (
            <div key={it.plan_product_id}
                 style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
              {/* Compact header */}
              <div
                onClick={() => openItemModal(it)}
                style={{ cursor: 'pointer', padding: 12, borderBottom: '1px solid #f3f4f6', background:'#fafafa' }}
                title="הצגת מידע">
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {it.product_name || it.name || `מוצר #${it.product_id}`}
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {perServing} קלוריות לכל מנה • {servings} מנות • סה״כ {totalCal} ק״ק
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: 12, display:'grid', gap: 10 }}>
                <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                  <div title="חלבון" style={{ fontSize: 12, color:'#6b7280' }}>חלבון: {it.protein_g ?? '—'}g</div>
                  <div title="פחמימות" style={{ fontSize: 12, color:'#6b7280' }}>פחמימות: {it.carbs_g ?? '—'}g</div>
                  <div title="שומנים" style={{ fontSize: 12, color:'#6b7280' }}>שומנים: {it.fats_g ?? '—'}g</div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <label style={{ fontSize: 13, color:'#374151' }}>
                    מנות:
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      defaultValue={servings}
                      onBlur={(e) => onChangeServings(it, e.target.value)}
                      style={{ width: 80, marginInlineStart: 6 }}
                    />
                  </label>

                  {/* Swap icon/button */}
                  <button
                    onClick={() => openSwap(it)}
                    title="החלף לפריט דומה"
                    style={{
                      border:'1px solid #e5e7eb', padding:'6px 10px', borderRadius:8, background:'#fff', cursor:'pointer'
                    }}>
                    🔄 החלפה
                  </button>

                  {/* Add to cart (stub) */}
                  <button
                    onClick={() => onAddToCart(it)}
                    style={{ border:'1px solid #e5e7eb', padding:'6px 10px', borderRadius:8, background:'#fff', cursor:'pointer' }}
                  >
                    הוסף לעגלה
                  </button>

                  <button
                    onClick={() => onRemoveItem(it)}
                    style={{ marginInlineStart:'auto', color:'#b91c1c', border:'1px solid #fca5a5', padding:'6px 10px', borderRadius:8, background:'#fff', cursor:'pointer' }}
                  >
                    הסר
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {(!plan.items || plan.items.length === 0) && (
          <div style={{ border:'1px dashed #e5e7eb', borderRadius:8, padding:16, color:'#6b7280' }}>
            אין פריטים בתוכנית. הוסיפו פריטים מתפריט/מתכונים והם יישמרו אוטומטית לתוכנית.
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ marginTop: 16, display:'flex', gap:8, justifyContent:'flex-end' }}>
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
              {/* We don’t have image/category for products; attempt to show a placeholder */}
              <div style={{ width: 260, height: 200, background:'#f3f4f6', borderRadius: 8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ color:'#9ca3af' }}>תמונה</span>
              </div>
              <div style={{ flex:1, minWidth: 240 }}>
                <h2 style={{ marginTop:0 }}>{selectedItem.product_name || selectedItem.name || `מוצר #${selectedItem.product_id}`}</h2>
                <div style={{ marginBottom:8 }}>
                  <span style={{ marginInlineEnd:12 }}>{selectedItem.calories} קלוריות למנה</span>
                </div>
                <div style={{ marginBottom:8 }}>
                  <span style={{ marginInlineEnd:12 }}>חלבון: {selectedItem.protein ?? '—'}g</span>
                  <span style={{ marginInlineEnd:12 }}>פחמימות: {selectedItem.carbs ?? '—'}g</span>
                  <span>שומנים: {selectedItem.fats ?? '—'}g</span>
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