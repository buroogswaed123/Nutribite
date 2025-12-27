import React, { useState, useEffect, useContext } from 'react';
import { MapPin, Package, User, MessageCircle, X, Truck, Circle } from 'lucide-react';
import { AuthContext } from '../../../app/App';
import { useCourierUI } from '../CourierUiContext';
import styles from './CourierLayout.module.css';

const navigation = [
  { id: 'dashboard', name: 'לוח בקרה', icon: Package },
  { id: 'profile', name: 'פרופיל', icon: User },
  { id: 'support', name: 'תמיכה', icon: MessageCircle },
];

export default function CourierLayout({ children, activeSection, onSectionChange, showHeader = true }) {
  const { sidebarOpen, setSidebarOpen } = useCourierUI();
  const { currentUser } = useContext(AuthContext) || {};
  const displayName = (currentUser?.username || currentUser?.email || 'משתמש').toString();
  const [isOnline, setIsOnline] = useState(false);
  const [courierId, setCourierId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = currentUser?.user_id || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}')?.user_id : null);
        if (!uid) return;
        const res = await fetch(`/api/courier/by-user/${uid}`, { credentials: 'include' });
        if (!res.ok) return;
        const rows = await res.json();
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (!row || cancelled) return;
        setCourierId(row.courier_id);
        const status = String(row.status || '').toLowerCase();
        setIsOnline(status === 'active' || status === 'on route');
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  const toggleOnlineStatus = async () => {
    try {
      if (!courierId) return setIsOnline(prev => !prev);
      const next = !isOnline;
      const status = next ? 'active' : 'offline';
      const res = await fetch(`/api/courier/couriers/${courierId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('status update failed');
      setIsOnline(next);
      // Notify header to update status indicator
      try {
        window.dispatchEvent(new CustomEvent('courier:statusChanged'));
      } catch (_) {}
    } catch (_) {
      setIsOnline(prev => !prev);
    }
  };

  return (
    <div className={styles.app}>
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.showOverlay : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandTitle}>
            <Truck size={28} style={{ marginLeft: 16 }} />
            דף שליח
          </div>
          <button onClick={() => setSidebarOpen(false)} className={styles.closeBtn} aria-label="סגור תפריט">
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onSectionChange?.(item.id); setSidebarOpen(false); }}
                className={`${styles.navBtn} ${active ? styles.navActive : ''}`}
              >
                <Icon size={18} className={styles.navIcon} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{displayName.charAt(0).toUpperCase()}</div>
            <div>
              <div className={styles.userName}>{displayName}</div>
              <div className={styles.userRole}>שליח</div>
            </div>
          </div>
          <button
            onClick={toggleOnlineStatus}
            className={`${styles.statusToggle} ${isOnline ? styles.online : ''}`}
            aria-label={isOnline ? 'מצב מקוון - לחץ לכיבוי' : 'מצב לא מקוון - להפעלה לחץ'}
            title={isOnline ? 'כבוי - הפסק קבלת הזמנות' : 'הפעל - קבל הזמנות חדשות'}
          >
            <div className={styles.toggleTrack}>
              <div className={styles.toggleThumb} />
            </div>
            <div className={styles.statusText}>
              <Circle size={8} className={styles.statusDot} />
              <span>{isOnline ? 'עובד' : 'לא עובד'}</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
