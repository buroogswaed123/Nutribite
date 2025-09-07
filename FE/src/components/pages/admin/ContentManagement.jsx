import React, { useState, useEffect } from 'react';
import styles from './contentManagement.module.css';

const ContentManagement = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingContent, setEditingContent] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockData = [
        {
          id: 1,
          title: 'כיצד לבשל סלט קינואה בריא',
          description: 'מדריך מלא להכנת סלט קינואה טעים ובריא עם ירקות טריים',
          content: 'סלט קינואה הוא אופציה בריאה ומזינה...',
          type: 'article',
          status: 'published',
          tags: ['סלטים', 'קינואה', 'בריאות'],
          createdAt: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          title: 'מתכונים טבעוניים לפסח',
          description: 'אוסף מתכונים טבעוניים מיוחדים לחג הפסח',
          content: 'השנה הכנו עבורכם אוסף מתכונים טבעוניים...',
          type: 'blog',
          status: 'published',
          tags: ['טבעוני', 'פסח', 'חגים'],
          createdAt: '2024-01-20T14:30:00Z'
        },
        {
          id: 3,
          title: 'שאלות נפוצות על תזונה בריאה',
          description: 'מענה לשאלות הנפוצות ביותר על תזונה בריאה',
          content: 'מה זה תזונה בריאה? איך מתחילים?...',
          type: 'faq',
          status: 'draft',
          tags: ['תזונה', 'בריאות', 'שאלות'],
          createdAt: '2024-01-25T09:15:00Z'
        },
        {
          id: 4,
          title: 'השקת האפליקציה החדשה',
          description: 'אנו שמחים להודיע על השקת האפליקציה החדשה שלנו',
          content: 'לאחר חודשים של עבודה קשה, אנו גאים להציג...',
          type: 'announcement',
          status: 'published',
          tags: ['חדשות', 'אפליקציה', 'השקה'],
          createdAt: '2024-01-30T16:45:00Z'
        }
      ];

      // Load data immediately
      setContent(mockData);
      setLoading(false);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingContent(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingContent(item);
    setShowForm(true);
  };

  const handleDelete = async (contentId) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/content/${contentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete content');

      setContent(content.filter(item => item.id !== contentId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePublish = async (contentId) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/content/${contentId}/publish`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to publish content');

      setContent(content.map(item =>
        item.id === contentId ? { ...item, status: 'published' } : item
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnpublish = async (contentId) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/content/${contentId}/unpublish`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to unpublish content');

      setContent(content.map(item =>
        item.id === contentId ? { ...item, status: 'draft' } : item
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async (contentData) => {
    try {
      const isEditing = !!editingContent;
      const url = isEditing ? `/api/admin/content/${editingContent.id}` : '/api/admin/content';
      const method = isEditing ? 'PUT' : 'POST';

      // TODO: Replace with actual API call
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contentData),
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} content`);

      const savedContent = await response.json();

      if (isEditing) {
        setContent(content.map(item =>
          item.id === editingContent.id ? savedContent : item
        ));
      } else {
        setContent([...content, savedContent]);
      }

      setShowForm(false);
      setEditingContent(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) return <div className={styles.loading}>Loading content...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Content Management</h1>
        <button className={styles.createBtn} onClick={handleCreate}>
          Create New Content
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterBox}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Types</option>
            <option value="article">Article</option>
            <option value="blog">Blog Post</option>
            <option value="faq">FAQ</option>
            <option value="announcement">Announcement</option>
          </select>
        </div>
      </div>

      <div className={styles.contentList}>
        {filteredContent.map(item => (
          <div key={item.id} className={styles.contentCard}>
            <div className={styles.contentHeader}>
              <div className={styles.contentMeta}>
                <h3>{item.title}</h3>
                <div className={styles.metaInfo}>
                  <span className={`${styles.type} ${styles[item.type]}`}>
                    {item.type}
                  </span>
                  <span className={`${styles.status} ${styles[item.status]}`}>
                    {item.status}
                  </span>
                  <span className={styles.date}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.contentPreview}>
              <p>{item.description.substring(0, 150)}...</p>
            </div>

            <div className={styles.contentActions}>
              <button
                className={styles.editBtn}
                onClick={() => handleEdit(item)}
              >
                Edit
              </button>

              {item.status === 'draft' ? (
                <button
                  className={styles.publishBtn}
                  onClick={() => handlePublish(item.id)}
                >
                  Publish
                </button>
              ) : (
                <button
                  className={styles.unpublishBtn}
                  onClick={() => handleUnpublish(item.id)}
                >
                  Unpublish
                </button>
              )}

              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(item.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {filteredContent.length === 0 && (
          <div className={styles.noContent}>
            No content found matching your criteria.
            <button className={styles.createBtn} onClick={handleCreate}>
              Create First Content
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <ContentForm
          content={editingContent}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingContent(null);
          }}
        />
      )}
    </div>
  );
};

const ContentForm = ({ content, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: content?.title || '',
    description: content?.description || '',
    content: content?.content || '',
    type: content?.type || 'article',
    tags: content?.tags || [],
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

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData({
      ...formData,
      tags,
    });
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h2>{content ? 'Edit Content' : 'Create New Content'}</h2>
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
            <label>Type:</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="article">Article</option>
              <option value="blog">Blog Post</option>
              <option value="faq">FAQ</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Brief description of the content"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Content:</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows="10"
              placeholder="Full content here..."
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Tags (comma-separated):</label>
            <input
              type="text"
              value={formData.tags.join(', ')}
              onChange={handleTagsChange}
              placeholder="tag1, tag2, tag3"
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

// UNUSED ADMIN COMPONENT: export stubbed on 2025-09-07
// export default ContentManagement;
export default function ContentManagementStub() { return null; }
