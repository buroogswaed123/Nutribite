import React, { useState, useEffect, useContext } from "react";
import {
  Users,
  TrendingUp,
  Calendar,
  ChefHat,
  Eye,
  MessageSquare,
  Bell,
  BarChart3,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Apple,
  Carrot,
  Leaf,
  Heart,
  Star,
  Clock,
  Zap,
  FileText,
} from "lucide-react";
import { AuthContext } from "../../../../app/App";
import { useAuth } from "../../../../hooks/useAuth";
import { Link } from "react-router-dom";

import styles from "./homeEnhanced.module.css";

export default function HomeEnhanced() {
  const { currentUser } = useContext(AuthContext) || {};
  const { fetchDashboardStats } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchDashboardStats();
        if (!mounted) return;
        setStats(data || {});
      } catch (e) {
        console.error("HomeEnhanced stats load error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [fetchDashboardStats]);

  const username = currentUser?.username || "Admin";

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>טוען נתונים...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: "ניהול מתכונים",
      description: "הוסף, ערוך ומחק מתכונים",
      icon: ChefHat,
      path: "/admin/recipes",
      color: "#059669",
    },
    {
      title: "ניהול משתמשים",
      description: "נהל משתמשים ותפקידים",
      icon: Users,
      path: "/admin/users",
      color: "#0891b2",
    },
    {
      title: "ניהול תגובות",
      description: "אשר ומחק תגובות",
      icon: MessageSquare,
      path: "/admin/comments",
      color: "#dc2626",
    },
    {
      title: "תפריט שבועי",
      description: "צור ונהל תפריטים",
      icon: Calendar,
      path: "/admin/weekly-menus",
      color: "#7c3aed",
    },
  ];

  const statistics = [
    {
      title: "סך כל המתכונים",
      value: stats?.total_recipes || 120,
      change: "+12%",
      icon: ChefHat,
      color: "#059669",
    },
    {
      title: "משתמשים פעילים",
      value: stats?.active_users || 1250,
      change: "+8%",
      icon: Users,
      color: "#0891b2",
    },
    {
      title: "ביקורים השבוע",
      value: stats?.weekly_visits || 15420,
      change: "+15%",
      icon: Eye,
      color: "#dc2626",
    },
    {
      title: "תגובות חדשות",
      value: stats?.new_comments || 45,
      change: "+5%",
      icon: MessageSquare,
      color: "#7c3aed",
    },
  ];

  const popularRecipes = [
    {
      name: "סלט קינואה בריא",
      views: 2450,
      rating: 4.8,
      category: "סלטים",
      image: "🥗",
    },
    {
      name: "פנקייקס טבעוניים",
      views: 1890,
      rating: 4.6,
      category: "ארוחת בוקר",
      image: "🥞",
    },
    {
      name: "עוגת שוקולד קטו",
      views: 1650,
      rating: 4.9,
      category: "קינוחים",
      image: "🍰",
    },
  ];

  const recentComments = [
    {
      id: 1,
      user: "שרה כהן",
      recipe: "סלט קינואה בריא",
      comment: "מתכון מעולה! קל להכנה וטעים מאוד",
      status: "pending",
      time: "לפני 2 שעות",
    },
    {
      id: 2,
      user: "דוד לוי",
      recipe: "פנקייקס טבעוניים",
      comment: "הצלחתי להכין עם הילדים, כולם אהבו!",
      status: "approved",
      time: "לפני 4 שעות",
    },
    {
      id: 3,
      user: "רחל גולדברג",
      recipe: "עוגת שוקולד קטו",
      comment: "העוגה יצאה מדהימה, תודה רבה!",
      status: "approved",
      time: "לפני 6 שעות",
    },
  ];

  const notifications = [
    {
      id: 1,
      type: "urgent",
      message: 'מתכון חדש ממתין לאישור: "סלט ירקות אורגני"',
      time: "לפני 30 דקות",
    },
    {
      id: 2,
      type: "info",
      message: 'משתמש "מיכל רוזן" ביקש תפקיד כותב תוכן',
      time: "לפני שעה",
    },
    {
      id: 3,
      type: "warning",
      message: "עדכון מערכת מתוכנן ליום שישי",
      time: "לפני 2 שעות",
    },
  ];

  const handleApproveComment = (commentId) => {
    console.log("Approving comment:", commentId);
    // Add approval logic here
  };

  const handleDeleteComment = (commentId) => {
    console.log("Deleting comment:", commentId);
    // Add delete logic here
  };

  return (
    <div className={styles.adminHome}>
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              ברוך הבא ללוח הבקרה
              <span className={styles.heroHighlight}>{username}</span>
            </h1>
            <p className={styles.heroSubtitle}>
              נהל את האתר שלך ביעילות עם כלים מתקדמים
            </p>
          </div>
          <div className={styles.heroIcons}>
            <div className={styles.floatingIcon}>
              <Apple className={styles.icon} />
            </div>
            <div className={styles.floatingIcon}>
              <Carrot className={styles.icon} />
            </div>
            <div className={styles.floatingIcon}>
              <Leaf className={styles.icon} />
            </div>
            <div className={styles.floatingIcon}>
              <Heart className={styles.icon} />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tabButton} ${
            activeTab === "overview" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("overview")}
        >
          <BarChart3 size={18} />
          סקירה כללית
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "analytics" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("analytics")}
        >
          <TrendingUp size={18} />
          אנליטיקס
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "reports" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("reports")}
        >
          <FileText size={18} />
          דוחות
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <>
          {/* Quick Actions */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>פעולות מהירות</h2>
            <div className={styles.quickActionsGrid}>
              {quickActions.map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <Link
                    key={index}
                    to={action.path}
                    className={styles.actionCard}
                  >
                    <div
                      className={styles.actionIcon}
                      style={{ backgroundColor: action.color }}
                    >
                      <IconComponent size={24} />
                    </div>
                    <div className={styles.actionContent}>
                      <h3 className={styles.actionTitle}>{action.title}</h3>
                      <p className={styles.actionDescription}>
                        {action.description}
                      </p>
                    </div>
                    <div className={styles.actionArrow}>
                      <Zap size={16} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Statistics Cards */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>סטטיסטיקות</h2>
            <div className={styles.statsGrid}>
              {statistics.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className={styles.statCard}>
                    <div className={styles.statHeader}>
                      <div
                        className={styles.statIcon}
                        style={{ backgroundColor: stat.color }}
                      >
                        <IconComponent size={20} />
                      </div>
                      <div className={styles.statChange}>
                        <TrendingUp size={14} />
                        <span>{stat.change}</span>
                      </div>
                    </div>
                    <div className={styles.statContent}>
                      <h3 className={styles.statValue}>
                        {stat.value.toLocaleString()}
                      </h3>
                      <p className={styles.statLabel}>{stat.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popular Recipes */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>מתכונים פופולריים</h2>
            <div className={styles.recipesGrid}>
              {popularRecipes.map((recipe, index) => (
                <div key={index} className={styles.recipeCard}>
                  <div className={styles.recipeImage}>
                    <span className={styles.recipeEmoji}>{recipe.image}</span>
                  </div>
                  <div className={styles.recipeContent}>
                    <h3 className={styles.recipeTitle}>{recipe.name}</h3>
                    <p className={styles.recipeCategory}>{recipe.category}</p>
                    <div className={styles.recipeStats}>
                      <div className={styles.recipeStat}>
                        <Eye size={14} />
                        <span>{recipe.views.toLocaleString()}</span>
                      </div>
                      <div className={styles.recipeStat}>
                        <Star size={14} />
                        <span>{recipe.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.recipeActions}>
                    <button className={styles.recipeBtn}>
                      <Eye size={16} />
                    </button>
                    <button className={styles.recipeBtn}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Comments */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>תגובות אחרונות</h2>
            <div className={styles.commentsList}>
              {recentComments.map((comment) => (
                <div key={comment.id} className={styles.commentCard}>
                  <div className={styles.commentHeader}>
                    <div className={styles.commentUser}>
                      <div className={styles.userAvatar}>
                        <Users size={16} />
                      </div>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{comment.user}</span>
                        <span className={styles.commentTime}>
                          {comment.time}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`${styles.commentStatus} ${
                        styles[comment.status]
                      }`}
                    >
                      {comment.status === "pending" && (
                        <AlertTriangle size={14} />
                      )}
                      {comment.status === "approved" && (
                        <CheckCircle size={14} />
                      )}
                      <span>
                        {comment.status === "pending"
                          ? "ממתין לאישור"
                          : comment.status === "approved"
                          ? "מאושר"
                          : "נדחה"}
                      </span>
                    </div>
                  </div>
                  <div className={styles.commentContent}>
                    <p className={styles.commentRecipe}>
                      <strong>{comment.recipe}</strong>
                    </p>
                    <p className={styles.commentText}>{comment.comment}</p>
                  </div>
                  <div className={styles.commentActions}>
                    {comment.status === "pending" && (
                      <button
                        className={`${styles.commentBtn} ${styles.approve}`}
                        onClick={() => handleApproveComment(comment.id)}
                      >
                        <CheckCircle size={16} />
                        אשר
                      </button>
                    )}
                    <button
                      className={`${styles.commentBtn} ${styles.delete}`}
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <XCircle size={16} />
                      מחק
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>התראות</h2>
            <div className={styles.notificationsList}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notificationCard} ${
                    styles[notification.type]
                  }`}
                >
                  <div className={styles.notificationIcon}>
                    {notification.type === "urgent" && (
                      <AlertTriangle size={18} />
                    )}
                    {notification.type === "info" && <Bell size={18} />}
                    {notification.type === "warning" && <Clock size={18} />}
                  </div>
                  <div className={styles.notificationContent}>
                    <p className={styles.notificationMessage}>
                      {notification.message}
                    </p>
                    <span className={styles.notificationTime}>
                      {notification.time}
                    </span>
                  </div>
                  <div className={styles.notificationActions}>
                    <button className={styles.notificationBtn}>צפה</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === "analytics" && (
        <div className={styles.analyticsSection}>
          <div className={styles.chartPlaceholder}>
            <BarChart3 size={48} />
            <h3>אנליטיקס מתקדם</h3>
            <p>גרפים וסטטיסטיקות מפורטות יוצגו כאן</p>
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className={styles.reportsSection}>
          <div className={styles.chartPlaceholder}>
            <FileText size={48} />
            <h3>דוחות מערכת</h3>
            <p>דוחות מפורטים וייצוא נתונים יוצגו כאן</p>
          </div>
        </div>
      )}
    </div>
  );
}
