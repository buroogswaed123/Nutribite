import React from 'react';
import styles from './home.module.css';
import Orders from './Orders';

export default function CourierHome() {
  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Courier Dashboard</h1>
          <p className={styles.subtitle}>Track today’s orders and deliveries</p>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>New</div>
            <div className={styles.statValue}>8</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>In Transit</div>
            <div className={styles.statValue}>12</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Delivered</div>
            <div className={styles.statValue}>23</div>
          </div>
        </div>
      </header>

      <section className={styles.content}>
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Filters</h3>
          <div className={styles.filterGroup}>
            <label>Status</label>
            <select>
              <option value="all">All</option>
              <option value="new">New</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Today Only</label>
            <input type="checkbox" defaultChecked />
          </div>
        </aside>

        <main className={styles.main}>
          <div className={styles.sectionHeader}>
            <h2>Orders</h2>
          </div>
          <Orders />
        </main>
      </section>
    </div>
  );
}


