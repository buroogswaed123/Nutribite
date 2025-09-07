import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styles from './adminLayout.module.css';
import AdminHeader from './AdminHeader';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.adminContainer}>
      <aside className={sidebarOpen ? styles.sidebar : styles.sidebarCollapsed}>
        <div className={styles.logo} onClick={toggleSidebar} style={{ cursor: 'pointer' }}>
          <h2>Healthy Food Admin</h2>
        </div>
        <nav className={styles.nav}>
          <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? styles.activeLink : ''}>Dashboard</NavLink>
          <NavLink to="/admin/recipes" className={({ isActive }) => isActive ? styles.activeLink : ''}>Manage Recipes</NavLink>
          <NavLink to="/admin/categories" className={({ isActive }) => isActive ? styles.activeLink : ''}>Manage Categories</NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => isActive ? styles.activeLink : ''}>Manage Users</NavLink>
          <NavLink to="/admin/comments" className={({ isActive }) => isActive ? styles.activeLink : ''}>Manage Comments</NavLink>
          <NavLink to="/admin/weekly-menus" className={({ isActive }) => isActive ? styles.activeLink : ''}>Weekly Menu</NavLink>
          <NavLink to="/admin/content" className={({ isActive }) => isActive ? styles.activeLink : ''}>Content Management</NavLink>
          <NavLink to="/admin/settings" className={({ isActive }) => isActive ? styles.activeLink : ''}>Settings</NavLink>
        </nav>
        <button className={styles.toggleBtn} onClick={toggleSidebar}>
          {sidebarOpen ? 'Collapse' : 'Expand'}
        </button>
      </aside>
      <div className={styles.mainSection}>
        <AdminHeader />
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
