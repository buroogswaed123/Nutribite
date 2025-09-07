export default function Dashboard() { return null; }
/* 
import React, { useState, useEffect } from "react";
import {
  ChefHat,
  Users,
  MessageSquare,
  Calendar,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import styles from "./dashboard.module.css";

// UNUSED ADMIN COMPONENT: stubbed on 2025-09-07 (original implementation removed to avoid JSX parse issues)
// export default function Dashboard() { return null; }
          totalUsers: 153,
          pendingComments: 12,
          weeklyMenus: 36,
          activeUsers: 87,
          newUsers: 24,
          recipeGrowth: 12.5,
          userGrowth: 8.3,
          weeklyVisits: 1500,
          newRecipes: 12,
        });

        // Set personalized welcome message with richer content and styling
        const userName = "User"; // Replace with actual user data from auth context or API
        const messages = [
          <>
            <h2 style={{ color: "#a3bffa", marginBottom: "8px" }}>
              Welcome back, {userName}!
            </h2>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#cbd5e1",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              We're excited to have you here. Check out the latest updates on
              your recipes, users, and comments. Your dedication keeps the
              community thriving!
            </p>
          </>,
          <>
            <h2 style={{ color: "#a3bffa", marginBottom: "8px" }}>
              Hello, {userName}!
            </h2>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#cbd5e1",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              Here's your dashboard overview. Dive into the stats and keep your
              content fresh and engaging.
            </p>
          </>,
          <>
            <h2 style={{ color: "#a3bffa", marginBottom: "8px" }}>
              Good to see you, {userName}!
            </h2>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#cbd5e1",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              Take a moment to review the latest activity and plan your next
              steps to delight your users.
            </p>
          </>,
          <>
            <h2 style={{ color: "#a3bffa", marginBottom: "8px" }}>
              Hi, {userName}!
            </h2>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#cbd5e1",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              Let's keep your users engaged and your recipes top-notch. Your
              efforts make a difference!
            </p>
          </>,
          <>
            <h2 style={{ color: "#a3bffa", marginBottom: "8px" }}>
              Welcome, {userName}!
            </h2>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#cbd5e1",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              Time to review comments and menus. Your leadership drives the
              community forward.
            </p>
          </>,
        ];
        const randomIndex = Math.floor(Math.random() * messages.length);
        setWelcomeMessage(messages[randomIndex]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Chart data for recipes
  const recipesData = [
    { name: "Jan", recipes: 12 },
    { name: "Feb", recipes: 19 },
    { name: "Mar", recipes: 15 },
    { name: "Apr", recipes: 27 },
    { name: "May", recipes: 34 },
    { name: "Jun", recipes: 28 },
  ];

  // Chart data for users
  const usersData = [
    { name: "Jan", users: 45 },
    { name: "Feb", users: 52 },
    { name: "Mar", users: 68 },
    { name: "Apr", users: 71 },
    { name: "May", users: 83 },
    { name: "Jun", users: 87 },
  ];

  // Stat card component
  const StatCard = ({
    icon: Icon,
    title,
    value,
    change,
    isPositive,
    onClick,
  }) => (
    <div
      className={styles.statCard}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className={styles.statIcon}>
        <Icon />
      </div>
      <div className={styles.statContent}>
        <h3>{title}</h3>
        <p className={styles.statValue}>{value}</p>
        {change !== undefined && (
          <div
            className={`${styles.statChange} ${
              isPositive ? styles.positive : styles.negative
            }`}
          >
            {isPositive ? <TrendingUp /> : <TrendingDown />}
            <span>{change}% from last month</span>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.dashboardTitle}>Dashboard Overview</h1>

      {/* Personalized Welcome Section */}
      <section
        style={{
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          borderRadius: "15px",
          padding: "20px",
          marginBottom: "30px",
          color: "#f0f4f8",
          textAlign: "center",
          boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
        }}
      >
        {welcomeMessage || <p>Loading welcome message...</p>}
      </section>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <StatCard
          icon={ChefHat}
          title="Total Recipes"
          value={stats.totalRecipes.toLocaleString()}
          change={stats.recipeGrowth}
          isPositive={stats.recipeGrowth >= 0}
          onClick={() => navigate("/admin/recipes")}
        />
        <StatCard
          icon={Users}
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          change={stats.userGrowth}
          isPositive={stats.userGrowth >= 0}
          onClick={() => navigate("/admin/users")}
        />
        <StatCard
          icon={MessageSquare}
          title="Pending Comments"
          value={stats.pendingComments}
          onClick={() => navigate("/admin/comments")}
        />
        <StatCard
          icon={Calendar}
          title="Weekly Menus"
          value={stats.weeklyMenus}
          onClick={() => navigate("/admin/menus")}
        />
      </div>

      {/* Popular Recipes Section */}
      <section
        style={{
          marginTop: "40px",
          padding: "20px",
          backgroundColor: "#2a2f4a",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          color: "#e0e7ff",
        }}
      >
        <h2
          style={{
            fontSize: "1.8rem",
            fontWeight: "700",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          מתכונים פופולריים
        </h2>
        <div
          style={{
            display: "flex",
            gap: "20px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Example Recipe Cards */}
          <div
            style={{
              backgroundColor: "#3b4268",
              borderRadius: "15px",
              width: "250px",
              padding: "15px",
              boxShadow: "0 6px 15px rgba(0,0,0,0.3)",
              position: "relative",
              cursor: "pointer",
              transition: "transform 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <img
              src="https://via.placeholder.com/250x150.png?text=עוגת+שוקולד+קטו"
              alt="עוגת שוקולד קטו"
              style={{ borderRadius: "12px", width: "100%", marginBottom: "10px" }}
            />
            <h3 style={{ fontWeight: "700", fontSize: "1.2rem", marginBottom: "5px" }}>
              עוגת שוקולד קטו
            </h3>
            <p style={{ color: "#9ca3af", marginBottom: "10px" }}>קינוחים</p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "600",
                fontSize: "0.9rem",
              }}
            >
              <span>4.9⭐</span>
              <span>1,650 צפיות</span>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                style={{
                  backgroundColor: "#4c51bf",
                  border: "none",
                  borderRadius: "8px",
                  color: "#e0e7ff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: "700",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#6b7bff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4c51bf")}
              >
                +
              </button>
              <button
                style={{
                  backgroundColor: "#4c51bf",
                  border: "none",
                  borderRadius: "8px",
                  color: "#e0e7ff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: "700",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#6b7bff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4c51bf")}
              >
                👁️
              </button>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#3b4268",
              borderRadius: "15px",
              width: "250px",
              padding: "15px",
              boxShadow: "0 6px 15px rgba(0,0,0,0.3)",
              position: "relative",
              cursor: "pointer",
              transition: "transform 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <img
              src="https://via.placeholder.com/250x150.png?text=פנקייקס+טבעוניים"
              alt="פנקייקס טבעוניים"
              style={{ borderRadius: "12px", width: "100%", marginBottom: "10px" }}
            />
            <h3 style={{ fontWeight: "700", fontSize: "1.2rem", marginBottom: "5px" }}>
              פנקייקס טבעוניים
            </h3>
            <p style={{ color: "#9ca3af", marginBottom: "10px" }}>ארוחת בוקר</p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "600",
                fontSize: "0.9rem",
              }}
            >
              <span>4.6⭐</span>
              <span>1,890 צפיות</span>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                style={{
                  backgroundColor: "#4c51bf",
                  border: "none",
                  borderRadius: "8px",
                  color: "#e0e7ff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: "700",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#6b7bff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4c51bf")}
              >
                +
              </button>
              <button
                style={{
                  backgroundColor: "#4c51bf",
                  border: "none",
                  borderRadius: "8px",
                  color: "#e0e7ff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: "700",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#6b7bff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4c51bf")}
              >
                👁️
              </button>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#3b4268",
              borderRadius: "15px",
              width: "250px",
              padding: "15px",
              boxShadow: "0 6px 15px rgba(0,0,0,0.3)",
              position: "relative",
              cursor: "pointer",
              transition: "transform 0.3s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <img
              src="https://via.placeholder.com/250x150.png?text=סלט+קינואה+בריא"
              alt="סלט קינואה בריא"
              style={{ borderRadius: "12px", width: "100%", marginBottom: "10px" }}
            />
            <h3 style={{ fontWeight: "700", fontSize: "1.2rem", marginBottom: "5px" }}>
              סלט קינואה בריא
            </h3>
            <p style={{ color: "#9ca3af", marginBottom: "10px" }}>סלטים</p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: "600",
                fontSize: "0.9rem",
              }}
            >
              <span>4.8⭐</span>
              <span>2,450 צפיות</span>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                style={{
                  backgroundColor: "#4c51bf",
                  border: "none",
                  borderRadius: "8px",
                  color: "#e0e7ff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: "700",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#6b7bff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4c51bf")}
              >
                +
              </button>
              <button
                style={{
                  backgroundColor: "#4c51bf",
                  border: "none",
                  borderRadius: "8px",
                  color: "#e0e7ff",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: "700",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#6b7bff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4c51bf")}
              >
                👁️
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        <div className={styles.chartContainer}>
          <h3>Recipes Added</h3>
          <div className={styles.chartWrapper}>
            <BarChart width={400} height={300} data={recipesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="recipes" fill="#3b82f6" />
            </BarChart>
          </div>
        </div>
        <div className={styles.chartContainer}>
          <h3>User Activity</h3>
          <div className={styles.chartWrapper}>
            <LineChart width={400} height={300} data={usersData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#10b981"
                strokeWidth={2}
              />
            </LineChart>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.recentActivity}>
        <h3>Recent Activity</h3>
        <div className={styles.activityList}>
          <div
            className={styles.activityItem}
            onClick={() => navigate("/admin/users")}
            style={{ cursor: "pointer" }}
          >
            <div className={styles.activityIcon}>
              <Users />
            </div>
            <div className={styles.activityContent}>
              <p>
                <strong>24</strong> new users registered today
              </p>
              <span className={styles.activityTime}>2 hours ago</span>
            </div>
          </div>
          <div
            className={styles.activityItem}
            onClick={() => navigate("/admin/recipes")}
            style={{ cursor: "pointer" }}
          >
            <div className={styles.activityIcon}>
              <ChefHat />
            </div>
            <div className={styles.activityContent}>
              <p>
                <strong>5</strong> new recipes added
              </p>
              <span className={styles.activityTime}>5 hours ago</span>
            </div>
          </div>
          <div
            className={styles.activityItem}
            onClick={() => navigate("/admin/comments")}
            style={{ cursor: "pointer" }}
          >
            <div className={styles.activityIcon}>
              <MessageSquare />
            </div>
            <div className={styles.activityContent}>
              <p>
                <strong>12</strong> new comments waiting for approval
              </p>
              <span className={styles.activityTime}>1 day ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Client Comments Section */}
      <section
        style={{
          marginTop: "40px",
          padding: "20px",
          backgroundColor: "#2a2f4a",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          color: "#e0e7ff",
        }}
      >
        <h2
          style={{
            fontSize: "1.8rem",
            fontWeight: "700",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          תגובות אחרונות
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          {/* Example Comment Cards */}
          <div
            style={{
              backgroundColor: "#3b4268",
              borderRadius: "15px",
              padding: "15px",
              boxShadow: "0 6px 15px rgba(0,0,0,0.3)",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "2px solid #34d399",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#34d399",
                  fontWeight: "700",
                  fontSize: "1.2rem",
                }}
              >
                ש
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: "700" }}>שרה כהן</p>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
                  לפני 2 שעות
                </p>
              </div>
            </div>
            <h4 style={{ margin: "0 0 5px 0" }}>סלט קינואה בריא</h4>
            <p style={{ margin: "0 0 10px 0" }}>
              מתכון מעולה! קל להכנה וטעמים מאוד
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                style={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #f87171",
                  borderRadius: "8px",
                  color: "#f87171",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: "700",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f87171")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#1f2937")
                }
              >
                מחק ✖
              </button>
              <button
                style={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #34d399",
                  borderRadius: "8px",
                  color: "#34d399",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: "700",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#34d399")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#1f2937")
                }
              >
                אשר ✔
              </button>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#3b4268",
              borderRadius: "15px",
              padding: "15px",
              boxShadow: "0 6px 15px rgba(0,0,0,0.3)",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "15px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "2px solid #34d399",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#34d399",
                  fontWeight: "700",
                  fontSize: "1.2rem",
                }}
              >
                ד
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: "700" }}>דוד לוי</p>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
                  לפני 4 שעות
                </p>
              </div>
            </div>
            <h4 style={{ margin: "0 0 5px 0" }}>פנקייקס טבעוניים</h4>
            <p style={{ margin: "0 0 10px 0" }}>
              הצלחתי להכין עם הילדים, כולם אהבו!
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                style={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #f87171",
                  borderRadius: "8px",
                  color: "#f87171",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontWeight: "700",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f87171")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#1f2937")
                }
              >
                מחק ✖
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
/*
{{ ... }}
        </div>
      </section>
    </div>
  );
};
 */
 
