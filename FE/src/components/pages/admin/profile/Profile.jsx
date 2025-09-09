import React, { useState, useContext, useEffect } from 'react';
import {
  User, Shield, Key, LogOut, Edit, Users, Camera, Check, X, ArrowLeft, Settings as SettingsIcon
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../../../app/App';
import styles from './profile.module.css';
import headerStyles from '../../../layout/header/header.module.css';

const buildProfileImageUrl = (raw) =>
  raw?.startsWith('http') ? raw : `http://localhost:3000/${raw || 'uploads/profile/default.png'}`;

export default function Profile() {
  const { currentUser, handleLogout } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  // Profile data state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    profileImage: '',
    language: 'he',
    darkMode: false,
    emailNotifications: true,
    twoFactorEnabled: false,
    permissionLevel: 'מנהל ראשי',
    accountCreated: '',
    lastLogin: ''
  });

  // UI state
  const [isEditing, setIsEditing] = useState({});
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  const username = currentUser?.username || 'Admin';
  const imgSrc = buildProfileImageUrl(profileData.profileImage);

  // Load profile data
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        // Simulate API call - replace with actual API
        const mockData = {
          fullName: 'מנהל ראשי',
          email: currentUser?.email || 'admin@nutribite.com',
          phone: '+972-50-123-4567',
          profileImage: currentUser?.profile_image || '',
          language: 'he',
          darkMode: false,
          emailNotifications: true,
          twoFactorEnabled: false,
          permissionLevel: 'מנהל ראשי',
          accountCreated: '2024-01-15',
          lastLogin: new Date().toISOString().split('T')[0]
        };
        setProfileData(mockData);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadProfileData();
    }
  }, [currentUser]);

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveField = async (field) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/admin/profile/${field}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: profileData[field] }),
      });

      if (!response.ok) throw new Error(`Failed to save ${field}`);

      // Show success message
      alert(`השדה ${field} נשמר בהצלחה!`);
      setIsEditing(prev => ({ ...prev, [field]: false }));
    } catch (error) {
      console.error(`Error saving ${field}:`, error);
      alert(`שגיאה בשמירת השדה ${field}: ${error.message}`);
    }
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      // TODO: Implement actual upload API call
      const mockUrl = URL.createObjectURL(selectedFile);
      setProfileData(prev => ({ ...prev, profileImage: mockUrl }));
      setShowAvatarModal(false);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploading(false);
    }
  };

  const toggleDarkMode = () => {
    setProfileData(prev => ({ ...prev, darkMode: !prev.darkMode }));
    // TODO: Implement dark mode toggle
  };

  const toggleTwoFactor = async () => {
    if (twoFactorLoading) return; // Prevent multiple clicks
    setTwoFactorLoading(true);
    const previousValue = profileData.twoFactorEnabled;
    const newValue = !previousValue;
    setProfileData(prev => ({ ...prev, twoFactorEnabled: newValue })); // Optimistic UI update
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/admin/profile/twoFactor', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ twoFactorEnabled: newValue }),
      });

      if (!response.ok) throw new Error('Failed to update 2FA setting');

      alert(`אימות דו-שלבי ${newValue ? 'הופעל' : 'כובה'} בהצלחה!`);
    } catch (error) {
      console.error('Error updating 2FA:', error);
      alert(`שגיאה בעדכון אימות דו-שלבי: ${error.message}`);
      setProfileData(prev => ({ ...prev, twoFactorEnabled: previousValue })); // Revert on error
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Removed unused functions to fix eslint warnings:
  // handleChangePassword, handleResetPassword, handleSaveAllProfile

  const handleLogoutClick = () => {
    if (window.confirm('האם אתה בטוח שברצונך להתנתק?')) {
      handleLogout();
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className={styles.profileWrapper}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div className={styles.loadingSpinner}></div>
          <p>טוען פרופיל...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileWrapper}>
      {/* Header */}
      <div className={headerStyles.container} style={{ marginTop: 0 }}>
        <div className={headerStyles.row}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className={styles.iconCircleBtn}
              onClick={() => navigate('/adminhome')}
              aria-label="חזרה"
              title="חזרה"
            >
              <ArrowLeft size={18} />
            </button>
            <Link to="/adminhome" className={headerStyles.logo}>
              <span className={headerStyles.brand}>Nutribite</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <section className={`${styles.header} ${styles.headerRight}`}>
        <div className={styles.avatarContainer}>
          <img
            className={styles.avatar}
            src={previewUrl || imgSrc}
            alt="Profile"
            onClick={() => setShowAvatarModal(true)}
          />
          <button
            className={styles.cameraBtn}
            onClick={() => setShowAvatarModal(true)}
            title="שנה תמונת פרופיל"
          >
            <Camera size={16} />
          </button>
        </div>
        <div className={styles.userMeta}>
          <div className={styles.topRow}>
            <div className={styles.username}>{username}</div>
            <div className={styles.permissionBadge}>
              {profileData.permissionLevel}
            </div>
          </div>
          <div className={styles.name}>
            {isEditing.fullName ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  style={{ padding: 6, border: '1px solid #e5e7eb', borderRadius: 6 }}
                />
                <button className={styles.iconCircleBtn} onClick={() => handleSaveField('fullName')}>
                  <Check size={16} />
                </button>
                <button className={styles.iconCircleBtn} onClick={() => setIsEditing(prev => ({ ...prev, fullName: false }))}>
                  <X size={16} />
                </button>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>{profileData.fullName}</span>
                <button className={styles.iconCircleBtn} onClick={() => setIsEditing(prev => ({ ...prev, fullName: true }))}>
                  <Edit size={16} />
                </button>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className={styles.content}>
        {/* Personal Details Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <User size={20} />
            <h2>פרטים אישיים</h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.field}>
              <label>שם מלא</label>
              <div className={styles.fieldValue}>
                {isEditing.fullName ? (
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                  />
                ) : (
                  <span>{profileData.fullName}</span>
                )}
                <button onClick={() => isEditing.fullName ? handleSaveField('fullName') : setIsEditing(prev => ({ ...prev, fullName: !prev.fullName }))}>
                  {isEditing.fullName ? <Check size={16} /> : <Edit size={16} />}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label>אימייל מנהל</label>
              <div className={styles.fieldValue}>
                {isEditing.email ? (
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                ) : (
                  <span>{profileData.email}</span>
                )}
                <button onClick={() => isEditing.email ? handleSaveField('email') : setIsEditing(prev => ({ ...prev, email: !prev.email }))}>
                  {isEditing.email ? <Check size={16} /> : <Edit size={16} />}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label>מספר טלפון</label>
              <div className={styles.fieldValue}>
                {isEditing.phone ? (
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                ) : (
                  <span>{profileData.phone || 'לא צוין'}</span>
                )}
                <button onClick={() => isEditing.phone ? handleSaveField('phone') : setIsEditing(prev => ({ ...prev, phone: !prev.phone }))}>
                  {isEditing.phone ? <Check size={16} /> : <Edit size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Key size={20} />
            <h2>הגדרות חשבון</h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.field}>
              <label>שינוי סיסמה</label>
              <button className={styles.actionBtn}>שנה סיסמה</button>
            </div>

            <div className={styles.field}>
              <label>שחזור סיסמה</label>
              <button className={styles.actionBtn}>שלח קישור שחזור</button>
            </div>

            <div className={styles.field}>
              <label>אימות דו-שלבי (2FA)</label>
              <div className={styles.toggleContainer}>
                <span>{profileData.twoFactorEnabled ? 'מופעל' : 'כבוי'}</span>
            <button
              className={`${styles.toggleBtn} ${profileData.twoFactorEnabled ? styles.active : ''}`}
              onClick={toggleTwoFactor}
              disabled={twoFactorLoading}
              aria-busy={twoFactorLoading}
              aria-label="Toggle Two Factor Authentication"
            >
              <div className={styles.toggleSlider}></div>
            </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <SettingsIcon size={20} />
            <h2>העדפות</h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.field}>
              <label>שפה</label>
              <select
                value={profileData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
              >
                <option value="he">עברית</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>מצב כהה/בהיר</label>
              <div className={styles.toggleContainer}>
                <span>{profileData.darkMode ? 'כהה' : 'בהיר'}</span>
                <button
                  className={`${styles.toggleBtn} ${profileData.darkMode ? styles.active : ''}`}
                  onClick={toggleDarkMode}
                >
                  <div className={styles.toggleSlider}></div>
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label>התראות במייל</label>
              <div className={styles.toggleContainer}>
                <span>{profileData.emailNotifications ? 'מופעל' : 'כבוי'}</span>
                <button
                  className={`${styles.toggleBtn} ${profileData.emailNotifications ? styles.active : ''}`}
                  onClick={() => handleInputChange('emailNotifications', !profileData.emailNotifications)}
                >
                  <div className={styles.toggleSlider}></div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Management Status Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Shield size={20} />
            <h2>סטטוס ניהול</h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.field}>
              <label>רמת הרשאה</label>
              <span className={styles.statusValue}>{profileData.permissionLevel}</span>
            </div>

            <div className={styles.field}>
              <label>תאריך יצירת החשבון</label>
              <span className={styles.statusValue}>{profileData.accountCreated}</span>
            </div>

            <div className={styles.field}>
              <label>פעילות אחרונה</label>
              <span className={styles.statusValue}>{profileData.lastLogin}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <SettingsIcon size={20} />
            <h2>פעולות מהירות</h2>
          </div>
          <div className={styles.quickActions}>
            <button className={`${styles.quickActionBtn} ${styles.logoutBtn}`} onClick={handleLogoutClick}>
              <LogOut size={18} />
              צא מהחשבון
            </button>

            <button className={`${styles.quickActionBtn} ${styles.updateBtn}`} onClick={() => alert('עדכון פרטים')}>
              <Edit size={18} />
              עדכן פרטים
            </button>

            {profileData.permissionLevel === 'מנהל ראשי' && (
              <button className={`${styles.quickActionBtn} ${styles.manageBtn}`} onClick={() => navigate('/admin/users')}>
                <Users size={18} />
                נהל מנהלים נוספים
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowAvatarModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>שנה תמונת פרופיל</h3>
            <img
              src={previewUrl || imgSrc}
              alt="Preview"
              style={{ width: '100%', borderRadius: 12, objectFit: 'cover', aspectRatio: '1 / 1', margin: '20px 0' }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <label className={styles.fileLabel}>
                בחר תמונה
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
              <button disabled={!selectedFile || uploading} onClick={handleUploadAvatar}>
                {uploading ? 'מעלה...' : 'העלה'}
              </button>
            </div>
            <button className={styles.iconBtn} onClick={() => setShowAvatarModal(false)}>×</button>
          </div>
        </div>
      )}
    </div>
  );
}
