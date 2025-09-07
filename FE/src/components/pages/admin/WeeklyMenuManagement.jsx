import React, { useState, useEffect } from 'react';
import styles from './weeklyMenuManagement.module.css';

const WeeklyMenuManagement = () => {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMenu, setEditingMenu] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());

  useEffect(() => {
    fetchMenus();
  }, [currentWeek]);

  function getCurrentWeek() {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    return startOfWeek.toISOString().split('T')[0];
  }

  const fetchMenus = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockData = [
        {
          id: 1,
          title: 'תפריט שבועי - ינואר 2024',
          description: 'תפריט בריא ומאוזן לשבוע זה',
          weekStart: '2024-01-15',
          weekEnd: '2024-01-21',
          status: 'published',
          mealCount: 21,
          createdAt: '2024-01-10T09:00:00Z'
        },
        {
          id: 2,
          title: 'תפריט טבעוני - פברואר 2024',
          description: 'תפריט מלא ללא מוצרים מהחי',
          weekStart: '2024-02-01',
          weekEnd: '2024-02-07',
          status: 'draft',
          mealCount: 18,
          createdAt: '2024-01-25T14:30:00Z'
        },
        {
          id: 3,
          title: 'תפריט קטו - מרץ 2024',
          description: 'תפריט דל פחמימות עשיר בשומנים בריאים',
          weekStart: '2024-03-01',
          weekEnd: '2024-03-07',
          status: 'published',
          mealCount: 15,
          createdAt: '2024-02-20T11:15:00Z'
        }
      ];

      // Load data immediately
      setMenus(mockData);
      setLoading(false);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingMenu(null);
    setShowForm(true);
  };

  const handleEdit = (menu) => {
    setEditingMenu(menu);
    setShowForm(true);
  };

  const handleDelete = async (menuId) => {
    if (!window.confirm('Are you sure you want to delete this menu?')) return;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/menus/${menuId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete menu');

      setMenus(menus.filter(menu => menu.id !== menuId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async (menuData) => {
    try {
      const isEditing = !!editingMenu;
      const url = isEditing ? `/api/admin/menus/${editingMenu.id}` : '/api/admin/menus';
      const method = isEditing ? 'PUT' : 'POST';

      // TODO: Replace with actual API call
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(menuData),
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} menu`);

      const savedMenu = await response.json();

      if (isEditing) {
        setMenus(menus.map(menu =>
          menu.id === editingMenu.id ? savedMenu : menu
        ));
      } else {
        setMenus([...menus, savedMenu]);
      }

      setShowForm(false);
      setEditingMenu(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePublish = async (menuId) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/menus/${menuId}/publish`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to publish menu');

      setMenus(menus.map(menu =>
        menu.id === menuId ? { ...menu, status: 'published' } : menu
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnpublish = async (menuId) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/menus/${menuId}/unpublish`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to unpublish menu');

      setMenus(menus.map(menu =>
        menu.id === menuId ? { ...menu, status: 'draft' } : menu
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className={styles.loading}>Loading menus...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Weekly Menu Management</h1>
        <button className={styles.createBtn} onClick={handleCreate}>
          Create New Menu
        </button>
      </div>

      <div className={styles.weekSelector}>
        <label>Week starting:</label>
        <input
          type="date"
          value={currentWeek}
          onChange={(e) => setCurrentWeek(e.target.value)}
          className={styles.dateInput}
        />
      </div>

      <div className={styles.menusGrid}>
        {menus.map(menu => (
          <div key={menu.id} className={styles.menuCard}>
            <div className={styles.menuHeader}>
              <h3>{menu.title}</h3>
              <span className={`${styles.status} ${styles[menu.status]}`}>
                {menu.status}
              </span>
            </div>

            <div className={styles.menuInfo}>
              <p><strong>Week:</strong> {menu.weekStart} - {menu.weekEnd}</p>
              <p><strong>Meals:</strong> {menu.mealCount}</p>
              <p><strong>Created:</strong> {new Date(menu.createdAt).toLocaleDateString()}</p>
            </div>

            <div className={styles.menuActions}>
              <button
                className={styles.editBtn}
                onClick={() => handleEdit(menu)}
              >
                Edit
              </button>

              {menu.status === 'draft' ? (
                <button
                  className={styles.publishBtn}
                  onClick={() => handlePublish(menu.id)}
                >
                  Publish
                </button>
              ) : (
                <button
                  className={styles.unpublishBtn}
                  onClick={() => handleUnpublish(menu.id)}
                >
                  Unpublish
                </button>
              )}

              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(menu.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {menus.length === 0 && (
          <div className={styles.noMenus}>
            No menus found for the selected week.
            <button className={styles.createBtn} onClick={handleCreate}>
              Create First Menu
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <MenuForm
          menu={editingMenu}
          weekStart={currentWeek}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingMenu(null);
          }}
        />
      )}
    </div>
  );
};

const MenuForm = ({ menu, weekStart, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: menu?.title || '',
    description: menu?.description || '',
    weekStart: menu?.weekStart || weekStart,
    meals: menu?.meals || [],
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

  const addMeal = () => {
    setFormData({
      ...formData,
      meals: [...formData.meals, { day: '', type: 'breakfast', items: [] }],
    });
  };

  const updateMeal = (index, field, value) => {
    const updatedMeals = [...formData.meals];
    updatedMeals[index][field] = value;
    setFormData({
      ...formData,
      meals: updatedMeals,
    });
  };

  const removeMeal = (index) => {
    setFormData({
      ...formData,
      meals: formData.meals.filter((_, i) => i !== index),
    });
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h2>{menu ? 'Edit Menu' : 'Create New Menu'}</h2>
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
            <label>Week Start:</label>
            <input
              type="date"
              name="weekStart"
              value={formData.weekStart}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.mealsSection}>
            <div className={styles.mealsHeader}>
              <h3>Meals</h3>
              <button type="button" onClick={addMeal} className={styles.addMealBtn}>
                Add Meal
              </button>
            </div>

            {formData.meals.map((meal, index) => (
              <div key={index} className={styles.mealItem}>
                <select
                  value={meal.day}
                  onChange={(e) => updateMeal(index, 'day', e.target.value)}
                >
                  <option value="">Select Day</option>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>

                <select
                  value={meal.type}
                  onChange={(e) => updateMeal(index, 'type', e.target.value)}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>

                <button
                  type="button"
                  onClick={() => removeMeal(index)}
                  className={styles.removeMealBtn}
                >
                  Remove
                </button>
              </div>
            ))}
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

export default WeeklyMenuManagement;
