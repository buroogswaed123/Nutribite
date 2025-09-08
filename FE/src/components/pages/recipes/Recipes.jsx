import styles from './recipes.module.css'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { getRecipeRatingsAPI, rateRecipeAPI } from '../../../utils/functions'

// Ensure image paths work like in Menu.jsx
const ensureImageUrl = (val) => {
  if (!val) return ''
  const cleaned = String(val).replace(/^\/+/, '')
  if (/^https?:\/\//i.test(cleaned)) return cleaned
  if (/^uploads\//i.test(cleaned)) return `http://localhost:3000/${cleaned}`
  return `http://localhost:3000/uploads/${cleaned}`
}

export default function Recipes() {
  const { fetchPublicRecipes, fetchPublicRecipe } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loadingItem, setLoadingItem] = useState(false);
  const [ratingAvg, setRatingAvg] = useState(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [userStars, setUserStars] = useState(null);
  const [hoverStars, setHoverStars] = useState(null);
  const [cardHover, setCardHover] = useState({}); // { [id]: n|null }
  const [cardUserStars, setCardUserStars] = useState({}); // { [id]: n }
  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const [search, setSearch] = useState('');
  const [calories, setCalories] = useState(''); // max calories
  const [diet, setDiet] = useState('');
  const [category, setCategory] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        // Use public endpoints (not admin) to avoid 403
        const data = await fetchPublicRecipes();
        if (!cancelled) setRecipes(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
      } catch (e) {
        if (!cancelled) setError(e.message || 'שגיאה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true };
  }, []);

  // Build filter options
  const { dietOptions, categoryOptions } = useMemo(() => {
    const diets = new Set();
    const cats = new Set();
    for (const r of recipes) {
      const d = r.diet_type || r.diet_name;
      const c = r.category || r.category_name;
      if (d) diets.add(String(d));
      if (c) cats.add(String(c));
    }
    return {
      dietOptions: Array.from(diets).sort(),
      categoryOptions: Array.from(cats).sort(),
    };
  }, [recipes]);

  // Hebrew display labels for category/diet while preserving values
  const displayCategory = (v) => {
    if (!v) return '';
    const key = String(v).toLowerCase().replace(/\s+/g, '_');
    const map = {
      breakfast: 'ארוחת בוקר',
      lunch: 'ארוחת צהריים',
      dinner: 'ארוחת ערב',
      dessert: 'קינוחים',
      snack: 'חטיפים',
      snacks: 'חטיפים',
      salad: 'סלטים',
      salads: 'סלטים',
      soup: 'מרקים',
      soups: 'מרקים',
      drinks: 'משקאות',
      beverages: 'משקאות',
      main: 'מנה עיקרית',
      mains: 'מנות עיקריות',
      side: 'תוספות',
      sides: 'תוספות',
      baking: 'מאפים',
      baked_goods: 'מאפים'
    };
    return map[key] || v;
  };

  const displayDiet = (v) => {
    if (!v) return '';
    const key = String(v).toLowerCase().replace(/\s+/g, '_');
    const map = {
      vegan: 'טבעוני',
      vegetarian: 'צמחוני',
      keto: 'קטו',
      paleo: 'פליאו',
      gluten_free: 'ללא גלוטן',
      glutenfree: 'ללא גלוטן',
      dairy_free: 'ללא מוצרי חלב',
      low_carb: 'דל פחמימות',
      low_fat: 'דל שומן',
      mediterranean: 'ים תיכונית',
      pescatarian: 'פסקטריאני',
      kosher: 'כשר',
      halal: 'חלאל'
    };
    return map[key] || v;
  };

  // Filtered list
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const maxCal = calories ? parseInt(calories, 10) : null;
    return recipes.filter(r => {
      const nameOk = !s || String(r.name || '').toLowerCase().includes(s);
      const cal = r.calories != null ? Number(r.calories) : null;
      const calOk = !maxCal || (cal != null && cal <= maxCal) || (String(r.calories || '').includes(s) && !calories);
      const dietVal = r.diet_type || r.diet_name || '';
      const catVal = r.category || r.category_name || '';
      const dietOk = !diet || String(dietVal) === diet;
      const catOk = !category || String(catVal) === category;
      return nameOk && calOk && dietOk && catOk;
    });
  }, [recipes, search, calories, diet, category]);

  // Helper to slugify names for URLs
  const slugify = (str) => String(str || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

  // Open modal by URL (?recipeId=...&slug=...)
  useEffect(() => {
    let cancelled = false;
    const rid = searchParams.get('recipeId');
    if (!rid) return;
    (async () => {
      setOpenId(rid);
      setSelected(null);
      setLoadingItem(true);
      try {
        const full = await fetchPublicRecipe(rid);
        if (!cancelled) setSelected(full?.item || full);
        // fetch ratings meta
        try {
          const meta = await getRecipeRatingsAPI(rid);
          if (!cancelled) {
            setRatingAvg(meta?.avg ?? null);
            setRatingCount(meta?.count ?? 0);
            setUserStars(meta?.userStars ?? null);
          }
        } catch (_) {
          if (!cancelled) { setRatingAvg(null); setRatingCount(0); setUserStars(null); }
        }
      } catch (e) {
        if (!cancelled) setSelected(null);
      } finally {
        if (!cancelled) setLoadingItem(false);
      }
    })();
    return () => { cancelled = true };
  }, [searchParams]);

  if (loading) return <div className={styles.pad16}>טוען...</div>;
  if (error) return <div className={`${styles.pad16} ${styles.errorText}`}>{error}</div>;

  return (
    <>
    <div>
      <h1>מתכונים</h1>
      {/* Filters */}
      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="חפש בשם..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className={styles.search}
          placeholder="קלוריות מקס׳"
          inputMode="numeric"
          value={calories}
          onChange={(e) => setCalories(e.target.value.replace(/[^0-9]/g, ''))}
        />
        <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">כל הקטגוריות</option>
          {categoryOptions.map(opt => (
            <option key={opt} value={opt}>{displayCategory(opt)}</option>
          ))}
        </select>
        <select className={styles.select} value={diet} onChange={(e) => setDiet(e.target.value)}>
          <option value="">כל סוגי הדיאטה</option>
          {dietOptions.map(opt => (
            <option key={opt} value={opt}>{displayDiet(opt)}</option>
          ))}
        </select>
      </div>

      <div className={styles.cardsGrid}>
        {filtered.map((recipe) => (
          <div key={recipe.id || recipe.recipe_id} className={styles.cardNarrow}>
            <img
              src={ensureImageUrl(recipe.picture || recipe.imageUrl || recipe.image)}
              alt={recipe.name}
              loading="lazy"
              decoding="async"
              className={styles.cardImageNarrow}
              onClick={async () => {
                const id = recipe.id || recipe.recipe_id;
                setOpenId(id);
                setSelected(null);
                setLoadingItem(true);
                try {
                  const full = await fetchPublicRecipe(id);
                  setSelected(full?.item || full);
                } catch (e) {
                  setSelected(null);
                } finally {
                  setLoadingItem(false);
                }
                const slug = slugify(recipe.name);
                setSearchParams({ recipeId: String(id), slug });
              }}
            />
            <h3 className={styles.cardTitle}>{recipe.name}</h3>
            <p className={styles.cardDesc}>{recipe.description || recipe.shortDescription || recipe.summary || recipe.summary}</p>
            {/* Card stars (quick rate) */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                {[1,2,3,4,5].map(n => {
                  const id = recipe.id || recipe.recipe_id;
                  const avg = Number(recipe.rating_avg ?? 0);
                  const active = (cardHover[id] ?? cardUserStars[id] ?? Math.round(avg)) >= n;
                  return (
                    <span
                      key={n}
                      title={`דרג ${n}`}
                      onMouseEnter={() => setCardHover(prev => ({ ...prev, [id]: n }))}
                      onMouseLeave={() => setCardHover(prev => ({ ...prev, [id]: null }))}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await rateRecipeAPI(id, n);
                          setCardUserStars(prev => ({ ...prev, [id]: res?.userStars ?? n }));
                          // update the recipe's cached avg locally so UI reflects change
                          setRecipes(prev => prev.map(r => ( (r.id||r.recipe_id) === id ? { ...r, rating_avg: res?.avg ?? n } : r )));
                        } catch (err) {
                          const status = err?.response?.status;
                          if (status === 401) {
                            showToast('יש להתחבר כלקוח כדי לדרג מתכונים');
                          } else {
                            console.error('Failed to rate on card:', err?.message || err);
                          }
                        }
                      }}
                      style={{ cursor:'pointer', color: active ? '#f59e0b' : '#d1d5db', fontSize:16 }}
                    >★</span>
                  );
                })}
              </div>
              <span style={{ color:'#6b7280', fontSize:12 }}>
                {recipe.rating_avg != null ? Number(recipe.rating_avg).toFixed(1) : '—'}
                {cardHover[recipe.id || recipe.recipe_id] ? ` · דרג ${cardHover[recipe.id || recipe.recipe_id]}` : ''}
              </span>
            </div>
            <button className={styles.btn} onClick={async () => {
              const id = recipe.id || recipe.recipe_id;
              setOpenId(id);
              setSelected(null);
              setLoadingItem(true);
              try {
                const full = await fetchPublicRecipe(id);
                setSelected(full?.item || full);
              } catch (e) {
                setSelected(null);
              } finally {
                setLoadingItem(false);
              }
              const slug = slugify(recipe.name);
              setSearchParams({ recipeId: String(id), slug });
            }}>קרא עוד</button>
          </div>
        ))}
      </div>

      {openId && (
        <div className={styles.modalOverlay} onClick={() => { setOpenId(null); setSelected(null); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selected?.name || 'מתכון'}</h3>
              <button className={styles.closeBtn} onClick={() => { setOpenId(null); setSelected(null); setSearchParams({}); }}>×</button>
            </div>
            <div className={`${styles.modalBody} ${styles.rtl}`}>
              {loadingItem ? (
                <div>טוען...</div>
              ) : selected ? (
                <div>
                  {(() => {
                    const img = ensureImageUrl(selected.picture || selected.imageUrl || selected.image);
                    return img ? (
                      <img src={img} alt={selected.name} className={styles.modalImg} />
                    ) : null;
                  })()}
                  {selected.description && <p className={`${styles.mt12} ${styles.detailDesc}`}>{selected.description}</p>}
                  <div className={styles.metaRow}>
                    {selected.calories != null && <span className={styles.calories}>{selected.calories} קלוריות</span>}
                    {(selected.diet_type || selected.diet_name) && <span>דיאטה: {selected.diet_type || selected.diet_name}</span>}
                    {(selected.category || selected.category_name) && <span>קטגוריה: {selected.category || selected.category_name}</span>}
                  </div>

                  {/* Ratings */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                      {[1,2,3,4,5].map(n => {
                        const active = (hoverStars ?? userStars ?? Math.round(ratingAvg ?? 0)) >= n;
                        return (
                          <span
                            key={n}
                            title={`דרג ${n}`}
                            onMouseEnter={() => setHoverStars(n)}
                            onMouseLeave={() => setHoverStars(null)}
                            onClick={async () => {
                              try {
                                const rid = selected.id || selected.recipe_id;
                                const res = await rateRecipeAPI(rid, n);
                                setUserStars(res?.userStars ?? n);
                                setRatingAvg(res?.avg ?? n);
                                setRatingCount(res?.count ?? (ratingCount || 1));
                              } catch (e) {
                                const status = e?.response?.status;
                                if (status === 401) {
                                  showToast('יש להתחבר כלקוח כדי לדרג מתכונים');
                                } else {
                                  console.error('Failed to rate:', e?.message || e);
                                }
                              }
                            }}
                            style={{ cursor:'pointer', color: active ? '#f59e0b' : '#d1d5db', fontSize:18 }}
                          >★</span>
                        );
                      })}
                    </div>
                    <span style={{ color:'#6b7280', fontSize:13 }}>
                      {ratingAvg != null ? ratingAvg.toFixed(1) : '—'} ({ratingCount}) {hoverStars ? `· דרג ${hoverStars}` : ''}
                    </span>
                  </div>

                  {(() => {
                    // Build ingredients array from string/array
                    let ingredientsArr = [];
                    if (Array.isArray(selected.ingredients)) {
                      ingredientsArr = selected.ingredients;
                    } else if (typeof selected.ingredients === 'string') {
                      const s = selected.ingredients.trim();
                      if (s.startsWith('[')) {
                        try { ingredientsArr = JSON.parse(s); } catch {}
                      }
                      if (ingredientsArr.length === 0) {
                        ingredientsArr = s.split(/\r?\n|,\s*/).map(x => x.trim()).filter(Boolean);
                      }
                    }

                    // Build instructions steps
                    let steps = [];
                    if (typeof selected.instructions === 'string') {
                      const raw = selected.instructions.trim();
                      steps = raw.split(/\r?\n+/).map(x => x.trim()).filter(Boolean);
                    }

                    return (
                      <div className={styles.section}>
                        {ingredientsArr.length > 0 && (
                          <div className={styles.section}>
                            <h4 className={styles.sectionTitle}>מרכיבים</h4>
                            <ul className={`${styles.columnsList} ${styles.rtlList}`}>
                              {ingredientsArr.map((ing, idx) => (
                                <li key={idx}>{ing}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {steps.length > 0 && (
                          <div className={styles.section}>
                            <h4 className={styles.sectionTitle}>הוראות הכנה</h4>
                            <ol className={styles.rtlList}>
                              {steps.map((st, idx) => (
                                <li key={idx}>{st}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className={styles.errorText}>שגיאה בטעינת מתכון</div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setOpenId(null); setSelected(null); setSearchParams({}); }}>סגור</button>
            </div>
          </div>
        </div>
      )}

    </div>
    {toast && (
      <div style={{ position:'fixed', bottom:16, insetInlineEnd:16, background:'#111827', color:'#fff', padding:'10px 14px', borderRadius:8, boxShadow:'0 6px 12px rgba(0,0,0,0.2)', zIndex:1000 }}>
        {toast}
      </div>
    )}
    </>
  )
}