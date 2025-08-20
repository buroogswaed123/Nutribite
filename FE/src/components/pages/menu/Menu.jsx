import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './menu.module.css'

export default function Menu() {
  const location = useLocation()
  const navigate = useNavigate()
  const recipe = location.state?.recipe || null

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [diet, setDiet] = useState('all')

  if (!recipe) {
    return (
      <div className={styles.menu}> 
        <div className={styles.emptyBox}>
          <p>לא נבחר מתכון להצגה</p>
          <button className={styles.btn} onClick={() => navigate(-1)}>חזרה</button>
        </div>
      </div>
    )
  }

  // In this view, we only show the selected recipe. Filters are present (per requirement) but do not alter the selection.
  return (
    <div className={styles.menu}>
      <div className={styles.filters}>
        <input
          type="text"
          className={styles.search}
          placeholder="חיפוש... (במסך זה מציגים מתכון נבחר)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">הכל</option>
          <option value="breakfast">ארוחת בוקר</option>
          <option value="lunch">ארוחת צהריים</option>
          <option value="dinner">ארוחת ערב</option>
          <option value="dessert">קינוח</option>
          <option value="drink">משקה</option>
          <option value="snack">נשנוש</option>
        </select>
        <select className={styles.select} value={diet} onChange={(e) => setDiet(e.target.value)}>
          <option value="all">כל סוגי הדיאטה</option>
          {/* תצוגה בלבד במסך זה */}
        </select>
      </div>

      <div className={styles.detail}>
        <img src={recipe.picture || recipe.imageUrl} alt={recipe.name} className={styles.detailImg} />
        <div className={styles.detailBody}>
          <h1 className={styles.title}>{recipe.name}</h1>
          <p className={styles.desc}>{recipe.description}</p>
          <div className={styles.metaRow}>
            <span className={styles.calories}>{recipe.calories} קלוריות</span>
            <span className={styles.category}>קטגוריה: {recipe.category_name || translateCategory(recipe.category)}</span>
          </div>
          <div className={styles.diets}>
            {recipe.diet_name && (
              <span className={styles.badge}>{recipe.diet_name}</span>
            )}
          </div>
          <div className={styles.actions}>
            <button className={styles.btn} onClick={() => navigate(-1)}>חזרה</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function translateCategory(cat) {
  switch (cat) {
    case 'breakfast': return 'ארוחת בוקר'
    case 'lunch': return 'ארוחת צהריים'
    case 'dinner': return 'ארוחת ערב'
    case 'dessert': return 'קינוח'
    case 'drink': return 'משקה'
    case 'snack': return 'נשנוש'
    default: return 'הכל'
  }
}
