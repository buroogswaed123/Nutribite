import React, { useState, useEffect, useContext } from 'react';
import { Users, Package, TrendingUp, Calendar, Gift, ChefHat, Eye, MessageSquare, Bell, BarChart3, Plus, UserCheck, List, Calendar as CalendarIcon } from 'lucide-react';
import { AuthContext } from '../../../../app/App';
import { useAuth } from '../../../../hooks/useAuth';
import { Link } from 'react-router-dom';

import styles from './home.module.css';
import Activity from '../profile/management/Activity';
import UsersList from '../profile/management/UsersList';

export default function AdminHome() {
  const { currentUser } = useContext(AuthContext) || {};
  const { fetchDashboardStats } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchDashboardStats();
        if (!mounted) return;
        setStats(data || {});
      } catch (e) {
        console.error('AdminHome stats load error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [fetchDashboardStats]);

  const username = currentUser?.username || 'Admin';
  const profilePicture = currentUser?.profilePicture || '/default-avatar.png'; // Placeholder for profile picture

  if (loading) {
    return (
      <div className={styles.adminHome}>
        <div className={styles.loading}>טוען נתונים...</div>
      </div>
    );
  }

  // Sample data for new sections (replace with actual API calls)
  const popularRecipes = [
    { name: 'Quinoa Salad', views: 1500, shares: 120, comments: 45 },
    { name: 'Vegan Pancakes', views: 1200, shares: 95, comments: 32 },
    { name: 'Keto Omelette', views: 900, shares: 78, comments: 28 },
  ];

  const recentComments = [
    { id: 1, user: 'John Doe', recipe: 'Quinoa Salad', comment: 'Great recipe!', status: 'pending' },
    { id: 2, user: 'Jane Smith', recipe: 'Vegan Pancakes', comment: 'Very tasty!', status: 'approved' },
    { id: 3, user: 'Bob Johnson', recipe: 'Keto Omelette', comment: 'Easy to make', status: 'pending' },
  ];

  const notifications = [
    { id: 1, type: 'pending_recipe', message: 'New recipe awaiting approval: "Healthy Smoothie"' },
    { id: 2, type: 'content_writer_request', message: 'User "Alice" requested content writer role' },
    { id: 3, type: 'system', message: 'System update scheduled for tomorrow' },
  ];

  return (
    <div className={styles.adminHome}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>ברוך הבא, {username}!</h1>
        <p className={styles.subtitle}>פאנל ניהול Nutribite</p>
      </div>

      {/* Overview Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <ChefHat size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{stats?.total_recipes || 120}</h3>
            <p className={styles.statLabel}>סך כל המתכונים באתר</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Plus size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{stats?.new_recipes_this_month || 15}</h3>
            <p className={styles.statLabel}>מתכונים חדשים החודש</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{stats?.new_users_this_month || 25}</h3>
            <p className={styles.statLabel}>משתמשים חדשים החודש</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Eye size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{stats?.weekly_visits || 5000}</h3>
            <p className={styles.statLabel}>ביקורים/צפיות השבוע</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{stats?.total_users || 0}</h3>
            <p className={styles.statLabel}>משתמשים כוללים</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <h3 className={styles.statNumber}>{stats?.active_users || 0}</h3>
            <p className={styles.statLabel}>משתמשים פעילים</p>
          </div>
        </div>
      </div>

      {/* Popular Recipes */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>מתכונים פופולריים</h2>
        <div className={styles.popularRecipes}>
          {popularRecipes.map((recipe, index) => (
            <div key={index} className={styles.recipeCard}>
              <h3>{recipe.name}</h3>
              <div className={styles.recipeStats}>
                <span><Eye size={16} /> {recipe.views} צפיות</span>
                <span><TrendingUp size={16} /> {recipe.shares} שיתופים</span>
                <span><MessageSquare size={16} /> {recipe.comments} תגובות</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Comments */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>תגובות אחרונות</h2>
        <div className={styles.recentComments}>
          {recentComments.map((comment) => (
            <div key={comment.id} className={styles.commentCard}>
              <div className={styles.commentHeader}>
                <span className={styles.commentUser}>{comment.user}</span>
                <span className={styles.commentRecipe}>{comment.recipe}</span>
                <span className={`${styles.commentStatus} ${styles[comment.status]}`}>{comment.status}</span>
              </div>
              <p className={styles.commentText}>{comment.comment}</p>
              <div className={styles.commentActions}>
                <button className={styles.approveBtn}>אשר</button>
                <button className={styles.deleteBtn}>מחק</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications and Alerts */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>התראות ועדכונים</h2>
        <div className={styles.notifications}>
          {notifications.map((notification) => (
            <div key={notification.id} className={styles.notificationCard}>
              <Bell size={16} />
              <span>{notification.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics and Graphs */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>סטטיסטיקות וגרפים</h2>
        <div className={styles.chartsGrid}>
          <div className={styles.chartPlaceholder}>
            <BarChart3 size={48} />
            <p>גרף מתכונים חדשים לפי חודשים</p>
          </div>
          <div className={styles.chartPlaceholder}>
            <BarChart3 size={48} />
            <p>גרף כניסות יומיות/שבועיות</p>
          </div>
          <div className={styles.chartPlaceholder}>
            <BarChart3 size={48} />
            <p>פילוח משתמשים: רגילים, כותבי מתכונים, מנהלים</p>
          </div>
        </div>
      </div>

      {/* Quick Shortcuts */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>קיצורי דרך מהירים</h2>
        <div className={styles.shortcutsGrid}>
          <Link to="/admin/recipes" className={styles.shortcutBtn}>
            <Plus size={24} />
            הוסף מתכון חדש
          </Link>
          <Link to="/admin/users" className={styles.shortcutBtn}>
            <UserCheck size={24} />
            נהל משתמשים
          </Link>
          <Link to="/admin/comments" className={styles.shortcutBtn}>
            <List size={24} />
            צפה בכל התגובות
          </Link>
          <Link to="/admin/weekly-menus" className={styles.shortcutBtn}>
            <CalendarIcon size={24} />
            צור תפריט שבועי
          </Link>
        </div>
      </div>

      {/* Personal Panel */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>פאנל אישי</h2>
        <div className={styles.personalPanel}>
          <div className={styles.profileInfo}>
            <img src={profilePicture} alt="Profile" className={styles.profilePicture} />
            <div className={styles.profileDetails}>
              <h3>ברוך הבא, {username}</h3>
              <p>מנהל מערכת</p>
            </div>
          </div>
          <div className={styles.profileActions}>
            <Link to="/adminprofile" className={styles.editBtn}>ערוך פרטים אישיים</Link>
            <Link to="/adminprofile" className={styles.editBtn}>שנה סיסמה</Link>
          </div>
        </div>
      </div>

      {/* Existing Sections */}
      <UsersList />
      <Activity />
    </div>
  );
}
