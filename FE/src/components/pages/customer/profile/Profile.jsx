import React, { useState, useContext, useEffect } from 'react';
import { Settings, Pencil, Check, X } from 'lucide-react';
import styles from './profile.module.css';
import { AuthContext } from '../../../../app/App';

const buildProfileImageUrl = (raw) => {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^uploads\//i.test(raw) || /\/uploads\//i.test(raw)) {
    return `http://localhost:3000/${raw.replace(/^\/+/, '')}`;
  }
  return `http://localhost:3000/uploads/profile/${raw}`;
};

export default function Profile() {
  const { currentUser } = useContext(AuthContext) || {};
  const [activeTab, setActiveTab] = useState('my plan'); // my plan | subscribtion | my orders
  const [custId, setCustId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [profileImageOverride, setProfileImageOverride] = useState('');

  const username = currentUser?.username || currentUser?.name || 'User';
  const fullName = customerName || currentUser?.name || username;
  const imgSrc = buildProfileImageUrl(profileImageOverride || currentUser?.profile_image);

  // Fetch customer's row to get name and cust_id
  useEffect(() => {
    const userId = currentUser?.user_id;
    if (!userId) return;
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/customers/by-user/${userId}`, {
          credentials: 'include'
        });
        if (!res.ok) return; // silently ignore if not found yet
        const data = await res.json();
        if (!ignore) {
          setCustId(data.cust_id);
          if (typeof data.name === 'string') setCustomerName(data.name);
        }
      } catch (e) {
        // noop
      }
    })();
    return () => { ignore = true; };
  }, [currentUser?.user_id]);

  const handleSaveName = async () => {
    if (!custId) return;
    try {
      setSavingName(true);
      const res = await fetch(`http://localhost:3000/api/customers/${custId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: customerName })
      });
      if (!res.ok) throw new Error('Failed to update name');
      setIsEditingName(false);
    } catch (e) {
      console.error(e);
      // Optionally show a toast
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className={styles.profileWrapper}>
      <section className={styles.header}>
        <img
          className={styles.avatar}
          src={imgSrc || 'https://ui-avatars.com/api/?name=NB&background=0D8ABC&color=fff'}
          alt="Profile"
          onError={(e) => {
            e.currentTarget.src = 'https://ui-avatars.com/api/?name=NB&background=0D8ABC&color=fff';
          }}
          onClick={() => setShowAvatarModal(true)}
        />
        <div className={styles.userMeta}>
          <div className={styles.topRow}>
            <div className={styles.username}>{username}</div>
            <button
              className={styles.iconBtn}
              aria-label="my orders"
              title="my orders"
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={18} />
            </button>
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
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={handleSaveName}
                  disabled={savingName}
                  title={savingName ? 'Saving…' : 'Save name'}
                  aria-label="Save name"
                >
                  {savingName ? '…' : <Check size={16} />}
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setIsEditingName(false)}
                  title="Cancel"
                  aria-label="Cancel"
                >
                  <X size={16} />
                </button>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>{fullName}</span>
                <button
                  className={styles.iconBtn}
                  onClick={() => setIsEditingName(true)}
                  title="Edit name"
                  aria-label="Edit name"
                >
                  <Pencil size={16} />
                </button>
              </span>
            )}
          </div>
        </div>
      </section>

      {showAvatarModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowAvatarModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'grid', gap: 12 }}>
              <img
                src={previewUrl || imgSrc || 'https://ui-avatars.com/api/?name=NB&background=0D8ABC&color=fff'}
                alt="Preview"
                style={{ width: '100%', borderRadius: 12, objectFit: 'cover', aspectRatio: '1 / 1', background: '#f3f4f6' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                        const url = URL.createObjectURL(file);
                        setPreviewUrl(url);
                      }
                    }}
                  />
                </label>
                {selectedFile && <span style={{ color: '#374151', fontSize: 14 }}>{selectedFile.name}</span>}
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.iconBtn} onClick={() => setShowAvatarModal(false)} title="Close" aria-label="Close">
                  ×
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  disabled={!selectedFile || uploading}
                  onClick={async () => {
                    if (!currentUser?.user_id || !selectedFile) return;
                    try {
                      setUploading(true);
                      const fd = new FormData();
                      fd.append('image', selectedFile);
                      const res = await fetch(`http://localhost:3000/api/users/${currentUser.user_id}/profile-image`, {
                        method: 'POST',
                        credentials: 'include',
                        body: fd
                      });
                      if (!res.ok) throw new Error('Upload failed');
                      const data = await res.json();
                      if (data?.profile_image) {
                        setProfileImageOverride(data.profile_image);
                      }
                      setShowAvatarModal(false);
                      setSelectedFile(null);
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                        setPreviewUrl('');
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setUploading(false);
                    }
                  }}
                  title={uploading ? 'Uploading…' : 'Upload'}
                  aria-label="Upload"
                >
                  {uploading ? '…' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className={`${styles.tabs} ${styles.tabsRtl}`}>
        <button
          className={`${styles.tab} ${activeTab === 'my plan' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('my plan')}
        >
          התוכנית שלי
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'subscribtion' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('subscribtion')}
        >
          מנוי
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'my orders' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('my orders')}
        >
          ההזמנות שלי
        </button>
      </nav>

      <section className={`${styles.content} ${styles.rtlText}`}>
        {activeTab === 'my plan' && (
          <p>התוכנית שלי</p>
        )}

        {activeTab === 'subscribtion' && (
         <p>מנוי</p>
        )}

        {activeTab === 'my orders' && (
          <p>ההזמנות שלי</p>
        )}
      </section>
    </div>
  );
}