import React, { useState, useContext, useEffect } from 'react';
import { Settings as SettingsIcon, Pencil, Check, X, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../../../app/App';
import styles from './profile.module.css';
import headerStyles from '../../../layout/header/header.module.css';

import UsersList from './management/UsersList';
import Activity from './management/Activity';
import MenusList from '../../menu/Menu';

const buildProfileImageUrl = (raw) =>
  raw?.startsWith('http') ? raw : `http://localhost:3000/${raw || 'uploads/profile/default.png'}`;

export default function Profile() {
  const { currentUser } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  // View: 'activities' | 'users'
  const [activeView, setActiveView] = useState('activities');
  const [customerName, setCustomerName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileImage, setProfileImage] = useState(currentUser?.profile_image || '');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [custId, setCustId] = useState(null);
  

  const username = currentUser?.username || 'User';
  const imgSrc = buildProfileImageUrl(profileImage);

  const getUserType = () => {
    const type = currentUser?.user_type || (typeof window !== 'undefined' ? localStorage.getItem('user_type') : null);
    return (type || '').toString();
  };

  // Quick Actions handler from Activity component
  const handleActivitySelect = (key) => {
    switch (key) {
      case 'users':
        setActiveView((prev) => (prev === 'users' ? 'activities' : 'users'));
        break;
      case 'menus':
        setActiveView((prev) => (prev === 'menus' ? 'activities' : 'menus'));
        break;
      case 'stats':
      case 'reports':
      default:
        setActiveView('activities');
        break;
    }
  };
  const getHomePath = () => {
    const type = getUserType().toLowerCase();
    if (type === 'admin') return '/adminhome';
    if (type === 'courier') return '/courierhome';
    if (type === 'customer') return '/customerhome';
    return '/customerhome';
  };

  // fetch customer name
  useEffect(() => {
    if (!currentUser?.user_id) return;
    fetch(`http://localhost:3000/api/customers/by-user/${currentUser.user_id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setCustomerName(data.name || '');
        if (typeof data.cust_id !== 'undefined') setCustId(data.cust_id);
        // subscription removed
      })
      .catch(() => {});
  }, [currentUser?.user_id]);

  const handleSaveName = () => {
    fetch(`http://localhost:3000/api/customers/${currentUser.user_id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: customerName }),
    }).then(() => setIsEditingName(false));
  };


  const handleUpload = async () => {
    if (!currentUser?.user_id || !selectedFile) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('image', selectedFile);
      const res = await fetch(`http://localhost:3000/api/users/${currentUser.user_id}/profile-image`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (data?.profile_image) setProfileImage(data.profile_image);
      setShowAvatarModal(false);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.profileWrapper}>
      {/* Top bar with logo and back arrow, matching Header placement */}
      <div className={headerStyles.container} style={{ marginTop: 0 }}>
        <div className={headerStyles.row}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className={styles.iconCircleBtn}
              onClick={() => navigate(getHomePath())}
              aria-label="חזרה"
              title="חזרה"
            >
              <ArrowLeft size={18} />
            </button>
            <Link to={getHomePath()} className={headerStyles.logo}>
              <span className={headerStyles.brand}>Nutribite</span>
            </Link>
          </div>
          <div />
        </div>
      </div>
      <section className={`${styles.header} ${styles.headerRight}`}>
        <img
          className={styles.avatar}
          src={previewUrl || imgSrc}
          alt="Profile"
          onClick={() => setShowAvatarModal(true)}
        />
        <div className={styles.userMeta}>
          <div className={styles.topRow}>
            <div className={styles.username}>{username}</div>
            
              <SettingsIcon size={18} />
            
          </div>
          <div className={styles.name}>
            {isEditingName ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ padding: 6, border: '1px solid #e5e7eb', borderRadius: 6 }}
                />
                <button className={styles.iconCircleBtn} onClick={handleSaveName} aria-label="Save name"><Check size={16} /></button>
                <button className={styles.iconCircleBtn} onClick={() => setIsEditingName(false)} aria-label="Cancel edit"><X size={16} /></button>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>{customerName || username}</span>
                <button className={styles.iconCircleBtn} onClick={() => setIsEditingName(true)} aria-label="Edit name"><Pencil size={16} /></button>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowAvatarModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <img
              src={previewUrl || imgSrc}
              alt="Preview"
              style={{ width: '100%', borderRadius: 12, objectFit: 'cover', aspectRatio: '1 / 1' }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <label className={styles.fileLabel}>
                Choose photo
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
              <button disabled={!selectedFile || uploading} onClick={handleUpload}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            <button className={styles.iconBtn} onClick={() => setShowAvatarModal(false)}>×</button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      

      <section className={styles.content}>
        {/* Always show quick actions */}
        <Activity onSelect={handleActivitySelect} />

        {/* Smooth expanding panel for UsersList (no subheader, toggled from Activity) */}
        <div className={`${styles.expand} ${activeView === 'users' ? styles.expandOpen : ''}`}>
          <UsersList />
        </div>

        {/* Smooth expanding panel for MenusList (no subheader, toggled from Activity) */}
        <div className={`${styles.expand} ${activeView === 'menus' ? styles.expandOpen : ''}`}>
          <MenusList />
        </div>
      </section>

    </div>
  );
}
