import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './recipes.module.css';

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
