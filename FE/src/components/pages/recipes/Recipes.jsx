import styles from './recipes.module.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpDown, Star } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../../hooks/useAuth'
import { getRecipeRatingsAPI, rateRecipeAPI, getSessionUser, fetchDietTypes, fetchMenuCategoriesAPI, getProductByRecipeAPI, updateProductByRecipeAPI, ensureImageUrl, fetchTopRatedRecipesAPI } from '../../../utils/functions'

// Use shared ensureImageUrl from utils

export default function Recipes() {
  const { fetchPublicRecipes, fetchPublicRecipe } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
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
  // Popular filter and badge support
  const [popularOnly, setPopularOnly] = useState(false);
  const [topRatedSet, setTopRatedSet] = useState(new Set());
  // Macros filter UI (client-side on this page)
  const [showMacros, setShowMacros] = useState(false);
  const [protMin, setProtMin] = useState('');
  const [protMax, setProtMax] = useState('');
  const [carbMin, setCarbMin] = useState('');
  const [carbMax, setCarbMax] = useState('');
  const [fatMin, setFatMin] = useState('');
  const [fatMax, setFatMax] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [dietTypeList, setDietTypeList] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [adminForm, setAdminForm] = useState({
    name: '',
    description: '',
    instructions: '',
    diet_type_id: '',
    category_id: '',
    price: '',
    calories: '',
    servings: '',
    picture: '',
    stock: '',
  });
  const [adminIngredients, setAdminIngredients] = useState([]);
  const [adminIngInput, setAdminIngInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editUploading, setEditUploading] = useState(false);
  const [priceInfo, setPriceInfo] = useState({ current: null, newPrice: '', discountPct: '' });
  const [savingPrice, setSavingPrice] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Admin management helpers
  const [adminMode, setAdminMode] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedMap, setSelectedMap] = useState({}); // { [id]: true }
  const [confirmDlg, setConfirmDlg] = useState({ open: false, text: '', onConfirm: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        // Kick off all network requests in parallel (default public; admin mode refresh handled below)
        const recipesP = fetchPublicRecipes();
        const userP = getSessionUser().catch(() => null);
        const listsP = Promise.all([
          fetchDietTypes().catch(()=>[]),
          fetchMenuCategoriesAPI().catch(()=>[]),
        ]);
        const topP = fetchTopRatedRecipesAPI(5).catch(() => []);

        // 1) Await recipes first to render the page ASAP
        const data = await recipesP;
        if (!cancelled) {
          setRecipes(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
          setLoading(false); // allow UI to show while other data loads in background
        }

        // 2) Apply admin/user + lists when available (does not block initial render)
        try {
          const user = await userP;
          if (!cancelled && user) {
            const isAdm = String(user.user_type).toLowerCase() === 'admin';
            setIsAdmin(isAdm);
            if (isAdm) setAdminMode(true);
          }
        } catch {}
        try {
          const [diets, cats] = await listsP;
          if (!cancelled) {
            setDietTypeList(Array.isArray(diets) ? diets : []);
            setCategoryList(Array.isArray(cats) ? cats.map(c => ({ id: c.id, name: c.name })) : []);
          }
        } catch {}
        // 3) Top-rated ids for badges
        try {
          const top = await topP;
          const ids = Array.isArray(top) ? top.map(it => Number(it.id || it.recipe_id)).filter(Number.isFinite) : [];
          if (!cancelled) setTopRatedSet(new Set(ids));
        } catch {}
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'שגיאה');
          setLoading(false);
        }
      } finally {
        // loading already cleared after recipesP resolves
      }
    })();
    return () => { cancelled = true };
  }, []);

  // Admin-mode loader: fetch via admin search, honoring showDeleted
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!adminMode || !isAdmin) return;
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (showDeleted) params.set('includeDeleted', 'true');
        const url = `/api/admin/recipes/search${params.toString() ? `?${params.toString()}` : ''}`;
        const res = await axios.get(url, { withCredentials: true });
        const items = Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : []);
        if (!cancel) setRecipes(items);
      } catch (e) {
        if (!cancel) setError(e?.message || 'שגיאה בטעינת ניהול מתכונים');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [adminMode, showDeleted]);

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
    let arr = recipes.filter(r => {
      const nameOk = !s || String(r.name || '').toLowerCase().includes(s);
      const cal = r.calories != null ? Number(r.calories) : null;
      const calOk = !maxCal || (cal != null && cal <= maxCal) || (String(r.calories || '').includes(s) && !calories);
      const dietVal = r.diet_type || r.diet_name || '';
      const catVal = r.category || r.category_name || '';
      const dietOk = !diet || String(dietVal) === diet;
      const catOk = !category || String(catVal) === category;
      // Macro ranges
      const p = r.protein_g != null ? Number(r.protein_g) : null;
      const c = r.carbs_g != null ? Number(r.carbs_g) : null;
      const f = r.fats_g != null ? Number(r.fats_g) : null;
      const pMinOk = protMin === '' || (p != null && p >= Number(protMin));
      const pMaxOk = protMax === '' || (p != null && p <= Number(protMax));
      const cMinOk = carbMin === '' || (c != null && c >= Number(carbMin));
      const cMaxOk = carbMax === '' || (c != null && c <= Number(carbMax));
      const fMinOk = fatMin === '' || (f != null && f >= Number(fatMin));
      const fMaxOk = fatMax === '' || (f != null && f <= Number(fatMax));
      return nameOk && calOk && dietOk && catOk && pMinOk && pMaxOk && cMinOk && cMaxOk && fMinOk && fMaxOk;
    });
    if (popularOnly) {
      const isTop = (r) => topRatedSet && topRatedSet.has(Number(r.id || r.recipe_id));
      // Do NOT filter; only sort with top-rated first, then by rating desc
      arr = arr.slice().sort((a,b) => {
        const ta = isTop(a) ? 1 : 0;
        const tb = isTop(b) ? 1 : 0;
        if (tb !== ta) return tb - ta; // top-rated first
        return (Number(b.rating_avg||0) - Number(a.rating_avg||0));
      });
    }
    return arr;
  }, [recipes, search, calories, diet, category, protMin, protMax, carbMin, carbMax, fatMin, fatMax, popularOnly, topRatedSet]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, calories, diet, category, protMin, protMax, carbMin, carbMax, fatMin, fatMax]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const currentItems = filtered.slice(offset, offset + limit);

  // Helper to slugify names for URLs
  const slugify = (str) => String(str || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

  // Macro display helper: returns string like "X גרם · Y קק\"ל · Z%"
  const macroLine = (grams, calsPerGram, totalCalories) => {
    const g = Number(grams);
    if (!Number.isFinite(g)) return '—';
    const kcal = Number.isFinite(calsPerGram) ? Math.round(g * calsPerGram) : null;
    const pct = (Number.isFinite(totalCalories) && totalCalories > 0 && kcal != null)
      ? Math.round((kcal / totalCalories) * 100)
      : null;
    let txt = `${g} גרם`;
    if (kcal != null) txt += ` · ${kcal} קק"ל`;
    if (pct != null) txt += ` · ${pct}%`;
    return txt;
  };

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
        const ridNum = Number(rid);
        if (!Number.isFinite(ridNum)) throw new Error('invalid id');
        const full = await fetchPublicRecipe(ridNum);
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
    <div className={`${styles.recipes} ${styles.rtlNudgeRight}`}>
      <h1 className={styles.pageTitleRight}>מתכונים</h1>
      {isAdmin && (
        <div style={{ marginBottom: 10, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <button className={styles.btn} onClick={() => setAdminModalOpen(true)}>הוסף מתכון</button>
          <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
            <input type="checkbox" checked={adminMode} onChange={(e)=>{ setAdminMode(e.target.checked); }} /> מצב ניהול
          </label>
          {adminMode && (
            <>
              <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                <input type="checkbox" checked={showDeleted} onChange={(e)=> setShowDeleted(e.target.checked)} /> הצג מחוקים
              </label>
              <label style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                <input type="checkbox" checked={bulkMode} onChange={(e)=>{ setBulkMode(e.target.checked); setSelectedMap({}); }} /> בחירה מרובה
              </label>
              <button
                className={styles.btn}
                disabled={!bulkMode || Object.keys(selectedMap).length === 0}
                onClick={() => setConfirmDlg({
                  open: true,
                  text: `למחוק ${Object.keys(selectedMap).length} מתכונים שנבחרו? (מחיקה רכה)`,
                  onConfirm: async () => {
                    setConfirmDlg({ open:false, text:'', onConfirm:null });
                    const ids = Object.keys(selectedMap);
                    await Promise.all(ids.map(async (rid) => {
                      try { await fetch(`/api/admin/recipes/${rid}`, { method:'DELETE', credentials:'include' }); } catch {}
                    }));
                    setRecipes(prev => prev.filter(r => !selectedMap[String(r.id||r.recipe_id)]));
                    setSelectedMap({});
                  }
                })}
              >מחק נבחרים</button>
              <button
                className={styles.btn}
                disabled={!bulkMode || Object.keys(selectedMap).length === 0}
                onClick={() => setConfirmDlg({
                  open: true,
                  text: `לשחזר ${Object.keys(selectedMap).length} מתכונים שנבחרו?`,
                  onConfirm: async () => {
                    setConfirmDlg({ open:false, text:'', onConfirm:null });
                    const ids = Object.keys(selectedMap);
                    await Promise.all(ids.map(async (rid) => {
                      try { await fetch(`/api/admin/recipes/${rid}/restore`, { method:'POST', credentials:'include' }); } catch {}
                    }));
                    // Re-load admin list to reflect restores
                    try {
                      const params = new URLSearchParams();
                      if (showDeleted) params.set('includeDeleted', 'true');
                      const url = `/api/admin/recipes/search${params.toString()?`?${params.toString()}`:''}`;
                      const res = await axios.get(url, { withCredentials:true });
                      const items = Array.isArray(res.data?.items) ? res.data.items : [];
                      setRecipes(items);
                    } catch {}
                    setSelectedMap({});
                  }
                })}
              >שחזר נבחרים</button>
            </>
          )}
        </div>
      )}
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
        <button className={styles.btn} onClick={()=>setShowMacros(v=>!v)} style={{ marginInlineStart: 8 }}>ערכים תזונתיים</button>
        <button
          type="button"
          className={`${styles.filterIconBtn} ${popularOnly ? 'active' : ''}`}
          onClick={()=>setPopularOnly(v=>!v)}
          title="סינון לפי פופולריות"
          aria-pressed={popularOnly}
          aria-label="סדר לפי פופולריות"
        >
          <ArrowUpDown size={16} />
        </button>
      </div>

      {showMacros && (
        <div className={styles.filters} style={{ marginTop: 8 }}>
          <div className={`${styles.macrosBlock} ${styles.rtl}`}>
            <div className={styles.macroRowAlign}>
              <span className={styles.macroLabel}>חלבון (גרם)</span>
              <input className={`${styles.search} ${styles.macroInput}`} inputMode="numeric" value={protMin} onChange={(e)=>setProtMin(e.target.value.replace(/[^0-9]/g,''))} placeholder="מ-" />
              <input className={`${styles.search} ${styles.macroInput}`} inputMode="numeric" value={protMax} onChange={(e)=>setProtMax(e.target.value.replace(/[^0-9]/g,''))} placeholder="עד" />
            </div>
            <div className={styles.macroRowAlign}>
              <span className={styles.macroLabel}>פחמימות (גרם)</span>
              <input className={`${styles.search} ${styles.macroInput}`} inputMode="numeric" value={carbMin} onChange={(e)=>setCarbMin(e.target.value.replace(/[^0-9]/g,''))} placeholder="מ-" />
              <input className={`${styles.search} ${styles.macroInput}`} inputMode="numeric" value={carbMax} onChange={(e)=>setCarbMax(e.target.value.replace(/[^0-9]/g,''))} placeholder="עד" />
            </div>
            <div className={styles.macroRowAlign}>
              <span className={styles.macroLabel}>שומנים (גרם)</span>
              <input className={`${styles.search} ${styles.macroInput}`} inputMode="numeric" value={fatMin} onChange={(e)=>setFatMin(e.target.value.replace(/[^0-9]/g,''))} placeholder="מ-" />
              <input className={`${styles.search} ${styles.macroInput}`} inputMode="numeric" value={fatMax} onChange={(e)=>setFatMax(e.target.value.replace(/[^0-9]/g,''))} placeholder="עד" />
            </div>
            <div>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={()=>{ setProtMin(''); setProtMax(''); setCarbMin(''); setCarbMax(''); setFatMin(''); setFatMax(''); }}>נקה ערכים</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.cardsGrid}>
        {currentItems.map((recipe, idx) => (
          <div key={recipe.id || recipe.recipe_id} className={styles.cardNarrow}>
            <div className={styles.cardImageWrap}>
              {adminMode && bulkMode && (
                <input
                  type="checkbox"
                  checked={!!selectedMap[String(recipe.id || recipe.recipe_id)]}
                  onChange={(e)=>{
                    const id = String(recipe.id || recipe.recipe_id);
                    setSelectedMap(prev => ({ ...prev, [id]: e.target.checked ? true : undefined }));
                  }}
                  style={{ position:'absolute', insetInlineStart: 8, insetBlockStart: 8, zIndex:2 }}
                />
              )}
              {topRatedSet.has(Number(recipe.id || recipe.recipe_id)) && (
                <span className={styles.popularBadge} title="פופולרי">
                  <Star size={12} color="#fff" fill="#fff" />
                  פופולרי
                </span>
              )}
              <img
                src={ensureImageUrl(recipe.picture || recipe.imageUrl || recipe.image)}
                alt={recipe.name}
                loading={idx < 6 ? 'eager' : 'lazy'}
                fetchpriority={idx < 6 ? 'high' : 'auto'}
                decoding="async"
                width="220"
                height="140"
                className={styles.cardImageNarrow}
                onClick={async () => {
                  const id = recipe.id || recipe.recipe_id;
                  setOpenId(id);
                  setSelected(null);
                  setLoadingItem(true);
                  try {
                    const idNum = Number(id);
                    if (!Number.isFinite(idNum)) throw new Error('invalid id');
                    const full = await fetchPublicRecipe(idNum);
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
            </div>
            <h3 className={styles.cardTitle}>{recipe.name}</h3>
            {adminMode && recipe.deleted_at && (
              <div style={{ color:'#b91c1c', fontSize:12 }}>מחוק</div>
            )}
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
                const idNum = Number(id);
                if (!Number.isFinite(idNum)) throw new Error('invalid id');
                const full = await fetchPublicRecipe(idNum);
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

      {/* Pagination controls */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, margin:'12px 0' }}>
        {/* Left chevron navigates forward (next) in RTL */}
        <button className={styles.btn} disabled={page >= totalPages} onClick={() => setPage(p=>Math.min(totalPages, p+1))}>{'<'}</button>
        <span style={{ color:'#6b7280' }}>עמוד {page} מתוך {totalPages}</span>
        {/* Right chevron navigates backward (prev) in RTL */}
        <button className={styles.btn} disabled={page <= 1} onClick={() => setPage(p=>Math.max(1, p-1))}>{'>'}</button>
      </div>

      {openId && (
        <div className={styles.modalOverlay} onClick={() => { setOpenId(null); setSelected(null); }}>
          <div className={styles.modal} style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editMode ? 'עריכת מתכון' : (selected?.name || 'מתכון')}</h3>
              <button className={styles.closeBtn} onClick={() => { setOpenId(null); setSelected(null); setSearchParams({}); }}>×</button>
            </div>
            <div className={`${styles.modalBody} ${styles.rtl}`}>
              {loadingItem ? (
                <div>טוען...</div>
              ) : selected ? (
                <div>
                  {!editMode ? (
                    <>
                      {(() => {
                        const img = ensureImageUrl(selected.picture || selected.imageUrl || selected.image);
                        return img ? (
                          <img src={img} alt={selected.name} className={styles.modalImg} />
                        ) : null;
                      })()}
                      {selected.description && <p className={`${styles.mt12} ${styles.detailDesc}`}>{selected.description}</p>}
                    </>
                  ) : (
                    <>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <label className={styles.btn} style={{ cursor:'pointer' }}>
                          העלה תמונה
                          <input type="file" accept="image/*" style={{ display:'none' }} onChange={async (e)=>{
                            const file = e.target.files && e.target.files[0];
                            if (!file) return;
                            try {
                              setEditUploading(true);
                              const fd = new FormData();
                              fd.append('image', file);
                              const resp = await fetch('/api/admin/recipes/upload-image', { method:'POST', credentials:'include', body: fd });
                              const ok = resp.ok; const data = await resp.json().catch(()=>({}));
                              if (!ok) throw new Error(data?.message || 'העלאת תמונה נכשלה');
                              setEditForm(f => ({ ...f, picture: data?.path || f.picture }));
                            } catch (er) {
                              showToast(er.message || 'העלאת תמונה נכשלה');
                            } finally { setEditUploading(false); }
                          }} />
                        </label>
                        {editUploading && <span style={{ color:'#6b7280' }}>מעלה...</span>}
                        {editForm?.picture && (
                          <img src={ensureImageUrl(editForm.picture)} alt="preview" style={{ height:48, borderRadius:6, border:'1px solid #e5e7eb' }} />
                        )}
                      </div>
                      <label style={{ display:'block', marginTop:8 }}>שם
                        <input className={styles.search} value={editForm?.name || ''} onChange={e=>setEditForm(f=>({...f, name: e.target.value}))} />
                      </label>
                      <label style={{ display:'block', marginTop:8 }}>תיאור
                        <textarea className={styles.textarea} value={editForm?.description || ''} onChange={e=>setEditForm(f=>({...f, description: e.target.value}))} />
                      </label>
                    </>
                  )}
                  <div className={styles.metaRow}>
                    {!editMode ? (
                      <>
                        {selected.calories != null && <span className={styles.calories}>{selected.calories} קלוריות</span>}
                        {(selected.diet_type || selected.diet_name) && <span>דיאטה: {selected.diet_type || selected.diet_name}</span>}
                        {(selected.category || selected.category_name) && <span>קטגוריה: {selected.category || selected.category_name}</span>}
                      </>
                    ) : (
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', width:'100%' }}>
                        <label>קלוריות
                          <input className={styles.search} inputMode="numeric" value={editForm?.calories ?? ''} onChange={e=>setEditForm(f=>({...f, calories: e.target.value.replace(/[^0-9]/g,'')}))} />
                        </label>
                        <label>מנות
                          <input className={styles.search} inputMode="numeric" value={editForm?.servings ?? ''} onChange={e=>setEditForm(f=>({...f, servings: e.target.value.replace(/[^0-9]/g,'')}))} />
                        </label>
                        <label>סוג דיאטה
                          <select className={styles.select} value={editForm?.diet_type_id ?? ''} onChange={e=>setEditForm(f=>({...f, diet_type_id: e.target.value}))}>
                            <option value="">בחר</option>
                            {dietTypeList.map(dt => (
                              <option key={dt.diet_id||dt.id} value={dt.diet_id||dt.id}>{dt.name}</option>
                            ))}
                          </select>
                        </label>
                        <label>קטגוריה
                          <select className={styles.select} value={editForm?.category_id ?? ''} onChange={e=>setEditForm(f=>({...f, category_id: e.target.value}))}>
                            <option value="">בחר</option>
                            {categoryList.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Macros (protein, carbs, fats) with colored dots */}
                  {!editMode && (
                    <ul className={styles.macroList}>
                      <li className={styles.macroRow}>
                        <span className={`${styles.macroDot} ${styles.protein}`}></span>
                        <span>חלבון: <strong>{macroLine(selected.protein_g, 4, Number(selected.calories))}</strong></span>
                      </li>
                      <li className={styles.macroRow}>
                        <span className={`${styles.macroDot} ${styles.carb}`}></span>
                        <span>פחמימות: <strong>{macroLine(selected.carbs_g, 4, Number(selected.calories))}</strong></span>
                      </li>
                      <li className={styles.macroRow}>
                        <span className={`${styles.macroDot} ${styles.fat}`}></span>
                        <span>שומנים: <strong>{macroLine(selected.fats_g, 9, Number(selected.calories))}</strong></span>
                      </li>
                    </ul>
                  )}

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

                  {!editMode && (() => {
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
              {isAdmin && !editMode && (
                <div style={{ display:'flex', gap:8, width:'100%', justifyContent:'space-between' }}>
                  <button className={styles.btn}
                          onClick={()=>{
                            setEditMode(true);
                            // derive IDs from names if missing
                            const dietName = selected.diet_type || selected.diet_name || '';
                            const catName = selected.category || selected.category_name || '';
                            const dietMatch = dietTypeList.find(dt => String(dt.name).toLowerCase() === String(dietName).toLowerCase());
                            const catMatch = categoryList.find(c => String(c.name).toLowerCase() === String(catName).toLowerCase());
                            setEditForm({
                              id: selected.id || selected.recipe_id,
                              name: selected.name || '',
                              description: selected.description || '',
                              instructions: selected.instructions || '',
                              calories: selected.calories ?? '',
                              servings: selected.servings ?? '',
                              diet_type_id: selected.diet_type_id || dietMatch?.diet_id || dietMatch?.id || '',
                              category_id: selected.category_id || catMatch?.id || '',
                              picture: selected.picture || selected.imageUrl || selected.image || '',
                            });
                          }}>ערוך</button>
                  <button className={styles.btn}
                          style={{ background:'#dc2626' }}
                          disabled={deleting}
                          onClick={()=> setConfirmDlg({
                            open:true,
                            text:'למחוק את המתכון הזה? ניתן יהיה לשחזר מאוחר יותר.',
                            onConfirm: async ()=>{
                              try {
                                if (!selected) return;
                                setDeleting(true);
                                const rid = selected.id || selected.recipe_id;
                                const resp = await fetch(`/api/admin/recipes/${rid}`, { method:'DELETE', credentials:'include' });
                                if (!resp.ok) {
                                  try { const j = await resp.json(); throw new Error(j?.message || 'מחיקה נכשלה'); } catch { throw new Error('מחיקה נכשלה'); }
                                }
                                setRecipes(prev => prev.filter(r => (r.id||r.recipe_id) !== rid));
                                setOpenId(null);
                                setSelected(null);
                                setSearchParams({});
                                showToast('המתכון נמחק (רך)');
                              } catch (e) {
                                showToast(e?.message || 'מחיקה נכשלה');
                              } finally {
                                setDeleting(false);
                                setConfirmDlg({ open:false, text:'', onConfirm:null });
                              }
                            }
                          })}>{deleting ? 'מוחק…' : 'מחק'}</button>
                  {/* Restore button when soft-deleted (from list metadata) */}
                  {(() => {
                    const rid = selected?.id || selected?.recipe_id;
                    const meta = (recipes || []).find(r => (r.id||r.recipe_id) === rid);
                    const isDeleted = !!meta?.deleted_at;
                    if (!isDeleted) return null;
                    return (
                      <button className={styles.btn}
                              onClick={async ()=>{
                                try{
                                  await fetch(`/api/admin/recipes/${rid}/restore`, { method:'POST', credentials:'include' });
                                  // Refresh current meta in list
                                  setRecipes(prev => prev.map(r => ((r.id||r.recipe_id) === rid ? { ...r, deleted_at: null } : r)));
                                  showToast('המתכון שוחזר');
                                  setOpenId(null);
                                  setSelected(null);
                                  setSearchParams({});
                                }catch(e){ showToast(e?.message || 'שחזור נכשל'); }
                              }}>שחזר</button>
                    );
                  })()}
                </div>
              )}
              {isAdmin && editMode && (
                <>
                  <button className={styles.btn} onClick={async ()=>{
                    try{
                      const rid = editForm.id;
                      const body = {
                        name: editForm.name,
                        description: editForm.description,
                        instructions: editForm.instructions,
                        calories: editForm.calories ? Number(editForm.calories) : null,
                        servings: editForm.servings ? Number(editForm.servings) : null,
                        diet_type_id: editForm.diet_type_id || null,
                        category_id: editForm.category_id || null,
                        picture: editForm.picture || '',
                      };
                      const resp = await fetch(`/api/admin/recipes/${rid}`, { method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
                      if (!resp.ok) { const j = await resp.json().catch(()=>({})); throw new Error(j?.message || 'שמירה נכשלה'); }
                      // refresh selected details
                      const full = await fetchPublicRecipe(rid);
                      setSelected(full?.item || full);
                      showToast('נשמר בהצלחה');
                      setEditMode(false);
                    }catch(e){ showToast(e.message || 'שמירה נכשלה'); }
                  }}>שמור</button>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={()=>{ setEditMode(false); }}>בטל</button>
                </>
              )}
              {isAdmin && editMode && (
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginInlineStart:'auto' }}>
                  <div style={{ color:'#6b7280', fontSize:12 }}>מחיר נוכחי: {priceInfo.current != null ? `${priceInfo.current}₪` : '—'}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <input
                      className={styles.search}
                      placeholder="מחיר חדש ₪"
                      inputMode="decimal"
                      value={priceInfo.newPrice}
                      onChange={(e)=> setPriceInfo(pi=>({ ...pi, newPrice: e.target.value.replace(/[^0-9.]/g,'') }))}
                      style={{ width: 130 }}
                    />
                    <input
                      className={styles.search}
                      placeholder="הנחה %"
                      inputMode="numeric"
                      value={priceInfo.discountPct}
                      onChange={(e)=> setPriceInfo(pi=>({ ...pi, discountPct: e.target.value.replace(/[^0-9]/g,'') }))}
                      style={{ width: 110 }}
                    />
                    <button
                      className={styles.btn}
                      disabled={savingPrice || (priceInfo.newPrice === '' && (priceInfo.discountPct === '' || priceInfo.current == null))}
                      onClick={async ()=>{
                        try {
                          setSavingPrice(true);
                          const rid = editForm.id;
                          let priceToApply = null;
                          if (priceInfo.newPrice !== '') {
                            // clamp to 2 decimals
                            priceToApply = Math.round(Number(priceInfo.newPrice) * 100) / 100;
                          } else if (priceInfo.discountPct !== '' && priceInfo.current != null) {
                            const pct = Number(priceInfo.discountPct);
                            // Reduce by percent: price * (1 - pct/100)
                            priceToApply = Number(priceInfo.current) * (1 - (pct/100));
                            priceToApply = Math.round(priceToApply * 100) / 100;
                          }
                          if (priceToApply == null || isNaN(priceToApply)) return;
                          if (priceToApply <= 0) priceToApply = 0.01;
                          await updateProductByRecipeAPI(rid, { price: priceToApply });
                          setPriceInfo(pi=>({ ...pi, current: priceToApply }));
                          showToast('המחיר עודכן');
                        } catch (e) {
                          showToast(e?.message || 'עדכון מחיר נכשל');
                        } finally {
                          setSavingPrice(false);
                        }
                      }}
                    >עדכן מחיר</button>
                  </div>
                </div>
              )}
              {!editMode && (
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setOpenId(null); setSelected(null); setSearchParams({}); }}>סגור</button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
    {adminModalOpen && (
      <div className={styles.modalOverlay} onClick={() => setAdminModalOpen(false)}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>הוסף מתכון</h3>
            <button className={styles.closeBtn} onClick={() => setAdminModalOpen(false)}>×</button>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.rtl} style={{ display:'grid', gap:10 }}>
              <label>שם
                <input className={styles.search} value={adminForm.name} onChange={e=>setAdminForm(f=>({...f, name: e.target.value}))} />
                {errors.name && <div style={{ color:'#b91c1c', fontSize:12 }}>{errors.name}</div>}
              </label>
              <label>תיאור
                <textarea className={styles.textarea} value={adminForm.description} onChange={e=>setAdminForm(f=>({...f, description: e.target.value}))} />
              </label>
              <label>הוראות הכנה
                <textarea className={styles.textarea} value={adminForm.instructions} onChange={e=>setAdminForm(f=>({...f, instructions: e.target.value}))} />
              </label>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <label>תמונה (אופציונלי)
                  <input type="file" accept="image/*" onChange={async (e)=>{
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    try {
                      setImgUploading(true);
                      const fd = new FormData();
                      fd.append('image', file);
                      const resp = await fetch('/api/admin/recipes/upload-image', { method:'POST', credentials:'include', body: fd });
                      if (!resp.ok) { const j = await resp.json().catch(()=>({})); throw new Error(j?.message || 'העלאת תמונה נכשלה'); }
                      const data = await resp.json();
                      setAdminForm(f => ({ ...f, picture: data?.path || '' }));
                    } catch (er) {
                      showToast(er.message || 'העלאת תמונה נכשלה');
                    } finally {
                      setImgUploading(false);
                    }
                  }} />
                </label>
                {imgUploading && <span style={{ alignSelf:'center', color:'#6b7280' }}>מעלה...</span>}
                {adminForm.picture && (
                  <img src={`/${adminForm.picture}`} alt="preview" style={{ height:48, borderRadius:6, border:'1px solid #e5e7eb' }} />
                )}
              </div>
              <div>
                <label>מרכיבים</label>
                <div style={{ display:'flex', gap:6, marginTop:4 }}>
                  <input className={styles.search} placeholder="הוספת מרכיב" value={adminIngInput} onChange={e=>setAdminIngInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); if(adminIngInput.trim()){ setAdminIngredients(a=>[...a, adminIngInput.trim()]); setAdminIngInput(''); } } }} />
                  <button type="button" className={styles.btn} onClick={()=>{ if(adminIngInput.trim()){ setAdminIngredients(a=>[...a, adminIngInput.trim()]); setAdminIngInput(''); } }}>הוסף</button>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                  {adminIngredients.map((ing, idx)=>(
                    <span key={idx} style={{ background:'#eef0f3', padding:'4px 8px', borderRadius:9999 }}>
                      {ing}
                      <button type="button" onClick={()=>setAdminIngredients(arr=>arr.filter((_,i)=>i!==idx))} style={{ border:'none', background:'transparent', marginInlineStart:6, cursor:'pointer' }}>×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <label>סוג דיאטה
                  <select className={styles.select} value={adminForm.diet_type_id} onChange={e=>setAdminForm(f=>({...f, diet_type_id: e.target.value}))}>
                    <option value="">בחר</option>
                    {dietTypeList.map(dt => (
                      <option key={dt.diet_id||dt.id} value={dt.diet_id||dt.id}>{dt.name}</option>
                    ))}
                  </select>
                  {errors.diet_type_id && <div style={{ color:'#b91c1c', fontSize:12 }}>{errors.diet_type_id}</div>}
                </label>
                <label>קטגוריה
                  <select className={styles.select} value={adminForm.category_id} onChange={e=>setAdminForm(f=>({...f, category_id: e.target.value}))}>
                    <option value="">בחר</option>
                    {categoryList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.category_id && <div style={{ color:'#b91c1c', fontSize:12 }}>{errors.category_id}</div>}
                </label>
                <label>מחיר
                  <input className={styles.search} inputMode="decimal" value={adminForm.price} onChange={e=>setAdminForm(f=>({...f, price: e.target.value.replace(/[^0-9.]/g,'')}))} />
                  {errors.price && <div style={{ color:'#b91c1c', fontSize:12 }}>{errors.price}</div>}
                </label>
                <label>קלוריות
                  <input className={styles.search} inputMode="numeric" value={adminForm.calories} onChange={e=>setAdminForm(f=>({...f, calories: e.target.value.replace(/[^0-9]/g,'')}))} />
                </label>
                <label>מנות
                  <input className={styles.search} inputMode="numeric" value={adminForm.servings} onChange={e=>setAdminForm(f=>({...f, servings: e.target.value.replace(/[^0-9]/g,'')}))} />
                </label>
                <label>מלאי התחלתי
                  <input className={styles.search} inputMode="numeric" value={adminForm.stock} onChange={e=>setAdminForm(f=>({...f, stock: e.target.value.replace(/[^0-9]/g,'')}))} />
                </label>
              </div>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button className={styles.btn} onClick={async ()=>{
              try{
                setSubmitting(true);
                // validations
                const errs = {};
                if (!adminForm.name.trim()) errs.name = 'נדרש שם';
                if (!adminForm.price || isNaN(Number(adminForm.price))) errs.price = 'נדרש מחיר תקין';
                if (!adminForm.diet_type_id) errs.diet_type_id = 'בחר סוג דיאטה';
                if (!adminForm.category_id) errs.category_id = 'בחר קטגוריה';
                setErrors(errs);
                if (Object.keys(errs).length) { setSubmitting(false); showToast('יש למלא את כל השדות הנדרשים'); return; }
                const body = {
                  name: adminForm.name,
                  description: adminForm.description,
                  instructions: adminForm.instructions,
                  diet_type_id: adminForm.diet_type_id || null,
                  category_id: adminForm.category_id || null,
                  price: adminForm.price ? Number(adminForm.price) : null,
                  ingredients: adminIngredients,
                  calories: adminForm.calories ? Number(adminForm.calories) : null,
                  servings: adminForm.servings ? Number(adminForm.servings) : null,
                  picture: adminForm.picture || '',
                  stock: adminForm.stock ? Number(adminForm.stock) : 0,
                };
                const resp = await fetch('/api/admin/recipes/full_create', {
                  method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
                });
                if(!resp.ok){ const j = await resp.json().catch(()=>({})); throw new Error(j?.message || 'שגיאה ביצירה'); }
                // refresh recipes list
                const fresh = await fetchPublicRecipes();
                setRecipes(Array.isArray(fresh?.items) ? fresh.items : (Array.isArray(fresh) ? fresh : []));
                setAdminModalOpen(false);
                setAdminForm({ name:'', description:'', instructions:'', diet_type_id:'', category_id:'', price:'', calories:'', servings:'', picture:'', stock:'' });
                setAdminIngredients([]);
                setErrors({});
                showToast('נוצר בהצלחה');
              }catch(e){
                console.error(e);
                showToast(e.message || 'שגיאה ביצירה');
              } finally { setSubmitting(false); }
            }} disabled={submitting}>
              {submitting ? 'שומר…' : 'שמור'}
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={()=>setAdminModalOpen(false)}>בטל</button>
          </div>
        </div>
      </div>
    )}
    {toast && (
      <div style={{ position:'fixed', bottom:16, insetInlineEnd:16, background:'#111827', color:'#fff', padding:'10px 14px', borderRadius:8, boxShadow:'0 6px 12px rgba(0,0,0,0.2)', zIndex:1000 }}>
        {toast}
      </div>
    )}
    </>
  )
}