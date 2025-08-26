import React from 'react';
import styles from '../../home/home.module.css'
import { Users, Package, TrendingUp, Calendar } from 'lucide-react';


export default function Activity({ onSelect }) {
    return (
        <div className={styles.actionsSection}>
        <h2 className={styles.sectionTitle}>פעולות מהירות</h2>
        <div className={styles.actionsGrid}>
          <button className={styles.actionButton} onClick={() => onSelect && onSelect('users')}>
            <Users size={20} />
            <span>ניהול משתמשים</span>
          </button>
          <button className={styles.actionButton} onClick={() => onSelect && onSelect('menus')}>
            <Package size={20} />
            <span>ניהול תפריטים</span>
          </button>
          <button className={styles.actionButton} onClick={() => onSelect && onSelect('stats')}>
            <TrendingUp size={20} />
            <span>סטטיסטיקות</span>
          </button>
          <button className={styles.actionButton} onClick={() => onSelect && onSelect('reports')}>
            <Calendar size={20} />
            <span>דוחות</span>
          </button>
        </div>
      </div>
    )
}