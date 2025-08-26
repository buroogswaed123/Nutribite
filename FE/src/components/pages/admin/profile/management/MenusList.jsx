import React from 'react';
import styles from '../../home/home.module.css';

export default function MenusList() {
  return (
    <div className={styles.recentSection}>
      <h2 className={styles.sectionTitle}>תפריטים</h2>
      <div style={{ color: '#64748b', fontSize: 14 }}>
        מסך ניהול תפריטים יתווסף כאן.
      </div>
    </div>
  );
}
