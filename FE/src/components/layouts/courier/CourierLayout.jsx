import React, { useState } from 'react';
import {
  MapPin,
  Package,
  User,
  MessageCircle,
  Menu as MenuIcon,
  X,
  Truck
} from 'lucide-react';
import styles from './CourierLayout.module.css';

const navigation = [
  { id: 'dashboard', name: 'לוח בקרה', icon: Package },
  { id: 'profile', name: 'פרופיל', icon: User },
  { id: 'support', name: 'תמיכה', icon: MessageCircle },
];

export default function CourierLayout({ children, activeSection, onSectionChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.app}>
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
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
          <div>
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
          </div>
        </nav>
      </div>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.headerStart}>
              <div className={styles.userRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={styles.avatar}>A</div>
                  <div>
                    <div>ברוך השב, אלקס</div>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#16a34a', fontSize: 12 }}>
                      <span className={styles.statusDotSmall} />
                      <span>מחובר</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.headerCenter}>
              <div className={styles.title}>
                {navigation.find(item => item.id === activeSection)?.name}
              </div>
            </div>
            <div className={styles.headerEnd}>
              <button onClick={() => setSidebarOpen(true)} className={styles.menuBtn} aria-label="פתח תפריט">
                <MenuIcon size={24} />
              </button>
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
