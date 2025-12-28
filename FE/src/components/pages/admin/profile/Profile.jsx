import React, { useState, useContext, useEffect } from 'react';
import Loading from '../../../common/Loading';
import {
  User, Camera, Check, X, ArrowLeft
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
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const username = currentUser?.username || 'Admin';
  const imgSrc = buildProfileImageUrl(profileData.profileImage);

  // Load profile data
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const response = await fetch('/api/admin/users/profile/me', {
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to load profile');
        
        const data = await response.json();
        
        setProfileData({
          fullName: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          profileImage: data.profile_image || '',
          language: 'he',
          darkMode: false,
          emailNotifications: true,
          twoFactorEnabled: false,
          permissionLevel: 'מנהל ראשי',
          accountCreated: data.account_creation_time ? new Date(data.account_creation_time).toISOString().split('T')[0] : '',
          lastLogin: data.last_seen ? new Date(data.last_seen).toISOString().split('T')[0] : ''
        });
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
      const fieldMap = {
        fullName: 'full_name',
        email: 'email',
        phone: 'phone'
      };
      
      const apiField = fieldMap[field] || field;
      
      const response = await fetch('/api/admin/users/profile/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ [apiField]: profileData[field] }),
      });

      if (!response.ok) throw new Error(`Failed to save ${field}`);

      setModalMessage('השדה נשמר בהצלחה!');
      setShowModal(true);
      setIsEditing(prev => ({ ...prev, [field]: false }));
    } catch (error) {
      console.error(`Error saving ${field}:`, error);
      setModalMessage(`שגיאה בשמירת השדה: ${error.message}`);
      setShowModal(true);
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

  if (loading) {
    return (
      <div className={styles.profileWrapper}>
        <Loading text="טוען פרופיל..." />
      </div>
    );
  }

  return (
    <div className={styles.profileWrapper}>
      {/* Header */}
      <div className={headerStyles.container} style={{ marginTop: 0 }}>
        <div className={headerStyles.row} style={{ justifyContent: 'flex-start' }}>
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
          {profileData.fullName && (
            <div className={styles.name}>
              {profileData.fullName}
            </div>
          )}
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

      {/* Success/Error Modal */}
      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3>{modalMessage}</h3>
            <button 
              onClick={() => setShowModal(false)}
              style={{
                marginTop: '20px',
                padding: '10px 24px',
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              אישור
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
