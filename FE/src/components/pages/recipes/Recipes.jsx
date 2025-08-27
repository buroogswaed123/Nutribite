import styles from './recipes.module.css'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'

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
  }, [fetchPublicRecipes]);

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
    const rid = searchParams.get('recipeId');
    if (!rid) return;
    (async () => {
      setOpenId(rid);
      setSelected(null);
      setLoadingItem(true);
      try {
        const full = await fetchPublicRecipe(rid);
        setSelected(full?.item || full);
      } catch (e) {
        setSelected(null);
      } finally {
        setLoadingItem(false);
      }
    })();
  }, [searchParams, fetchPublicRecipe]);

  if (loading) return <div className={styles.pad16}>טוען...</div>;
  if (error) return <div className={`${styles.pad16} ${styles.errorText}`}>{error}</div>;

  return (
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
            <div className={styles.modalBody}>
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
                            <ul className={styles.columnsList}>
                              {ingredientsArr.map((ing, idx) => (
                                <li key={idx}>{ing}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {steps.length > 0 && (
                          <div className={styles.section}>
                            <h4 className={styles.sectionTitle}>הוראות הכנה</h4>
                            <ol className={styles.columnsList}>
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
  )
}