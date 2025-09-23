import React, { useState, useContext, useEffect } from 'react';
import { Settings as SettingsIcon, Pencil, Check, X, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../../../app/App';
import styles from './profile.module.css';
import headerStyles from '../../../layout/header/header.module.css';
import Settings from './Settings';
import { listPlansAPI } from '../../../../utils/functions';

const buildProfileImageUrl = (raw) =>
  raw?.startsWith('http') ? raw : `/${(raw || 'uploads/profile/default.png').replace(/^\/+/, '')}`;

export default function Profile() {
  const { currentUser } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('התוכנית שלי');
  const [customerName, setCustomerName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileImage, setProfileImage] = useState(currentUser?.profile_image || '');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [custId, setCustId] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: string }
  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2500);
  };

  const username = currentUser?.username || 'User';
  const imgSrc = buildProfileImageUrl(profileImage);

  const getUserType = () => {
    const type = currentUser?.user_type || (typeof window !== 'undefined' ? localStorage.getItem('user_type') : null);
    return (type || '').toString();
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
    fetch(`/api/customers/by-user/${currentUser.user_id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setCustomerName(data.name || '');
        if (typeof data.cust_id !== 'undefined') setCustId(data.cust_id);
        // subscription removed
      })
      .catch(() => {});
  }, [currentUser?.user_id]);

  // fetch plans for this customer once custId is known
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        if (!custId) return;
        const rows = await listPlansAPI(custId);
        if (!ignore) setPlans(Array.isArray(rows) ? rows : []);
      } catch (_) {
        if (!ignore) setPlans([]);
      }
    })();
    return () => { ignore = true; };
  }, [custId]);

  const handleSaveName = async () => {
    try {
      const res = await fetch(`/api/customers/${currentUser.user_id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: customerName }),
      });
      if (!res.ok) {
        try { const j = await res.json(); throw new Error(j?.message || 'שמירה נכשלה'); } catch { throw new Error('שמירה נכשלה'); }
      }
      setIsEditingName(false);
      showToast('השם עודכן בהצלחה', 'success');
    } catch (e) {
      showToast(e?.message || 'שמירה נכשלה', 'error');
    }
  };


  const handleUpload = async () => {
    if (!currentUser?.user_id || !selectedFile) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('image', selectedFile);
      const res = await fetch(`/api/users/${currentUser.user_id}/profile-image`, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'העלאת תמונה נכשלה');
      }
      if (data?.profile_image) setProfileImage(data.profile_image);
      showToast('התמונה עודכנה בהצלחה', 'success');
      setShowAvatarModal(false);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    } catch (e) {
      console.error(e);
      showToast(e?.message || 'העלאת תמונה נכשלה', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.profileWrapper}>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 2000,
            padding: '8px 12px',
            borderRadius: 8,
            background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: toast.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          {toast.text}
        </div>
      )}
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
            <button
              className={styles.iconCircleBtn}
              onClick={() => setShowSettingsModal(true)}
              aria-label="הגדרות"
              title="הגדרות"
            >
              <SettingsIcon size={18} />
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
      {showSettingsModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowSettingsModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.rtlText}>
              <h3 style={{ marginTop: 0 }}>הגדרות</h3>
            </div>
            <Settings />
            <div className={styles.modalActions}>
              <button className={styles.iconBtn} onClick={() => setShowSettingsModal(false)}>סגור</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs (Hebrew, RTL) */}
      <nav className={`${styles.tabs} ${styles.tabsRtl}`}>
        {['התוכנית שלי', 'ההזמנות שלי'].map((tab) => (
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
        {activeTab === 'התוכנית שלי' && (
          <div className={styles.rtlText}>
            <h3 style={{ marginTop: 0 }}>התוכניות שלי</h3>

            {/* Current active plan (latest by created desc from API) */}
            <div style={{ marginTop: 8, marginBottom: 6, fontWeight: 600 }}>תוכנית פעילה נוכחית</div>
            {plans && plans.length > 0 ? (
              <div
                role="button"
                onClick={() => navigate('/plan')}
                title="עבור לתוכנית"
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>תוכנית נוכחית #{plans[0].plan_id}</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>
                    יעד יומי: {plans[0].calories_per_day ?? '—'} קלוריות • דיאטה: {plans[0].diet_type_name || '—'}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/plan-maker'); }}
                  className={styles.primaryGradBtn}
                  title="צור חדשה"
                  aria-label="צור חדשה"
                >
                  צור חדשה
                </button>
              </div>
            ) : (
              <div
                style={{ border: '1px dashed #e5e7eb', borderRadius: 10, padding: 12, color: '#6b7280' }}
              >
                אין עדיין תוכנית פעילה. 
                <button
                  onClick={() => navigate('/plan-maker')}
                  className={styles.primaryGradBtn}
                  style={{ marginInlineStart: 8, padding: '8px 12px' }}
                >
                  צור חדשה
                </button>
              </div>
            )}

            {/* Previous plans */}
            <div style={{ marginTop: 16, marginBottom: 6, fontWeight: 600 }}>תוכניות קודמות</div>
            {plans && plans.length > 1 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {plans.slice(1).map((p) => (
                  <div
                    key={p.plan_id}
                    style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, background: '#fff' }}
                  >
                    <div style={{ fontWeight: 600 }}>תוכנית #{p.plan_id}</div>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>
                      יעד יומי: {p.calories_per_day ?? '—'} קלוריות • דיאטה: {p.diet_type_name || '—'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>אין תוכניות קודמות להצגה.</div>
            )}
          </div>
        )}

        {activeTab === 'ההזמנות שלי' && <p className={styles.rtlText}>ההזמנות שלי</p>}
      </section>

    </div>
  );
}
