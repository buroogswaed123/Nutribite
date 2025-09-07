import React, { useState, useEffect } from 'react';
import styles from './commentManagement.module.css';

const CommentManagement = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockData = [
        {
          id: 1,
          author: 'שרה לוי',
          content: 'מתכון מעולה! הכנתי אותו והוא יצא מדהים',
          status: 'approved',
          createdAt: '2024-01-15T10:30:00Z',
          recipeTitle: 'סלט קינואה בריא'
        },
        {
          id: 2,
          author: 'דוד ישראלי',
          content: 'הוראות לא ברורות מספיק, קשה להבין את הכמויות',
          status: 'pending',
          createdAt: '2024-01-16T14:20:00Z',
          recipeTitle: 'פנקייקס טבעוניים'
        },
        {
          id: 3,
          author: 'רונית כהן',
          content: 'הוספתי קצת כורכום והתוצאה הייתה מדהימה!',
          status: 'approved',
          createdAt: '2024-01-17T09:15:00Z',
          recipeTitle: 'מרק ירקות בריא'
        },
        {
          id: 4,
          author: 'אבי לוי',
          content: 'מתכון לא טעים בכלל, לא מומלץ',
          status: 'rejected',
          createdAt: '2024-01-18T16:45:00Z',
          recipeTitle: 'עוגת שוקולד קטו'
        },
        {
          id: 5,
          author: 'מיכל רוזן',
          content: 'הכי טעים שטעמתי! תודה רבה',
          status: 'approved',
          createdAt: '2024-01-19T11:30:00Z',
          recipeTitle: 'סושי בריא ביתי'
        }
      ];

      // Load data immediately
      setComments(mockData);
      setLoading(false);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleApprove = async (commentId) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/comments/${commentId}/approve`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to approve comment');

      setComments(comments.map(comment =>
        comment.id === commentId ? { ...comment, status: 'approved' } : comment
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (commentId) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/comments/${commentId}/reject`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to reject comment');

      setComments(comments.map(comment =>
        comment.id === commentId ? { ...comment, status: 'rejected' } : comment
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete comment');

      setComments(comments.filter(comment => comment.id !== commentId));
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredComments = comments.filter(comment => {
    const matchesSearch = comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comment.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || comment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className={styles.loading}>Loading comments...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Comment Management</h1>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search comments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterBox}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className={styles.commentsList}>
        {filteredComments.map(comment => (
          <div key={comment.id} className={styles.commentCard}>
            <div className={styles.commentHeader}>
              <div className={styles.authorInfo}>
                <strong>{comment.author}</strong>
                <span className={styles.date}>
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.status}>
                <span className={`${styles.statusBadge} ${styles[comment.status]}`}>
                  {comment.status}
                </span>
              </div>
            </div>

            <div className={styles.commentContent}>
              <p>{comment.content}</p>
              {comment.recipeTitle && (
                <small className={styles.recipeRef}>
                  On recipe: {comment.recipeTitle}
                </small>
              )}
            </div>

            <div className={styles.commentActions}>
              {comment.status === 'pending' && (
                <>
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleApprove(comment.id)}
                  >
                    Approve
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleReject(comment.id)}
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(comment.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {filteredComments.length === 0 && (
          <div className={styles.noComments}>
            No comments found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentManagement;
