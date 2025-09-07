import React, { useState, useEffect } from 'react';
import styles from './recipeManagement.module.css';

const RecipeManagement = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockData = [
        {
          id: 1,
          title: 'סלט קינואה בריא',
          category: 'סלטים',
          status: 'published',
          createdAt: '2024-01-15T10:00:00Z',
          description: 'סלט קינואה טעים ובריא עם ירקות טריים',
          ingredients: 'קינואה, עגבניות, מלפפונים, בצל, שמן זית, לימון',
          instructions: 'בשל את הקינואה, חתוך את הירקות, ערבב עם שמן זית ולימון'
        },
        {
          id: 2,
          title: 'פנקייקס טבעוניים',
          category: 'ארוחת בוקר',
          status: 'published',
          createdAt: '2024-01-20T08:30:00Z',
          description: 'פנקייקס קלים וטעימים ללא מוצרים מהחי',
          ingredients: 'קמח, חלב שקדים, סוכר, אבקת אפייה, שמן קוקוס',
          instructions: 'ערבב את החומרים, טגן במחבת, הגש עם סירופ מייפל'
        },
        {
          id: 3,
          title: 'עוגת שוקולד קטו',
          category: 'קינוחים',
          status: 'draft',
          createdAt: '2024-01-25T14:15:00Z',
          description: 'עוגת שוקולד עשירה בטעם ללא פחמימות',
          ingredients: 'אבקת שקדים, קקאו, חמאה, אגוזים, ממתיק טבעי',
          instructions: 'ערבב את החומרים, אפה בתנור, קרר לפני ההגשה'
        },
        {
          id: 4,
          title: 'מרק ירקות בריא',
          category: 'מרקים',
          status: 'published',
          createdAt: '2024-02-01T12:00:00Z',
          description: 'מרק ירקות חם ומנחם עם טעמים עשירים',
          ingredients: 'גזר, סלרי, בצל, שום, מרק ירקות, תבלינים',
          instructions: 'חתוך את הירקות, בישל במים עם מרק ירקות, הוסף תבלינים'
        },
        {
          id: 5,
          title: 'סושי בריא ביתי',
          category: 'אסייתי',
          status: 'archived',
          createdAt: '2024-01-10T16:45:00Z',
          description: 'סושי בריא עם דגים טריים וירקות',
          ingredients: 'אורז, נורי, סלמון, אבוקדו, מלפפון, רוטב סויה',
          instructions: 'בשל אורז, הכן את המילוי, גלגל עם נורי, חתוך לפרוסות'
        }
      ];

      // Load data immediately
      setRecipes(mockData);
      setLoading(false);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRecipe(null);
    setShowForm(true);
  };

  const handleEdit = (recipe) => {
    setEditingRecipe(recipe);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/recipes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete recipe');

      setRecipes(recipes.filter(recipe => recipe.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async (recipeData) => {
    try {
      const isEditing = !!editingRecipe;
      const url = isEditing ? `/api/admin/recipes/${editingRecipe.id}` : '/api/admin/recipes';
      const method = isEditing ? 'PUT' : 'POST';

      // TODO: Replace with actual API call
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData),
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} recipe`);

      const savedRecipe = await response.json();

      if (isEditing) {
        setRecipes(recipes.map(recipe =>
          recipe.id === editingRecipe.id ? savedRecipe : recipe
        ));
      } else {
        setRecipes([...recipes, savedRecipe]);
      }

      setShowForm(false);
      setEditingRecipe(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className={styles.loading}>Loading recipes...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Recipe Management</h1>
        <button className={styles.createBtn} onClick={handleCreate}>
          Add New Recipe
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map(recipe => (
              <tr key={recipe.id}>
                <td>{recipe.title}</td>
                <td>{recipe.category}</td>
                <td>
                  <span className={`${styles.status} ${styles[recipe.status]}`}>
                    {recipe.status}
                  </span>
                </td>
                <td>{new Date(recipe.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className={styles.editBtn}
                    onClick={() => handleEdit(recipe)}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(recipe.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <RecipeForm
          recipe={editingRecipe}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingRecipe(null);
          }}
        />
      )}
    </div>
  );
};

const RecipeForm = ({ recipe, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: recipe?.title || '',
    description: recipe?.description || '',
    category: recipe?.category || '',
    ingredients: recipe?.ingredients || '',
    instructions: recipe?.instructions || '',
    status: recipe?.status || 'draft',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h2>{recipe ? 'Edit Recipe' : 'Create New Recipe'}</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Title:</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Category:</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Ingredients:</label>
            <textarea
              name="ingredients"
              value={formData.ingredients}
              onChange={handleChange}
              rows="5"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Instructions:</label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              rows="8"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Status:</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn}>
              Save
            </button>
            <button type="button" className={styles.backBtn} onClick={() => window.history.back()}>
              Back
            </button>
            <button type="button" onClick={onCancel} className={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecipeManagement;
