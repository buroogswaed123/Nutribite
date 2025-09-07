import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styles from './adminLayout.module.css';
import AdminHeader from './AdminHeader';

/* UNUSED ADMIN COMPONENT: commented out on 2025-09-07
const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.adminContainer}>
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.logo}>
          <h2>Healthy Food Admin</h2>
        </div>
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            <li className={styles.navSection}>
              <span className={styles.sectionTitle}>ניהול</span>
              <NavLink to="/admin/dashboard" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}>
                <span className={styles.navIcon}>📊</span>
                <span className={styles.navLabel}>Dashboard</span>
              </NavLink>
              <NavLink to="/admin/recipes" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}>
                <span className={styles.navIcon}>🍽️</span>
                <span className={styles.navLabel}>Manage Recipes</span>
              </NavLink>
              <NavLink to="/admin/categories" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}>
                <span className={styles.navIcon}>📁</span>
                <span className={styles.navLabel}>Manage Categories</span>
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}>
                <span className={styles.navIcon}>👥</span>
                <span className={styles.navLabel}>Manage Users</span>
              </NavLink>
            </li>
            <li className={styles.navSection}>
              <span className={styles.sectionTitle}>תוכן</span>
              <NavLink to="/admin/comments" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}>
                <span className={styles.navIcon}>💬</span>
                <span className={styles.navLabel}>Manage Comments</span>
              </NavLink>
              <NavLink to="/admin/weekly-menus" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}>
                <span className={styles.navIcon}>📅</span>
                <span className={styles.navLabel}>Weekly Menu</span>
              </NavLink>
              <NavLink to="/admin/content" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}>
                <span className={styles.navIcon}>📝</span>
                <span className={styles.navLabel}>Content Management</span>
              </NavLink>
            </li>
            <li className={styles.navSection}>
              <span className={styles.sectionTitle}>מערכת</span>
              <NavLink to="/admin/settings" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.activeLink : ''}`}>
                <span className={styles.navIcon}>⚙️</span>
                <span className={styles.navLabel}>Settings</span>
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className={styles.footer}>
          <button className={styles.toggleBtn} onClick={toggleSidebar}>
            <span className={styles.navIcon}>{sidebarOpen ? '◁' : '▷'}</span>
            <span className={styles.navLabel}>{sidebarOpen ? 'כווץ' : 'הרחב'}</span>
          </button>
        </div>
      </aside>
      <div className={`${styles.mainSection} ${!sidebarOpen ? styles.sidebarCollapsed : ''}`}>
        <AdminHeader />
        <main className={styles.mainContent}>
          <div className={styles.contentWrapper}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
*/
