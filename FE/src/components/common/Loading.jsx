import React from 'react';
import styles from './loading.module.css';

export default function Loading({ text = 'טוען נתונים...' }) {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}>
        <div className={styles.spinner} />
        <p>{text}</p>
      </div>
    </div>
  );
}
