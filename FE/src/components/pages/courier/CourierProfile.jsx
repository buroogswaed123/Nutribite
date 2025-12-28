import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  TrendingUp,
  Star,
  MapPin,
  Package,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { mockCourierProfile, mockEarnings } from './data/courierMockData.js';
import { AuthContext } from '../../../app/App';
import styles from './courierProfile.module.css';

export default function CourierProfile() {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext) || {};
  const [courierId, setCourierId] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const formatILS = (n) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);
  
  // Local editable profile state
  const [profile, setProfile] = useState({
    name: mockCourierProfile.name,
    phone: mockCourierProfile.phone,
    email: mockCourierProfile.email,
    city: mockCourierProfile.city || 'חיפה',
    profilePicture: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone, email: profile.email, city: profile.city });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Resolve courier id, status, and profile data from backend
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
        if (!row) return;
        if (cancelled) return;
        setCourierId(row.courier_id);
        
        // Use profile image from currentUser (same source as header)
        let profilePicture = null;
        if (currentUser?.profile_image) {
          const raw = currentUser.profile_image;
          if (/^https?:\/\//i.test(raw)) {
            profilePicture = raw;
          } else if (raw.startsWith('uploads/')) {
            profilePicture = `http://localhost:3000/${raw}`;
          } else {
            profilePicture = `http://localhost:3000/uploads/profile/${raw}`;
          }
        }
        
        // Update profile with actual data from database
        const profileData = {
          name: row.name || mockCourierProfile.name,
          phone: row.phone || mockCourierProfile.phone,
          email: currentUser?.email || mockCourierProfile.email,
          city: row.city || mockCourierProfile.city || 'חיפה',
          profilePicture: profilePicture,
        };
        console.log('Profile loaded:', profileData);
        setProfile(profileData);
        setForm({
          name: row.name || mockCourierProfile.name,
          phone: row.phone || mockCourierProfile.phone,
          email: currentUser?.email || mockCourierProfile.email,
          city: row.city || mockCourierProfile.city || 'חיפה',
        });
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    
    try {
      const uid = currentUser?.user_id;
      if (!uid) {
        setUploadingImage(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`/api/users/${uid}/profile-image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const imageUrl = `http://localhost:3000/${data.path}`;
        setProfile({ ...profile, profilePicture: imageUrl });
        
        // Trigger a page reload to update the header avatar
        window.location.reload();
      } else {
        console.error('Image upload failed');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!courierId) {
      setProfile({ ...profile, ...form });
      setIsEditing(false);
      return;
    }

    try {
      // Update name
      if (form.name !== profile.name) {
        await fetch(`/api/courier/couriers/${courierId}/name`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: form.name }),
        });
      }

      // Update phone
      if (form.phone !== profile.phone) {
        await fetch(`/api/courier/couriers/${courierId}/phone`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ phone: form.phone }),
        });
      }

      // Update city
      if (form.city !== profile.city) {
        await fetch(`/api/courier/couriers/${courierId}/city`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ city: form.city }),
        });
      }

      setProfile({ ...profile, ...form });
      setIsEditing(false);
    } catch (err) {
      console.error('Profile update failed:', err);
    }
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
      <button
        onClick={() => navigate('/courier/dashboard')}
        style={{
          position: 'absolute',
          left: '20px',
          top: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '50%',
          color: '#059669',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#059669';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f9fafb';
          e.currentTarget.style.color = '#059669';
        }}
        title="חזרה ללוח בקרה"
      >
        <ArrowLeft size={20} />
      </button>
      
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div style={{ position: 'relative' }}>
              {profile.profilePicture ? (
                <img 
                  src={profile.profilePicture} 
                  alt="Profile" 
                  className={styles.avatar} 
                  style={{ objectFit: 'cover', width: '48px', height: '48px', borderRadius: '999px' }}
                  onError={(e) => {
                    console.error('Image failed to load:', profile.profilePicture);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'grid';
                  }}
                />
              ) : null}
              <div className={styles.avatar} style={{ display: profile.profilePicture ? 'none' : 'grid' }}>
                {profile.name.charAt(0)}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                id="profile-pic-upload"
              />
              <label
                htmlFor="profile-pic-upload"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: '#059669',
                  color: 'white',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {uploadingImage ? '...' : '✎'}
              </label>
            </div>
            <div>
              <div className={styles.name}>{profile.name}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>@{currentUser?.username || 'משתמש'}</div>
              <div className={styles.ratingRow}>
                <Star size={16} color="#f59e0b" />
                <span>{mockCourierProfile.rating}</span>
                <span className={styles.ml8Gray}>({mockCourierProfile.totalDeliveries} מסירות)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHead}>
          <h3 className={styles.h3Title}>פרטי קשר</h3>
          {!isEditing ? (
            <button
              onClick={() => { setIsEditing(true); setForm({ name: profile.name, phone: profile.phone, email: profile.email, city: profile.city }); }}
              className={styles.primaryBtn}
            >
              עריכת פרטים
            </button>
          ) : (
            <div className={styles.btnRow}>
              <button onClick={handleSaveProfile}
                className={styles.successBtn}>
                שמור
              </button>
              <button onClick={() => { setIsEditing(false); setForm({ name: profile.name, phone: profile.phone, email: profile.email, city: profile.city }); }}
                className={styles.neutralBtn}>
                בטל
              </button>
            </div>
          )}
        </div>
        <div className={styles.grid2}>
          <div className={styles.row}>
            <User size={20} color="#9ca3af" />
            <div>
              <div className={styles.label}>שם מלא</div>
              {!isEditing ? (
                <div className={styles.value}>{profile.name}</div>
              ) : (
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`${styles.value} ${styles.input}`} />
              )}
            </div>
          </div>
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

    </div>
  );
}
