import React from 'react';
import styles from './adminHeader.module.css';

const AdminHeader = () => {
  return (
    <header className={styles.adminHeader}>
      <h1>Admin Panel</h1>
      <div className={styles.userInfo}>
        {/* Placeholder for user info or logout button */}
        <span>Welcome, Admin</span>
      </div>
    </header>
  );
};

export default AdminHeader;
