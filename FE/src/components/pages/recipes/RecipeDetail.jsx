import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './recipes.module.css';
import { getRecipeRatingsAPI, rateRecipeAPI } from '../../../utils/functions';

const ensureImageUrl = (val) => {
  if (!val) return ''
  const cleaned = String(val).replace(/^\/+/, '')
  if (/^https?:\/\//i.test(cleaned)) return cleaned
  if (/^uploads\//i.test(cleaned)) return `http://localhost:3000/${cleaned}`
  return `http://localhost:3000/uploads/${cleaned}`
}

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isImgOpen, setIsImgOpen] = useState(false);
  const [ratingAvg, setRatingAvg] = useState(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [userStars, setUserStars] = useState(null);
  const [hoverStars, setHoverStars] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/recipes/${id}`, { credentials: 'omit' });
        if (!res.ok) throw new Error('שגיאה בטעינת מתכון');
        const data = await res.json();
        if (!cancelled) setRecipe(data);
        // fetch ratings meta
        try {
          const meta = await getRecipeRatingsAPI(id);
          if (!cancelled) {
            setRatingAvg(meta?.avg ?? null);
            setRatingCount(meta?.count ?? 0);
            setUserStars(meta?.userStars ?? null);
          }
        } catch (_) {
          if (!cancelled) { setRatingAvg(null); setRatingCount(0); setUserStars(null); }
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'שגיאה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true };
  }, [id]);

  if (loading) return <div className={styles.pad16}>טוען...</div>;
  if (error) return <div className={`${styles.pad16} ${styles.errorText}`}>{error}</div>;
  if (!recipe) return <div className={styles.pad16}>המתכון לא נמצא</div>;

  const imageUrl = ensureImageUrl(recipe.picture || recipe.imageUrl || '');
  const instructions = recipe.instructions || recipe.directions || '';
  const description = recipe.description || '';
  let ingredientsArr = [];
  if (Array.isArray(recipe.ingredients)) {
    ingredientsArr = recipe.ingredients;
  } else if (typeof recipe.ingredients === 'string') {
    const s = recipe.ingredients.trim();
    if (s.startsWith('[')) {
      try { ingredientsArr = JSON.parse(s); } catch {}
    }
    if (ingredientsArr.length === 0) {
      ingredientsArr = s.split(/\r?\n|,\s*/).map(x => x.trim()).filter(Boolean);
    }
  }

  return (
    <div className={styles.detail}>
      <button className={`${styles.btn} ${styles.mb12}`} onClick={() => navigate(-1)}>חזרה</button>
      <div className={styles.panel}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={recipe.name}
            loading="lazy"
            decoding="async"
            onClick={() => setIsImgOpen(true)}
            className={styles.detailImage}
          />
        )}
        <div className={styles.detailInner}>
          <h1 className={styles.detailTitle}>{recipe.name}</h1>
          {/* Ratings summary and interaction */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
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
                        const res = await rateRecipeAPI(id, n);
                        setUserStars(res?.userStars ?? n);
                        setRatingAvg(res?.avg ?? n);
                        setRatingCount(res?.count ?? (ratingCount || 1));
                      } catch (e) {
                        const status = e?.response?.status;
                        if (status === 401) {
                          alert('יש להתחבר כלקוח כדי לדרג מתכונים');
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
          {description && <p className={styles.detailDesc}>{description}</p>}
          <div className={styles.detailMeta}>
            {recipe.calories != null && <span className={styles.calories}>{recipe.calories} קלוריות</span>}
            {recipe.servings != null && <span>מנות: {recipe.servings}</span>}
            {(recipe.diet_type || recipe.diet_name) && <span>דיאטה: {recipe.diet_type || recipe.diet_name}</span>}
            {(recipe.category || recipe.category_name) && <span>קטגוריה: {recipe.category || recipe.category_name}</span>}
          </div>
          {ingredientsArr.length > 0 ? (
            <div className={styles.mt12}>
              <h3>מרכיבים</h3>
              <ul className={styles.list}>
                {ingredientsArr.map((ing, idx) => (
                  <li key={idx}>{ing}</li>
                ))}
              </ul>
            </div>
          ) : (recipe.ingredients ? (
            <div className={styles.mt12}>
              <h3>מרכיבים</h3>
              <p className={styles.preWrap}>{String(recipe.ingredients)}</p>
            </div>
          ) : null)}
          {instructions && (
            <div className={styles.mt12}>
              <h3>הוראות הכנה</h3>
              <p className={styles.preWrap}>{instructions}</p>
            </div>
          )}
        </div>
      </div>

      {isImgOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsImgOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{recipe.name}</h3>
              <button className={styles.closeBtn} onClick={() => setIsImgOpen(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <img src={imageUrl} alt={recipe.name} className={styles.modalImgFull} />
            </div>
            <div className={styles.modalFooter}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsImgOpen(false)}>סגור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
