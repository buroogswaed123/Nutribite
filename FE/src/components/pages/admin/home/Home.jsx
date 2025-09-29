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
  // CheckCircle, // unused now
  // XCircle, // unused
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
import { ensureImageUrl, updateProductByRecipeAPI, getProductByRecipeAPI, fetchMenuProductsMap } from "../../../../utils/functions";

import styles from "./homeEnhanced.module.css";

export default function HomeEnhanced() {
  const { currentUser } = useContext(AuthContext) || {};
  const { fetchDashboardStats, fetchRecentUsers, fetchAllUsers, fetchAllRecipes } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [animateBanner, setAnimateBanner] = useState(false);
  const [recentUsers, setRecentUsers] = useState([]);
  // const [allUsers, setAllUsers] = useState([]); // removed unused state
  const [recipes, setRecipes] = useState([]);

  const [ordersByStatus, setOrdersByStatus] = useState(null);
  const [stocks, setStocks] = useState({}); // { [recipeId]: { value, loading } }
  const [expandedCats, setExpandedCats] = useState({}); // { [categoryName]: boolean }
  const [productsMap, setProductsMap] = useState(null); // { recipe_id: stock }
  const [saveStatus, setSaveStatus] = useState({}); // { [recipeId]: 'success' | 'error' }
  
  //give random num
  function getRandomDouble(min, max) {
    return Math.random() * (max - min) + min;
  }
  const [randRating1] = useState(() => getRandomDouble(3, 5));
  // removed unused random ratings 2/3

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  const [randViews1] = useState(() => getRandomInt(1000, 10000));
  // removed unused random views 2/3


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Fetch in parallel
        const [statsRes, recentUsersRes, allUsersRes, recipesRes] = await Promise.all([
          fetchDashboardStats().catch(() => ({})),
          fetchRecentUsers(5).catch(() => []),
          fetchAllUsers().catch(() => []),
          fetchAllRecipes().catch(() => []),
        ]);

        if (!mounted) return;
        setRecentUsers(Array.isArray(recentUsersRes) ? recentUsersRes : (recentUsersRes?.items || []));
        setRecipes(Array.isArray(recipesRes) ? recipesRes : (recipesRes?.items || []));


        // Build fallback stats if needed
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const total_recipes = (Array.isArray(recipesRes) ? recipesRes : (recipesRes?.items || [])).length;
        const new_recipes_this_month = (Array.isArray(recipesRes) ? recipesRes : (recipesRes?.items || []))
          .filter(r => r?.createdAt && new Date(r.createdAt).getMonth() === month && new Date(r.createdAt).getFullYear() === year)
          .length;
        const total_users = (Array.isArray(allUsersRes) ? allUsersRes : (allUsersRes?.items || [])).length;

        const merged = {
          total_recipes: statsRes?.total_recipes ?? total_recipes,
          new_recipes_this_month: statsRes?.new_recipes_this_month ?? new_recipes_this_month,
          weekly_visits: statsRes?.weekly_visits ?? 0,
          total_users: statsRes?.total_users ?? total_users,
          active_users: statsRes?.active_users ?? 0,
          new_users_this_month: statsRes?.new_users_this_month ?? 0,
          new_comments: statsRes?.new_comments ?? 0,
        };
        setStats(merged);
      } catch (e) {
        console.error("AdminHome data load error:", e);
        setStats({});
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [fetchDashboardStats, fetchRecentUsers, fetchAllUsers, fetchAllRecipes]);

  // Refresh core stats when switching to Analytics so numbers reflect latest BE data
  useEffect(() => {
    if (activeTab !== 'analytics') return;
    let mounted = true;
    (async () => {
      try {
        const [statsRes, allUsersRes, recipesRes] = await Promise.all([
          fetchDashboardStats().catch(() => ({})),
          fetchAllUsers().catch(() => []),
          fetchAllRecipes().catch(() => []),
        ]);
        if (!mounted) return;
        const total_recipes = (Array.isArray(recipesRes) ? recipesRes : (recipesRes?.items || [])).length;
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const new_recipes_this_month = (Array.isArray(recipesRes) ? recipesRes : (recipesRes?.items || []))
          .filter(r => r?.createdAt && new Date(r.createdAt).getMonth() === month && new Date(r.createdAt).getFullYear() === year)
          .length;
        const total_users = (Array.isArray(allUsersRes) ? allUsersRes : (allUsersRes?.items || [])).length;
        const merged = {
          total_recipes: statsRes?.total_recipes ?? total_recipes,
          new_recipes_this_month: statsRes?.new_recipes_this_month ?? new_recipes_this_month,
          weekly_visits: statsRes?.weekly_visits ?? 0,
          total_users: statsRes?.total_users ?? total_users,
          active_users: statsRes?.active_users ?? 0,
          new_users_this_month: statsRes?.new_users_this_month ?? 0,
          new_comments: statsRes?.new_comments ?? 0,
        };
        setStats(merged);
      } catch {}
      // Also fetch a tiny numbers-only metric: orders by status
      try {
        const res = await fetch('http://localhost:3000/api/admin/data/metrics/orders_by_status', { credentials: 'include' });
        const data = await res.json();
        if (mounted) setOrdersByStatus(data || {});
      } catch (_) {
        if (mounted) setOrdersByStatus(null);
      }
    })();
    return () => { mounted = false; };
  }, [activeTab, fetchDashboardStats, fetchAllUsers, fetchAllRecipes]);

  // Compute top 3 by rating with images (must be before any early returns)
  const popularRecipes = (recipes || [])
    .map(r => ({ raw: r, ratingAvg: Number(r.rating_avg ?? r.avg_rating ?? r.rating ?? 0) || 0 }))
    .sort((a, b) => b.ratingAvg - a.ratingAvg)
    .slice(0, 3)
    .map(({ raw, ratingAvg }) => ({
      id: raw.id || raw.recipe_id,
      name: raw.title || raw.name || 'מתכון',
      views: raw.views || raw.view_count || 0,
      rating: ratingAvg,
      category: raw.category || raw.category_name || '',
      imageUrl: ensureImageUrl(raw.picture || raw.imageUrl || raw.image || ''),
      emoji: '🍽️',
    }));
  
     // Trigger banner animation: move to center then back
  useEffect(() => {
    if (loading) return;
    // Animate once into center and keep final state
    setAnimateBanner(true);
    return () => {};
  }, [loading]);

  // Prefill current stock for recipes in expanded categories on the 'reviews' tab
  useEffect(() => {
    if (activeTab !== 'reviews') return;
    const cats = Object.keys(expandedCats).filter((k) => expandedCats[k]);
    // If no categories expanded yet, still try to load the map once so inputs can prefill fast later
    let mounted = true;
    (async () => {
      try {
        let map = productsMap;
        if (!map) {
          map = await fetchMenuProductsMap();
          if (!mounted) return;
          setProductsMap(map);
        }
        // Determine which recipe IDs to prefill: if cats chosen, limit to those; else use all recipes shown
        const candidate = (recipes || []).filter(r => cats.length === 0 || cats.includes((r.category || r.category_name || 'ללא קטגוריה')));
        const updates = {};
        for (const r of candidate) {
          const rid = r.id || r.recipe_id;
          if (!rid) continue;
          if (stocks[rid]?.value != null) continue; // don't override user edits
          const val = Number(map[rid] ?? 0) || 0;
          updates[rid] = { ...(stocks[rid] || {}), value: String(val) };
        }
        if (Object.keys(updates).length) {
          setStocks(prev => ({ ...prev, ...updates }));
        }
      } catch (_) { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [activeTab, expandedCats, recipes, productsMap, stocks]);

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

  

  const username = currentUser?.username || "Admin";

  const quickActions = [
    {
      title: "ניהול משתמשים",
      description: "נהל משתמשים ותפקידים",
      icon: Users,
      path: "/users",
      color: "#0891b2",
    },
    {
      title: "ניהול תגובות",
      description: "אשר ומחק תגובות",
      icon: MessageSquare,
      path: "/faq",
      color: "#dc2626",
    },
    {
      title: "ניהול מתכונים",
      description: "צור ונהל תפריטים",
      icon: Calendar,
      path: "/recipes",
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

  // Filter helpers (fixed 30 days)
  const cutoffDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  })();
  const withinRange = (dt) => {
    if (!dt) return true; // if no date, keep
    const t = new Date(dt);
    return t >= cutoffDate;
  };

 

  // Replace reviews/comments panel with recent users from backend (no DB changes needed)
  const recentUsersList = (recentUsers || []).map((u, idx) => ({
    id: u.id || u.user_id || idx,
    name: u.name || u.username || u.full_name || 'משתמש',
    email: u.email || '',
    role: u.role || u.user_type || 'customer',
    createdAt: u.createdAt || u.created_at || u.joined_at,
  }));

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

  // Removed unused comment handlers

  return (
    <div className={styles.adminHome}>
      {/* Welcome Banner (Hebrew): header + fruits in a single row, center and back animation */}
      <div className={`${styles.heroHeader} ${styles.heroRow} ${styles.allowMotion}`}>
        <h1
          className={`${styles.welcomeHeader} ${animateBanner ? styles.toCenterRight : ''}`}
        >
          ברוך הבא, {username}
        </h1>
        <div
          className={`${styles.fruitRow} ${animateBanner ? styles.toCenterLeft : ''}`}
        >
          <Apple size={24} />
          <Carrot size={24} />
          <Leaf size={24} />
          <Heart size={24} />
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
            activeTab === "reviews" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("reviews")}
        >
          <FileText size={18} />
          ניהול מלאי
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
                    {recipe.imageUrl ? (
                      <img src={recipe.imageUrl} alt={recipe.name} className={styles.recipeThumb} />
                    ) : (
                      <span className={styles.recipeEmoji}>{recipe.emoji || '🍽️'}</span>
                    )}
                  </div>
                  <div className={styles.recipeContent}>
                    <h3 className={styles.recipeTitle}>{recipe.name}</h3>
                    <p className={styles.recipeCategory}>{recipe.category}</p>
                    <div className={styles.recipeStats}>
                      <div className={styles.recipeStat}>
                        <Eye size={14} />
                        <span>{Number(randViews1).toLocaleString()}</span>
                      </div>
                      <div className={styles.recipeStat}>
                        <Star size={14} />
                        <span>{randRating1.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.recipeActions}>
                    
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Users */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>משתמשים אחרונים</h2>
            <div className={styles.commentsList}>
              {recentUsersList.map((u) => (
                <div key={u.id} className={styles.commentCard}>
                  <div className={styles.commentHeader}>
                    <div className={styles.commentUser}>
                      <div className={styles.userAvatar}>
                        <Users size={16} />
                      </div>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{u.name}</span>
                        <span className={styles.commentTime}>{u.email}</span>
                      </div>
                    </div>
                    <div className={styles.commentMeta}>
                      <span className={styles.statusBadge}>
                        {u.role}
                      </span>
                      {u.createdAt && (
                        <span className={styles.dateBadge}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {recentUsersList.length === 0 && (
                <div className={styles.noComments}>אין נתונים להצגה כרגע.</div>
              )}
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
          {/* Statistics Cards (filtered) FIRST */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>סטטיסטיקות </h2>
            <div className={styles.statsGrid}>
              {statistics.map((stat, index) => (
                <div key={`an-stat-${index}`} className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <div className={styles.statIcon} style={{ backgroundColor: stat.color }}>
                      {React.createElement(stat.icon, { size: 20 })}
                    </div>
                    <div className={styles.statChange}>
                      <TrendingUp size={14} />
                      <span>{stat.change}</span>
                    </div>
                  </div>
                  <div className={styles.statContent}>
                    <h3 className={styles.statValue}>{stat.value.toLocaleString()}</h3>
                    <p className={styles.statLabel}>{stat.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

         
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>פילוח הזמנות </h2>
            <div className={styles.statsGrid}>
              {(() => {
                const d = ordersByStatus || {};
                const items = [
                  { label: 'ממתינות', key: 'pending' },
                  { label: 'בהכנה', key: 'preparing' },
                  { label: 'בדרך', key: 'out_for_delivery' },
                  { label: 'הושלמו', key: 'complete' },
                  { label: 'בוטלו', key: 'cancelled' },
                ];
                return items.map((it) => (
                  <div key={it.key} className={styles.statCard}>
                    <div className={styles.statContent}>
                      <h3 className={styles.statValue}>{Number(d[it.key] || 0).toLocaleString()}</h3>
                      <p className={styles.statLabel}>{it.label}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Popular Recipes (filtered) */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>מתכונים פופולריים </h2>
            <div className={styles.recipesGrid}>
              {popularRecipes.map((recipe, index) => (
                <div key={`an-recipe-${index}`} className={styles.recipeCard}>
                  <div className={styles.recipeImage}>
                    {recipe.imageUrl ? (
                      <img src={recipe.imageUrl} alt={recipe.name} className={styles.recipeThumb} />
                    ) : (
                      <span className={styles.recipeEmoji}>{recipe.emoji || '🍽️'}</span>
                    )}
                  </div>
                  <div className={styles.recipeContent}>
                    <h3 className={styles.recipeTitle}>{recipe.name}</h3>
                    <p className={styles.recipeCategory}>{recipe.category}</p>
                    <div className={styles.recipeStats}>
                      <div className={styles.recipeStat}>
                        <Eye size={14} />
                        <span>{Number(randViews1).toLocaleString()}</span>
                      </div>
                      <div className={styles.recipeStat}>
                        <Star size={14} />
                        <span>{randRating1.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Users (filtered by createdAt if available) */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>משתמשים אחרונים (מסונן)</h2>
            <div className={styles.commentsList}>
              {recentUsersList.filter(u => withinRange(u.createdAt)).map((u) => (
                <div key={`an-u-${u.id}`} className={styles.commentCard}>
                  <div className={styles.commentHeader}>
                    <div className={styles.commentUser}>
                      <div className={styles.userAvatar}>
                        <Users size={16} />
                      </div>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{u.name}</span>
                        <span className={styles.commentTime}>{u.email}</span>
                      </div>
                    </div>
                    <div className={styles.commentMeta}>
                      <span className={styles.statusBadge}>{u.role}</span>
                      {u.createdAt && (
                        <span className={styles.dateBadge}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {recentUsersList.filter(u => withinRange(u.createdAt)).length === 0 && (
                <div className={styles.noComments}>אין נתונים להצגה כרגע.</div>
              )}
            </div>
          </div>
        </div>
      )}

      

      {activeTab === 'reviews' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>ניהול מלאי מהיר לפי קטגוריה</h2>
          {/* Category Buttons */}
          <div className={styles.quickActionsGrid}>
            {Array.from(new Set((recipes || []).map(r => r.category || r.category_name || 'ללא קטגוריה')))
              .sort()
              .map(cat => (
                <button
                  key={cat || 'none'}
                  className={styles.actionCard}
                  onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
                >
                  <div className={styles.actionContent}>
                    <h3 className={styles.actionTitle}>{cat || 'ללא קטגוריה'}</h3>
                    <p className={styles.actionDescription}>
                      {expandedCats[cat] ? 'סגור רשימה' : 'פתח רשימה'}
                    </p>
                  </div>
                </button>
              ))}
          </div>

          {/* Category Dropdowns */}
          {Array.from(new Set((recipes || []).map(r => r.category || r.category_name || 'ללא קטגוריה')))
            .sort()
            .map(cat => {
              const items = (recipes || []).filter(r => (r.category || r.category_name || 'ללא קטגוריה') === cat);
              if (!expandedCats[cat]) return null;
              return (
                <div key={`cat-${cat || 'none'}`} className={styles.section}>
                  <h3 className={styles.sectionTitle}>{cat || 'ללא קטגוריה'}</h3>
                  <div className={styles.statsGrid}>
                    {items.map((r) => {
                      const rid = r.id || r.recipe_id;
                      const stock = stocks[rid]?.value ?? '';
                      const isLoading = !!stocks[rid]?.loading;
                      return (
                        <div key={rid} className={styles.statCard}>
                          <div className={styles.statContent}>
                            <h4 className={styles.statLabel} style={{ marginBottom: 8 }}>{r.title || r.name || 'מתכון'}</h4>
                            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                className={styles.input}
                                value={stock}
                                placeholder="מלאי"
                                onChange={(e)=>{
                                  setStocks((prev)=>({ ...prev, [rid]: { ...(prev[rid]||{}), value: e.target.value } }));
                                }}
                              />
                              <button
                                disabled={isLoading || !String(stock).length}
                                className={styles.actionCard}
                                style={{ padding:'6px 12px' }}
                                onClick={async()=>{
                                  // Validate: non-negative integer only
                                  const n = Number(stock);
                                  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
                                    setSaveStatus((prev)=>({ ...prev, [rid]: 'error' }));
                                    setTimeout(()=>{
                                      setSaveStatus((prev)=>{ const m={...prev}; delete m[rid]; return m; });
                                    }, 2000);
                                    return;
                                  }
                                  setStocks((prev)=>({ ...prev, [rid]: { ...(prev[rid]||{}), loading:true } }));
                                  try{
                                    await updateProductByRecipeAPI(rid, { stock: n });
                                    setSaveStatus((prev)=>({ ...prev, [rid]: 'success' }));
                                    setTimeout(()=>{
                                      setSaveStatus((prev)=>{ const n={...prev}; delete n[rid]; return n; });
                                    }, 1500);
                                  } catch (e) {
                                    setSaveStatus((prev)=>({ ...prev, [rid]: 'error' }));
                                    setTimeout(()=>{
                                      setSaveStatus((prev)=>{ const n={...prev}; delete n[rid]; return n; });
                                    }, 2500);
                                  } finally {
                                    setStocks((prev)=>({ ...prev, [rid]: { ...(prev[rid]||{}), loading:false } }));
                                  }
                                }}
                              >{isLoading ? 'שומר...' : 'שמור'}</button>
                              {saveStatus[rid] === 'success' && (
                                <span style={{ marginInlineStart: 8, color: '#059669', fontSize: 12 }}>✓ נשמר</span>
                              )}
                              {saveStatus[rid] === 'error' && (
                                <span style={{ marginInlineStart: 8, color: '#dc2626', fontSize: 12 }}>✗ שגיאה (מספר שלם ≥ 0 בלבד)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

    </div>
  );
}
