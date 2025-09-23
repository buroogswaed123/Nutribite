import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown, Star } from 'lucide-react'
import styles from './menu.module.css'
import { fetchDietTypes, /*fetchRecipesPaged,*/ getSessionUser, bulkUpdateRecipePrices, fetchMenuCategoriesAPI, addToCartAPI, getProductByRecipeAPI, fetchTopRatedRecipesAPI } from '../../../utils/functions'

export default function Menu() {
  const navigate = useNavigate()
  const [toast, setToast] = useState(null) // { type: 'success'|'error', text: string }

  // Normalize image URLs coming from DB (filename or uploads path)
  const resolveImageUrl = (raw) => {
    if (!raw) return ''
    let s = String(raw).trim()
    if (!s) return ''
    // if the string already contains an uploads/ path, slice from there and prefix with backend base path
    const idx = s.toLowerCase().lastIndexOf('uploads/')
    if (idx >= 0) {
      const tail = s.slice(idx)
      return `/${tail}`
    }

 

    // otherwise treat as a filename living under backend /uploads
    s = s.replace(/^\/+/, '')
    return `/uploads/${s}`
  }

  // Allow only digit characters in numeric text inputs
  const onlyDigits = (v) => {
    const s = String(v ?? '')
    return s.replace(/[^0-9]/g, '')
  }

  // Allow digits and a single decimal point (for prices)
  const onlyDecimal = (v) => {
    let s = String(v ?? '')
    // keep only digits and dots
    s = s.replace(/[^0-9.]/g, '')
    // collapse multiple dots to a single dot (keep the first)
    if (s.indexOf('.') !== -1) {
      const [head, ...rest] = s.split('.')
      s = head + '.' + rest.join('').replace(/\./g, '')
    }
    // normalize leading dot to 0.
    if (s.startsWith('.')) s = '0' + s
    return s
  }

   // Macro display helper for modal: returns string like "X גרם · Y קק\"ל · Z%"
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
  
  const mostPopular = () => {
    const popular = recipes.filter(r => topRatedSet.has(Number(r.id)))
    return popular;
    
  }
  //add icon to top 5 popular 
  const topRatedIcon = (recipe) => {
    if (topRatedSet.has(Number(recipe.id))) return <span className="material-symbols-outlined">star</span>
    return ''
  }

  // Map known English category names to Hebrew for display
  const translateCategoryName = (name) => {
    if (!name) return ''
    const key = String(name).trim().toLowerCase()
    const map = {
      breakfast: 'ארוחת בוקר',
      lunch: 'ארוחת צהריים',
      dinner: 'ארוחת ערב',
      dessert: 'קינוחים',
      drinks: 'משקאות',
      snack: 'חטיפים',
    }
  
    const hebrewRegex = /[\u0590-\u05FF]/
    if (hebrewRegex.test(name)) return name
    return map[key] || name
  }

  const [recipes, setRecipes] = useState([])
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [dietTypes, setDietTypes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  // Popular filter state and top-rated sets
  const [popularOnly, setPopularOnly] = useState(false)
  // Global top-5 (kept for future use), and per-category top-5 (used for badge)
  const [topRatedSet, setTopRatedSet] = useState(new Set())
  // Random order map (stable during a session)
  const [randomOrder, setRandomOrder] = useState(new Map())

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [dietId, setDietId] = useState('all')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [calMin, setCalMin] = useState('')
  const [calMax, setCalMax] = useState('')
  // Macros filters
  const [protMin, setProtMin] = useState('')
  const [protMax, setProtMax] = useState('')
  const [carbMin, setCarbMin] = useState('')
  const [carbMax, setCarbMax] = useState('')
  const [fatMin, setFatMin] = useState('')
  const [fatMax, setFatMax] = useState('')
  const [showMacros, setShowMacros] = useState(false)

  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  // Admin-only controls
  const [stockMin, setStockMin] = useState('')
  const [stockMax, setStockMax] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [bulkPrice, setBulkPrice] = useState('')

  // Load user/admin, diet types, and categories list
  useEffect(() => {
    let cancelled = false
    async function initial() {
      try {
        setLoading(true)
        setError('')
        const [user, diets, cats] = await Promise.all([
          getSessionUser(),
          fetchDietTypes(),
          fetchMenuCategoriesAPI().catch(() => []),
        ])
        if (cancelled) return
        setIsAdmin(!!user && String(user.user_type).toLowerCase() === 'admin')
        setDietTypes(diets)
        // Use categories from BE so filter shows all categories, not only those currently in view
        const mappedCats = Array.isArray(cats) ? cats.map(c => ({ id: c.id, name: translateCategoryName(c.name) })) : []
        setCategories(mappedCats)
        // Fetch top-5 rated recipe ids for badge (fallback handled inside helper)
        try {
          const top = await fetchTopRatedRecipesAPI(5)
          const ids = Array.isArray(top) ? top.map(it => Number(it.id || it.recipe_id)).filter(Number.isFinite) : []
          setTopRatedSet(new Set(ids))
        } catch (_) {}
        // Fetch full menu items list (includes price/stock) for proper mixing
        try {
          const r = await fetch('/api/menu?limit=1000', { credentials: 'include' })
          const j = await r.json().catch(()=>({}))
          const items = Array.isArray(j?.items) ? j.items : (Array.isArray(j) ? j : [])
          if (!cancelled) setRecipes(items)
        } catch (e) {
          if (!cancelled) setError(e.message || 'שגיאה בטעינת מתכונים')
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'שגיאה בטעינה')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    initial()
    return () => { cancelled = true }
  }, [])

  // Fallback: if topRatedSet failed to load, derive top-5 from current recipes by rating_avg
  useEffect(() => {
    try {
      if (topRatedSet && topRatedSet.size > 0) return;
      if (!Array.isArray(recipes) || recipes.length === 0) return;
      const byRating = [...recipes]
        .filter(r => r && r.rating_avg != null)
        .sort((a,b) => Number(b.rating_avg||0) - Number(a.rating_avg||0))
        .slice(0, 5)
        .map(r => Number(r.recipe_id || r.id))
        .filter(n => Number.isFinite(n));
      if (byRating.length > 0) {
        setTopRatedSet(new Set(byRating));
      }
    } catch (_) { /* ignore */ }
  }, [recipes, topRatedSet])

  // Build a stable random order for all recipe ids (for default mixed ordering)
  useEffect(() => {
    if (!Array.isArray(recipes) || recipes.length === 0) return;
    const STORAGE_KEY = 'menuRandomOrderV1';
    // Load existing mapping from localStorage
    let stored = new Map();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
          stored = new Map(Object.entries(obj).map(([k,v]) => [Number(k), Number(v)]));
        }
      }
    } catch (_) {}

    // Merge with current state to avoid flicker within same session render
    const next = new Map(randomOrder.size ? randomOrder : stored);
    // Ensure every recipe has a random value
    for (const r of recipes) {
      const id = Number(r.recipe_id || r.id);
      if (!Number.isFinite(id)) continue;
      if (!next.has(id)) next.set(id, Math.random());
    }
    // Prune removed recipe ids
    for (const key of Array.from(next.keys())) {
      if (!recipes.some(r => Number(r.recipe_id || r.id) === key)) next.delete(key);
    }
    // Save back to localStorage
    try {
      const plain = Object.fromEntries(Array.from(next.entries()).map(([k,v]) => [String(k), v]));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
    } catch (_) {}
    // Update state only if changed size (cheap heuristic)
    if (next.size !== randomOrder.size) {
      setRandomOrder(next);
    }
  }, [recipes])

  // Compute top-5 ids per category for the badge
  const topPerCategorySet = useMemo(() => {
    const out = new Set();
    try {
      const byCat = new Map(); // category_id -> array of items
      for (const r of recipes) {
        const catId = Number(r.category_id);
        if (!Number.isFinite(catId)) continue;
        if (!byCat.has(catId)) byCat.set(catId, []);
        byCat.get(catId).push(r);
      }
      for (const [catId, arr] of byCat.entries()) {
        arr
          .slice()
          .sort((a,b) => Number(b.rating_avg||0) - Number(a.rating_avg||0))
          .slice(0, 5)
          .forEach(r => {
            const id = Number(r.recipe_id || r.id);
            if (Number.isFinite(id)) out.add(id);
          });
      }
    } catch (_) { /* ignore */ }
    return out;
  }, [recipes])

  const filtered = useMemo(() => {
    // If server filtered, keep client filter as safety
    const q = search.trim().toLowerCase()
    let arr = recipes.filter(r => {
      const matchesSearch = q ? [r.name, r.description].filter(Boolean).some(t => t.toLowerCase().includes(q)) : true
      const matchesCategory = categoryId === 'all' ? true : Number(r.category_id) === Number(categoryId)
      const matchesDiet = dietId === 'all' ? true : Number(r.diet_type_id) === Number(dietId)
      // Admin stock bounds (client-side)
      let matchesStock = true
      if (isAdmin) {
        const stk = r.stock != null ? Number(r.stock) : null
        const minOk = stockMin === '' || (stk != null && stk >= Number(stockMin))
        const maxOk = stockMax === '' || (stk != null && stk <= Number(stockMax))
        matchesStock = minOk && maxOk
      }
      return matchesSearch && matchesCategory && matchesDiet && matchesStock
    })
    if (popularOnly) {
      // Sort entire list by rating (popularity) descending
      arr = [...arr].sort((a,b) => (Number(b.rating_avg||0) - Number(a.rating_avg||0)));
    } else {
      // Default: Interleave categories round-robin with deterministic ordering
      const byCat = new Map(); // catId -> array of items
      for (const item of arr) {
        const cid = Number(item.category_id);
        if (!byCat.has(cid)) byCat.set(cid, []);
        byCat.get(cid).push(item);
      }
      // Sort categories deterministically (by numeric id)
      const catIds = Array.from(byCat.keys()).sort((a,b) => (a||0) - (b||0));
      // Sort each category by the persisted randomOrder for stability
      const queues = catIds.map(cid => {
        const list = byCat.get(cid).slice();
        list.sort((a,b) => {
          const aId = Number(a.recipe_id || a.id);
          const bId = Number(b.recipe_id || b.id);
          const av = randomOrder.get(aId) ?? 0;
          const bv = randomOrder.get(bId) ?? 0;
          return av - bv;
        });
        return list;
      });
      // Round-robin interleave across categories to ensure representation
      const mixed = [];
      let added = true;
      while (added) {
        added = false;
        for (const q of queues) {
          if (q && q.length) {
            mixed.push(q.shift());
            added = true;
          }
        }
      }
      arr = mixed;
    }
    return arr
  }, [recipes, search, categoryId, dietId, isAdmin, stockMin, stockMax, randomOrder, popularOnly])

  // Keep select-all checkbox in sync with selection size
  useEffect(() => {
    if (!isAdmin) return
    const allSelected = filtered.length > 0 && selectedIds.size === filtered.length
    setSelectAll(allSelected)
  }, [selectedIds, filtered, isAdmin])

  const openModal = (recipe) => {
    setSelected(recipe)
    setShowModal(true)
  }
  const closeModal = () => {
    setShowModal(false)
    setSelected(null)
  }

  const onViewRecipe = (recipe) => {
    const slug = String(recipe?.name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0590-\u05FF\s-]/g, '')
      .replace(/\s+/g, '-');
    const id = recipe?.recipe_id || recipe?.id
    // Redirect to Recipes with query params so it opens the modal
    navigate(`/recipes?recipeId=${id}&slug=${slug}`)
  }

  // Admin action handlers (stubs)
  const onEdit = (recipe) => {
    alert(`Edit recipe ${recipe?.recipe_id} - to be implemented`)
  }
  const onDelete = (recipe) => {
    alert(`Delete recipe ${recipe?.recipe_id} - to be implemented`)
  }
  const onChangePrice = (recipe) => {
    alert(`Change price for recipe ${recipe?.recipe_id} - to be implemented`)
  }
  const onAddToCart = async (recipe) => {
    try {
      const rid = recipe?.recipe_id || recipe?.id;
      if (!rid) throw new Error('מזהה מתכון חסר');
      const product = await getProductByRecipeAPI(rid);
      const pid = product?.product_id;
      const pStock = Number(product?.stock ?? 0);
      if (!pid) throw new Error('לא ניתן לאתר מוצר עבור מתכון זה');
      if (!(pStock > 0)) {
        setToast({ type: 'error', text: 'המוצר הזה לא זמיו' });
        return;
      }
      await addToCartAPI(pid, 1);
      setToast({ type: 'success', text: 'נוסף לעגלה' });
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'שגיאה בהוספה לעגלה';
      // Normalize common out-of-stock wording
      if (/out of stock|stock/i.test(String(msg))) {
        setToast({ type: 'error', text: 'המוצר הזה לא זמיו' });
      } else {
        setToast({ type: 'error', text: msg });
      }
    }
  }

  // Selection handlers (admin)
  const toggleSelect = (id, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id); else next.delete(id)
      return next
    })
  }
  const toggleSelectAll = (checked) => {
    setSelectAll(checked)
    if (checked) {
      setSelectedIds(new Set(filtered.map(r => r.recipe_id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const onBulkPriceUpdate = async () => {
    try {
      if (!isAdmin) return
      const ids = Array.from(selectedIds)
      await bulkUpdateRecipePrices({ recipeIds: ids, newPrice: bulkPrice })
      // reload recipes
      try {
        const r = await fetch('http://localhost:3000/api/menu?limit=1000', { credentials: 'include' })
        const j = await r.json().catch(()=>({}))
        const items = Array.isArray(j?.items) ? j.items : []
        setRecipes(items)
        setTotal(items.length)
      } catch (_) {}
      setSelectedIds(new Set())
      setSelectAll(false)
      setBulkPrice('')
      alert('עודכנו מחירים בהצלחה')
    } catch (e) {
      alert(e.message || 'שגיאה בעדכון מחירים')
    }
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <div className={styles.menu}>
      {error && <div style={{color:'#b91c1c', marginBottom: 8}}>{error}</div>}
      {loading && <div style={{marginBottom: 8}}>טוען מתכונים...</div>}
      {/* toast renderer moved to bottom */}

      <div className={styles.group}>
        <div className={styles.row}>
          <span className={styles.groupItem} style={{flex: '0 0 auto'}}>
            <input
              type="text"
              placeholder="חיפוש בשם..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.compact}
              style={{width: 220}}
            />
          </span>
          <span className={styles.divider} />
          <span className={styles.groupItem}>
            <label>קלוריות</label>
            <input className={`${styles.num} ${styles.compact}`} type="number" value={calMin} onChange={(e)=>setCalMin(onlyDigits(e.target.value))} placeholder="מ-" />
            <span>-</span>
            <input className={`${styles.num} ${styles.compact}`} type="number" value={calMax} onChange={(e)=>setCalMax(onlyDigits(e.target.value))} placeholder="עד" />
          </span>
          <span className={styles.divider} />
          <span className={styles.groupItem}>
            <label>מחיר</label>
            <input className={`${styles.num} ${styles.compact}`} type="number" value={priceMin} onChange={(e)=>setPriceMin(onlyDecimal(e.target.value))} placeholder="מ-" />
            <span>-</span>
            <input className={`${styles.num} ${styles.compact}`} type="number" value={priceMax} onChange={(e)=>setPriceMax(onlyDecimal(e.target.value))} placeholder="עד" />
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.groupItem}>
            <label>קטגוריה</label>
            <select className={styles.compact} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="all">הכל</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </span>
          <span className={styles.groupItem}>
            <label>דיאטה</label>
            <select className={styles.compact} value={dietId} onChange={(e) => setDietId(e.target.value)}>
              <option value="all">הכל</option>
              {dietTypes.map(dt => (
                <option key={dt.diet_id || dt.id} value={dt.diet_id || dt.id}>{dt.name}</option>
              ))}
            </select>
          </span>
          <button className={styles.btn} style={{marginInlineStart:'auto'}} onClick={() => { setSearch(''); setCategoryId('all'); setDietId('all'); setPriceMin(''); setPriceMax(''); setCalMin(''); setCalMax(''); setProtMin(''); setProtMax(''); setCarbMin(''); setCarbMax(''); setFatMin(''); setFatMax(''); setPage(1); }}>נקה סינון</button>
        </div>
        {/* Nutritional values toggle */}
        <div className={styles.row}>
          <button className={styles.btn} onClick={() => setShowMacros(v=>!v)}>ערכים תזונתיים</button>
          {/* Popular sort icon (two bars) */}
          <button
            type="button"
            className={`${styles.filterIconBtn} ${popularOnly ? 'active' : ''}`}
            onClick={() => setPopularOnly(v=>!v)}
            title="סינון לפי פופולריות"
            aria-pressed={popularOnly}
            aria-label="סדר לפי פופולריות"
          >
            <ArrowUpDown size={16} />
          </button>
          {showMacros && (
            <div className={styles.group} style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <span className={styles.groupItem}>
                <label>חלבון (גרם)</label>
                <input className={`${styles.num} ${styles.compact}`} type="number" value={protMin} onChange={(e)=>setProtMin(onlyDigits(e.target.value))} placeholder="מ-" />
                <span>-</span>
                <input className={`${styles.num} ${styles.compact}`} type="number" value={protMax} onChange={(e)=>setProtMax(onlyDigits(e.target.value))} placeholder="עד" />
              </span>
              <span className={styles.groupItem}>
                <label>פחמימות (גרם)</label>
                <input className={`${styles.num} ${styles.compact}`} type="number" value={carbMin} onChange={(e)=>setCarbMin(onlyDigits(e.target.value))} placeholder="מ-" />
                <span>-</span>
                <input className={`${styles.num} ${styles.compact}`} type="number" value={carbMax} onChange={(e)=>setCarbMax(onlyDigits(e.target.value))} placeholder="עד" />
              </span>
              <span className={styles.groupItem}>
                <label>שומנים (גרם)</label>
                <input className={`${styles.num} ${styles.compact}`} type="number" value={fatMin} onChange={(e)=>setFatMin(onlyDigits(e.target.value))} placeholder="מ-" />
                <span>-</span>
                <input className={`${styles.num} ${styles.compact}`} type="number" value={fatMax} onChange={(e)=>setFatMax(onlyDigits(e.target.value))} placeholder="עד" />
              </span>
            </div>
          )}
        </div>

        {isAdmin && (
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <label>מלאי מ-</label>
            <input type="number" value={stockMin} onChange={(e)=>setStockMin(onlyDigits(e.target.value))} style={{width:80}}/>
            <label>עד</label>
            <input type="number" value={stockMax} onChange={(e)=>setStockMax(onlyDigits(e.target.value))} style={{width:80}}/>
          </div>
        )}
      </div>

      {isAdmin && (
        <div style={{display:'flex', alignItems:'center', gap:12, margin:'8px 0'}}>
          <label style={{display:'flex', alignItems:'center', gap:6}}>
            <input type="checkbox" checked={selectAll} onChange={(e)=>toggleSelectAll(e.target.checked)} />
            סימון הכל (בסינון הנוכחי)
          </label>
          <span>נבחרו: {selectedIds.size}</span>
          <input type="number" placeholder="מחיר חדש ₪" value={bulkPrice} onChange={(e)=>setBulkPrice(onlyDecimal(e.target.value))} style={{width:120}}/>
          <button className={styles.btn}
            disabled={selectedIds.size === 0 || !bulkPrice}
            onClick={onBulkPriceUpdate}
          >עדכן מחירים</button>
        </div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:16}}>
        {filtered.map((r, idx) => {
          // If stock is missing (not provided by /api/recipes), assume available; only block when explicitly 0 or negative
          const out = (r.stock == null) ? false : !(Number(r.stock) > 0);
          const handleCardClick = () => {
            if (out) { setToast({ type: 'error', text: 'המוצר הזה לא זמין' }); return; }
            openModal(r);
          };
          const isTop = topPerCategorySet.has(Number(r.recipe_id || r.id))
          return (
          <div key={r.recipe_id} onClick={handleCardClick} style={{
            cursor: out ? 'not-allowed' : 'pointer',
            opacity: out ? 0.5 : 1,
            background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div className={styles.cardImageWrap}>
              {isTop && (
                <span className={styles.popularBadge} title="פופולרי">
                  <Star size={12} color="#fff" fill="#fff" />
                  פופולרי
                </span>
              )}
              {(() => {
                const imgUrl = resolveImageUrl(r.picture || r.imageUrl);
                if (!imgUrl) {
                  return (
                    <div style={{width:'100%', height:150, background:'#f1f5f9'}} />
                  );
                }
                return (
                  <img
                    src={imgUrl}
                    alt={r.name}
                    loading={idx < 6 ? 'eager' : 'lazy'}
                    fetchpriority={idx < 6 ? 'high' : 'auto'}
                    decoding="async"
                    width="220"
                    height="150"
                    style={{width:'100%', height:150, objectFit:'cover'}}
                    onError={(e)=>{ try{ console.error('Image failed to load:', imgUrl); }catch(_){} e.currentTarget.style.display='none' }}
                  />
                );
              })()}
            </div>
            <div style={{padding:12, position:'relative'}}>
              {isAdmin && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.recipe_id)}
                  onChange={(e)=>{ e.stopPropagation(); toggleSelect(r.recipe_id, e.target.checked) }}
                  style={{position:'absolute', top:8, insetInlineEnd:8}}
                  onClick={(e)=>e.stopPropagation()}
                />
              )}
              <h3 style={{margin:0, marginBottom:6, fontSize:16}}>{r.name}</h3>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontWeight:700, color:'#111827' }}>
                  {Number.isFinite(Number(r.price)) ? `₪ ${Number(r.price).toFixed(2)}` : ''}
                </span>
                <span style={{ color:'#6b7280', fontSize:12 }}>
                  {r.calories != null ? `${r.calories} קלוריות` : ''}
                </span>
              </div>
              {r.description && (
                <p style={{ margin:0, color:'#4b5563', fontSize:13, lineHeight:1.35 }}>
                  {String(r.description).length > 100 ? `${String(r.description).slice(0,100)}…` : String(r.description)}
                </p>
              )}
              {/* Read-only rating */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                  {[1,2,3,4,5].map(n => {
                    const avg = Number(r.rating_avg ?? 0)
                    const active = Math.round(avg) >= n
                    return (
                      <span key={n} style={{ color: active ? '#f59e0b' : '#d1d5db', fontSize:16 }}>★</span>
                    )
                  })}
                </div>
                <span style={{ color:'#6b7280', fontSize:12 }}>
                  {r.rating_avg != null ? Number(r.rating_avg).toFixed(1) : '—'}
                </span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span className={styles.calories}>{r.calories} קלוריות</span>
              </div>
            </div>
          </div>
          )
        })}
        {filtered.length === 0 && (
          <div className={styles.emptyBox}>לא נמצאו מתכונים תואמים</div>
        )}
      </div>

      {/* Bottom-centered pagination */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:16 }}>
        {(() => {
          const totalPages = Math.max(1, Math.ceil((Number(total)||0) / limit));
          return (
            <>
              {/* Left chevron navigates forward (next) in RTL */}
              <button className={styles.btn} disabled={page >= totalPages} onClick={() => setPage(p=>p+1)}>{'<'}</button>
              <span style={{ color:'#6b7280' }}>עמוד {page} מתוך {totalPages}</span>
              {/* Right chevron navigates backward (prev) in RTL */}
              <button className={styles.btn} disabled={page <= 1} onClick={() => setPage(p=>Math.max(1, p-1))}>{'>'}</button>
            </>
          )
        })()}
      </div>

      {showModal && selected && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            transition: 'opacity 200ms ease'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={styles.rtl}
            style={{ background: '#fff', borderRadius: 8, maxWidth: 720, width: '95%', padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}
          >
            <div className={styles.detail}>
              <img
                src={resolveImageUrl(selected.picture || selected.imageUrl)}
                alt={selected.name}
                decoding="async"
                width="720"
                height="360"
                className={styles.detailImg}
                onError={(e)=>{ try{ console.error('Image failed to load (detail):', resolveImageUrl(selected.picture || selected.imageUrl)); }catch(_){} e.currentTarget.style.display='none' }}
              />
              <div className={styles.detailBody}>
                <h2 className={styles.title}>{selected.name}</h2>
                <div className={styles.metaRow}>
                  <span>קלוריות: {selected.calories}</span>
                  {selected.diet_name && <span>דיאטה: {selected.diet_name}</span>}
                  {selected.category_name && <span>קטגוריה: {selected.category_name}</span>}
                </div>
                {/* Macro amounts with colored dots */}
                <ul className={styles.macroList}>
                  <li className={styles.macroRow}>
                    <span className={`${styles.macroDot} ${styles.protein}`} />
                    <span>חלבון: <strong>{macroLine(selected.protein_g, 4, Number(selected.calories))}</strong></span>
                  </li>
                  <li className={styles.macroRow}>
                    <span className={`${styles.macroDot} ${styles.carb}`} />
                    <span>פחמימות: <strong>{macroLine(selected.carbs_g, 4, Number(selected.calories))}</strong></span>
                  </li>
                  <li className={styles.macroRow}>
                    <span className={`${styles.macroDot} ${styles.fat}`} />
                    <span>שומנים: <strong>{macroLine(selected.fats_g, 9, Number(selected.calories))}</strong></span>
                  </li>
                </ul>
                {/* Read-only rating in modal */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    {[1,2,3,4,5].map(n => {
                      const avg = Number(selected.rating_avg ?? 0)
                      const active = Math.round(avg) >= n
                      return (
                        <span key={n} style={{ color: active ? '#f59e0b' : '#d1d5db', fontSize:18 }}>★</span>
                      )
                    })}
                  </div>
                  <span style={{ color:'#6b7280', fontSize:13 }}>
                    {selected.rating_avg != null ? Number(selected.rating_avg).toFixed(1) : '—'}
                  </span>
                </div>
                <div>מחיר: {selected.price != null ? `${selected.price}₪` : '—'}</div>
                {isAdmin && (
                  <div>מלאי: {selected.stock != null ? selected.stock : '—'}</div>
                )}
                <p style={{whiteSpace:'pre-wrap'}}>{selected.description}</p>
                <div className={styles.actions} style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                  {isAdmin ? (
                    <>
                      <button className={styles.btn} onClick={() => onEdit(selected)}>ערוך</button>
                      <button className={styles.btn} onClick={() => onDelete(selected)}>מחק</button>
                      <button className={styles.btn} onClick={() => onChangePrice(selected)}>שנה מחיר</button>
                      <button className={styles.btn} onClick={() => onViewRecipe(selected)}>הצג מתכון</button>
                    </>
                  ) : (
                    <>
                      <button className={styles.btn} disabled={!(Number(selected?.stock ?? 0) > 0)} onClick={() => {
                        if (!(Number(selected?.stock ?? 0) > 0)) { setToast({ type:'error', text:'המוצר הזה לא זמיו' }); return; }
                        onAddToCart(selected);
                      }}>הוסף לעגלה</button>
                      <button className={styles.btn} onClick={() => onViewRecipe(selected)}>הצג מתכון</button>
                    </>
                  )}
                  <button className={styles.btn} onClick={closeModal}>סגור</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightweight toast */}
      {toast && (
        <div
          role="status"
          style={{
            position:'fixed', top:16, right:16, zIndex: 2000,
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            color:'#fff', padding:'10px 14px', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.15)'
          }}
          onAnimationEnd={()=>{}}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
