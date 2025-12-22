import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  TrendingUp,
  Star,
  MapPin,
  Package,
  Calendar,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { mockCourierProfile, mockEarnings } from './data/courierMockData.js';
import styles from './courierProfile.module.css';

export default function CourierProfile() {
  const [isOnline, setIsOnline] = useState(mockCourierProfile.isOnline);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const formatILS = (n) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);
  // Local editable profile state
  const [profile, setProfile] = useState({
    name: mockCourierProfile.name,
    phone: mockCourierProfile.phone,
    email: mockCourierProfile.email,
    city: mockCourierProfile.city || 'חיפה',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ phone: profile.phone, email: profile.email, city: profile.city });

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
    console.log('Toggling online status:', !isOnline);
  };

  const getEarningsData = () => {
    switch (selectedPeriod) {
      case 'today': return mockEarnings.today;
      case 'week': return mockEarnings.week;
      case 'month': return mockEarnings.month;
      default: return mockEarnings.week;
    }
  };

  const earningsData = getEarningsData();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>{mockCourierProfile.name.charAt(0)}</div>
            <div>
              <div className={styles.name}>{mockCourierProfile.name}</div>
              <div className={styles.ratingRow}>
                <Star size={16} color="#f59e0b" />
                <span>{mockCourierProfile.rating}</span>
                <span className={styles.ml8Gray}>({mockCourierProfile.totalDeliveries} מסירות)</span>
              </div>
            </div>
          </div>
          <div>
            <div className={styles.rowFlex12}>
              <span className={styles.label}>סטטוס:</span>
              <button onClick={toggleOnlineStatus} className={`${styles.statusBtn} ${isOnline ? styles.statusOnline : styles.statusOffline}`}>
                {isOnline ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                <span>{isOnline ? 'מחובר' : 'מנותק'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <h3 className={styles.h3Title}>פרטי קשר</h3>
          {!isEditing ? (
            <button
              onClick={() => { setIsEditing(true); setForm({ phone: profile.phone, email: profile.email, city: profile.city }); }}
              className={styles.primaryBtn}
            >
              עריכת פרטים
            </button>
          ) : (
            <div className={styles.btnRow}>
              <button onClick={() => { setProfile({ ...profile, ...form }); setIsEditing(false); }}
                className={styles.successBtn}>
                שמור
              </button>
              <button onClick={() => { setIsEditing(false); setForm({ phone: profile.phone, email: profile.email, city: profile.city }); }}
                className={styles.neutralBtn}>
                בטל
              </button>
            </div>
          )}
        </div>
        <div className={styles.grid2}>
          <div className={styles.row}>
            <Phone size={20} color="#9ca3af" />
            <div>
              <div className={styles.label}>טלפון</div>
              {!isEditing ? (
                <div className={styles.value}>{profile.phone}</div>
              ) : (
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={`${styles.value} ${styles.input}`} />
              )}
            </div>
          </div>
          <div className={styles.row}>
            <Mail size={20} color="#9ca3af" />
            <div>
              <div className={styles.label}>אימייל</div>
              {!isEditing ? (
                <div className={styles.value}>{profile.email}</div>
              ) : (
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`${styles.value} ${styles.input} ${styles.ltr}`} />
              )}
            </div>
          </div>
          <div className={styles.row}>
            <MapPin size={20} color="#9ca3af" />
            <div>
              <div className={styles.label}>עיר</div>
              {!isEditing ? (
                <div className={styles.value}>{profile.city}</div>
              ) : (
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={`${styles.value} ${styles.input}`} />
              )}
            </div>
          </div>
          <div className={styles.row}>
            <Calendar size={20} color="#9ca3af" />
            <div>
              <div className={styles.label}>הצטרף</div>
              <div className={styles.value}>{new Date(mockCourierProfile.joinDate).toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeadLg}>
          <h3 className={styles.h3Title}>סיכום הכנסות</h3>
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className={styles.select}>
            <option value="today">היום</option>
            <option value="week">השבוע</option>
            <option value="month">החודש</option>
          </select>
        </div>
        <div className={styles.grid3}>
          <div className={`${styles.tile} ${styles.tileGreen}`}>
            <div className={styles.center}><span className={styles.currencyIcon}>₪</span></div>
            <div className={styles.tileValue}>{formatILS(earningsData.earnings)}</div>
            <div className={styles.tileLabel}>הכנסה בסיסית</div>
          </div>
          <div className={`${styles.tile} ${styles.tileBlue}`}>
            <div className={styles.center}><TrendingUp size={32} color="#059669" /></div>
            <div className={styles.tileValue}>{formatILS(earningsData.tips)}</div>
            <div className={styles.tileLabel}>טיפים</div>
          </div>
          <div className={`${styles.tile} ${styles.tilePurple}`}>
            <div className={styles.center}><Package size={32} color="#059669" /></div>
            <div className={styles.tileValue}>{earningsData.deliveries}</div>
            <div className={styles.tileLabel}>מסירות</div>
          </div>
        </div>
        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryTitle}>סה"כ הכנסות</span>
            <span className={styles.summaryValue}>{formatILS(earningsData.earnings + earningsData.tips)}</span>
          </div>
          <div className={styles.summaryNote}>
            ממוצע לכל מסירה: {formatILS((earningsData.earnings + earningsData.tips) / Math.max(1, earningsData.deliveries))}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.perfTitle}>ביצועים</h3>
        <div className={styles.grid2}>
          <div>
            <div className={styles.perfRow}>
              <span className={styles.label}>דירוג לקוחות</span>
              <span className={styles.strongDark}>{mockCourierProfile.rating}/5.0</span>
            </div>
            <div className={styles.progress}>
              <div className={styles.progressFillYellow} style={{ width: `${(mockCourierProfile.rating / 5) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className={styles.perfRow}>
              <span className={styles.label}>שיעור השלמה</span>
              <span className={styles.strongDark}>98.5%</span>
            </div>
            <div className={styles.progress}>
              <div className={styles.progressFillGreen} style={{ width: '94.2%' }} />
            </div>
          </div>
          <div>
            <div className={styles.perfRow}>
              <span className={styles.label}>סה"כ מסירות</span>
              <span className={styles.strongDark}>{mockCourierProfile.totalDeliveries}</span>
            </div>
            <div className={styles.progress}>
              <div className={styles.progressFillGreen} style={{ width: '85%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.perfTitle}>פעולות מהירות</h3>
        <div className={styles.grid2}>
          <button className={styles.quickBtn}>
            <div className={styles.quickTitle}><User size={24} color="#059669" /> עדכון פרופיל</div>
            <div className={styles.quickSub}>שנה פרטי קשר</div>
          </button>
          <button className={styles.quickBtn}>
            <div className={styles.quickTitle}><span className={styles.quickCurrency}>₪</span> הגדרות תשלום</div>
            <div className={styles.quickSub}>ניהול אמצעי תשלום</div>
          </button>
        </div>
      </div>
    </div>
  );
}
