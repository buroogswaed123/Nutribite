
import React, { useState, useEffect } from 'react';
import styles from './categoryManagement.module.css';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockData = [
        {
          id: 1,
          name: 'סלטים',
          description: 'סלטים בריאים וטעימים',
          recipeCount: 15,
          status: 'active',
          createdAt: '2024-01-01T10:00:00Z'
        },
        {
          id: 2,
          name: 'ארוחת בוקר',
          description: 'מתכונים לארוחת בוקר בריאה',
          recipeCount: 12,
          status: 'active',
          createdAt: '2024-01-02T08:30:00Z'
        },
        {
          id: 3,
          name: 'קינוחים',
          description: 'קינוחים בריאים וטעימים',
          recipeCount: 8,
          status: 'active',
          createdAt: '2024-01-03T14:15:00Z'
        },
        {
          id: 4,
          name: 'מרקים',
          description: 'מרקים חמים ומנחמים',
          recipeCount: 6,
          status: 'active',
          createdAt: '2024-01-04T12:00:00Z'
        },
        {
          id: 5,
          name: 'אסייתי',
          description: 'מתכונים אסייתיים בריאים',
          recipeCount: 10,
          status: 'active',
          createdAt: '2024-01-05T16:45:00Z'
        },
        {
          id: 6,
          name: 'טבעוני',
          description: 'מתכונים טבעוניים מלאים',
          recipeCount: 18,
          status: 'active',
          createdAt: '2024-01-06T11:20:00Z'
        }
      ];

      // Load data immediately
      setCategories(mockData);
      setLoading(false);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete category');

      setCategories(categories.filter(category => category.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async (categoryData) => {
    try {
      const isEditing = !!editingCategory;
      const url = isEditing ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const method = isEditing ? 'PUT' : 'POST';

      // TODO: Replace with actual API call
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} category`);

      const savedCategory = await response.json();

      if (isEditing) {
        setCategories(categories.map(category =>
          category.id === editingCategory.id ? savedCategory : category
        ));
      } else {
        setCategories([...categories, savedCategory]);
      }

      setShowForm(false);
      setEditingCategory(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className={styles.loading}>Loading categories...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Category Management</h1>
        <button className={styles.createBtn} onClick={handleCreate}>
          Add New Category
        </button>
      </div>

      <div className={styles.grid}>
        {categories.map(category => (
          <div key={category.id} className={styles.categoryCard}>
            <div className={styles.categoryHeader}>
              <h3>{category.name}</h3>
              <div className={styles.actions}>
                <button
                  className={styles.editBtn}
                  onClick={() => handleEdit(category)}
                >
                  Edit
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(category.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            <p className={styles.description}>{category.description}</p>
            <div className={styles.stats}>
              <span>{category.recipeCount || 0} recipes</span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <CategoryForm
          category={editingCategory}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
};

const CategoryForm = ({ category, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    imageUrl: category?.imageUrl || '',
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
        <h2>{category ? 'Edit Category' : 'Create New Category'}</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
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
            <label>Image URL:</label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
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

export default CategoryManagement;
