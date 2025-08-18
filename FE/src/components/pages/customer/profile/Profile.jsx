import React, { useState, useContext, useEffect } from 'react';
import { Settings, Pencil, Check, X } from 'lucide-react';
import { AuthContext } from '../../../../app/App';
import styles from './profile.module.css';

const buildProfileImageUrl = (raw) =>
  raw?.startsWith('http') ? raw : `http://localhost:3000/${raw || 'uploads/profile/default.png'}`;

export default function Profile() {
  const { currentUser } = useContext(AuthContext) || {};
  const [activeTab, setActiveTab] = useState('my plan');
  const [customerName, setCustomerName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileImage, setProfileImage] = useState(currentUser?.profile_image || '');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const username = currentUser?.username || 'User';
  const imgSrc = buildProfileImageUrl(profileImage);

  // Fetch customer name
  useEffect(() => {
    if (!currentUser?.user_id) return;
    fetch(`http://localhost:3000/api/customers/by-user/${currentUser.user_id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setCustomerName(data.name || ''))
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
      <section className={styles.header}>
        <img
          className={styles.avatar}
          src={previewUrl || imgSrc}
          alt="Profile"
          onClick={() => setShowAvatarModal(true)}
        />
        <div className={styles.userMeta}>
          <div className={styles.topRow}>
            <div className={styles.username}>{username}</div>
            <Settings size={18} />
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

      {/* Tabs */}
      <nav className={styles.tabs}>
        {['my plan', 'subscribtion', 'my orders'].map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className={styles.content}>
        {activeTab === 'my plan' && <p>My Plan</p>}
        {activeTab === 'subscribtion' && <p>Subscription</p>}
        {activeTab === 'my orders' && <p>My Orders</p>}
      </section>
    </div>
  );
}
