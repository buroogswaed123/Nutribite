import styles from './recipes.module.css'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Recipes() {
    const [recipes, setRecipes] = useState([])
    const [dietTypes, setDietTypes] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [search, setSearch] = useState('')
    const [categoryId, setCategoryId] = useState('all')
    const [dietId, setDietId] = useState('all')
    const navigate = useNavigate()

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                setLoading(true)
                setError('')
                const [recipesRes, dietRes] = await Promise.all([
                    fetch('/api/recipes', { credentials: 'include' }),
                    fetch('/api/diet/types', { credentials: 'include' }),
                ])
                if (!recipesRes.ok) throw new Error('שגיאה בטעינת מתכונים')
                if (!dietRes.ok) throw new Error('שגיאה בטעינת סוגי דיאטה')
                const recipesJson = await recipesRes.json()
                const dietJson = await dietRes.json()
                if (cancelled) return
                const items = Array.isArray(recipesJson.items) ? recipesJson.items : []
                setRecipes(items)
                setDietTypes(Array.isArray(dietJson.items) ? dietJson.items : [])
                // derive categories from recipes join (category_id + category_name)
                const uniq = new Map()
                for (const r of items) {
                    if (r.category_id && r.category_name) {
                        uniq.set(r.category_id, r.category_name)
                    }
                }
                setCategories([...uniq.entries()].map(([id, name]) => ({ id, name })))
            } catch (e) {
                if (!cancelled) setError(e.message || 'שגיאה בטעינה')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return recipes.filter(r => {
            const matchesSearch = q ? [r.name, r.description].filter(Boolean).some(t => t.toLowerCase().includes(q)) : true
            const matchesCategory = categoryId === 'all' ? true : Number(r.category_id) === Number(categoryId)
            const matchesDiet = dietId === 'all' ? true : Number(r.diet_type_id) === Number(dietId)
            return matchesSearch && matchesCategory && matchesDiet
        })
    }, [recipes, search, categoryId, dietId])

    const onShowRecipe = (recipe) => {
        navigate('/menu', { state: { recipe } })
    }

    return (
        <div className={styles.recipes}>
            {error && <div style={{color:'#b91c1c', marginBottom: 8}}>{error}</div>}
            {loading && <div style={{marginBottom: 8}}>טוען מתכונים...</div>}
            <div className={styles.filters}>
                <input
                    type="text"
                    className={styles.search}
                    placeholder="חיפוש מתכונים..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select className={styles.select} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="all">כל הקטגוריות</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <select className={styles.select} value={dietId} onChange={(e) => setDietId(e.target.value)}>
                    <option value="all">כל סוגי הדיאטה</option>
                    {dietTypes.map(dt => (
                        <option key={dt.diet_id || dt.id} value={dt.diet_id || dt.id}>{dt.name}</option>
                    ))}
                </select>
            </div>

            <div className={styles.grid}>
                {filtered.map(r => (
                    <div key={r.recipe_id} className={styles.card}>
                        <img src={r.picture || r.imageUrl} alt={r.name} className={styles.cardImg} />
                        <div className={styles.cardBody}>
                            <h3 className={styles.cardTitle}>{r.name}</h3>
                            <p className={styles.cardDesc}>{r.description}</p>
                            <div className={styles.cardMeta}>
                                <span className={styles.calories}>{r.calories} קלוריות</span>
                                <button className={styles.btn} onClick={() => onShowRecipe(r)}>הצג מתכון</button>
                            </div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className={styles.empty}>לא נמצאו מתכונים תואמים</div>
                )}
            </div>
        </div>
    )
}