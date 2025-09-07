import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ChefHat, FolderOpen, Users, MessageSquare,
  Calendar, FileText, Settings, Menu, X, Home, BarChart3
} from 'lucide-react';
import styles from './adminLayoutImproved.module.css';

const AdminLayoutFinal = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'דאשבורד', icon: LayoutDashboard, english: 'Dashboard' },
    { path: '/admin/recipes', label: 'מתכונים', icon: ChefHat, english: 'Recipes' },
    { path: '/admin/categories', label: 'קטגוריות', icon: FolderOpen, english: 'Categories' },
    { path: '/admin/users', label: 'משתמשים', icon: Users, english: 'Users' },
    { path: '/admin/comments', label: 'תגובות', icon: MessageSquare, english: 'Comments' },
    { path: '/admin/weekly-menus', label: 'תפריט שבועי', icon: Calendar, english: 'Weekly Menu' },
    { path: '/admin/content', label: 'ניהול תוכן', icon: FileText, english: 'Content' },
    { path: '/admin/settings', label: 'הגדרות', icon: Settings, english: 'Settings' }
  ];

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <ChefHat size={32} />
            </div>
            {sidebarOpen && (
              <div className={styles.logoText}>
                <h2>Nutribite</h2>
                <span>Admin Panel</span>
              </div>
            )}
          </div>
          <button
            className={styles.toggleButton}
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'סגור תפריט' : 'פתח תפריט'}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className={styles.navigation}>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.path} className={styles.navItem}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                    }
                  >
                    <div className={styles.navIcon}>
                      <IconComponent size={20} />
                    </div>
                    {sidebarOpen && (
                      <div className={styles.navContent}>
                        <span className={styles.navLabel}>{item.label}</span>
                        <span className={styles.navEnglish}>{item.english}</span>
                      </div>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {sidebarOpen && (
          <div className={styles.sidebarFooter}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                <Users size={20} />
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>מנהל מערכת</span>
                <span className={styles.userRole}>Admin</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={`${styles.mainContent} ${sidebarOpen ? styles.mainContentShifted : ''}`}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <h1 className={styles.pageTitle}>
                <BarChart3 className={styles.pageIcon} />
                לוח בקרה
              </h1>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.headerActions}>
                <button className={styles.actionButton}>
                  <Home size={18} />
                  <span>חזרה לאתר</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.pageContent}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayoutFinal;
