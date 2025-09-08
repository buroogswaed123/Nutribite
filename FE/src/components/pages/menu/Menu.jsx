import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './menu.module.css'
import { fetchDietTypes, fetchRecipes, getSessionUser, bulkUpdateRecipePrices, fetchMenuCategoriesAPI } from '../../../utils/functions'

export default function Menu() {
  const navigate = useNavigate()

  // Normalize image URLs coming from DB (filename or uploads path)
  const resolveImageUrl = (raw) => {
    if (!raw) return ''
    let s = String(raw).trim()
    if (!s) return ''
    if (/^https?:\/\//i.test(s)) return s
    // normalize slashes
    s = s.replace(/\\/g, '/').replace(/\s+$/,'')
    // If path contains 'uploads' anywhere, point to backend uploads after the last occurrence
    const idx = s.toLowerCase().lastIndexOf('uploads/')
    if (idx >= 0) {
      const tail = s.slice(idx)
      return `http://localhost:3000/${tail}`
    }
    // otherwise treat as a filename living under backend /uploads
    s = s.replace(/^\/+/, '')
    return `http://localhost:3000/uploads/${s}`
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
  const [dietTypes, setDietTypes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [dietId, setDietId] = useState('all')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [calMin, setCalMin] = useState('')
  const [calMax, setCalMax] = useState('')

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
      } catch (e) {
        if (!cancelled) setError(e.message || 'שגיאה בטעינה')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    initial()
    return () => { cancelled = true }
  }, [])

  // Load recipes when filters/search change
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError('')
        const items = await fetchRecipes({
          search,
          categoryId,
          dietId,
          minPrice: priceMin,
          maxPrice: priceMax,
          minCalories: calMin,
          maxCalories: calMax,
        })
        if (cancelled) return
        setRecipes(items)
      } catch (e) {
        if (!cancelled) setError(e.message || 'שגיאה בטעינת מתכונים')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [search, categoryId, dietId, priceMin, priceMax, calMin, calMax])

  const filtered = useMemo(() => {
    // If server filtered, keep client filter as safety
    const q = search.trim().toLowerCase()
    return recipes.filter(r => {
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
  }, [recipes, search, categoryId, dietId, isAdmin, stockMin, stockMax])

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
  const onBuyNow = (recipe) => {
    // Placeholder
    alert(`Buy now: ${recipe?.name}`)
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
      const items = await fetchRecipes({ search, categoryId, dietId })
      setRecipes(items)
      setSelectedIds(new Set())
      setSelectAll(false)
      setBulkPrice('')
      alert('עודכנו מחירים בהצלחה')
    } catch (e) {
      alert(e.message || 'שגיאה בעדכון מחירים')
    }
  }

  return (
    <div className={styles.menu}>
      {error && <div style={{color:'#b91c1c', marginBottom: 8}}>{error}</div>}
      {loading && <div style={{marginBottom: 8}}>טוען מתכונים...</div>}

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
          <button className={styles.btn} style={{marginInlineStart:'auto'}} onClick={() => { setSearch(''); setCategoryId('all'); setDietId('all'); setPriceMin(''); setPriceMax(''); setCalMin(''); setCalMax(''); }}>נקה סינון</button>
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
        {filtered.map(r => (
          <div key={r.recipe_id} onClick={() => openModal(r)} style={{cursor:'pointer', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            <img src={resolveImageUrl(r.picture || r.imageUrl)} alt={r.name} style={{width:'100%', height:150, objectFit:'cover'}} onError={(e)=>{ try{ console.error('Image failed to load:', resolveImageUrl(r.picture || r.imageUrl)); }catch(_){} e.currentTarget.style.display='none' }} />
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
              <h3 style={{margin:'0 0 6px 0', fontSize:16}}>{r.name}</h3>
              <p style={{margin:'0 0 8px 0', color:'#6b7280', fontSize:14}}>{r.description}</p>
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
        ))}
        {filtered.length === 0 && (
          <div className={styles.emptyBox}>לא נמצאו מתכונים תואמים</div>
        )}
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
                      <button className={styles.btn} onClick={() => onBuyNow(selected)}>קנה עכשיו</button>
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
    </div>
  )
}
