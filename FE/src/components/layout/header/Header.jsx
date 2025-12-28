// App header: top navigation, auth actions, notifications, and mobile menu
import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, ShoppingCart } from 'lucide-react';
import styles from './header.module.css';
import { AuthContext } from '../../../app/App';
import { getCurrentCustomerId } from '../../../utils/functions';
import useNotifications from '../../../hooks/useNotif';
import NotificationsPanel from '../../notifications/Notifications';
import NotificationModal from '../../notifications/NotificationModal';

// Renders responsive header with role-aware nav and notifications
export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Track scroll to toggle transparent vs solid header
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, handleLogout, currentUser } = useContext(AuthContext) || {};
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarWrapperRef = React.useRef(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [displayName, setDisplayName] = useState((currentUser?.username || currentUser?.email || '').toString());

  // Notifications hook (list/unread/mark-read/delete)
  const {
    notifications: notifList,
    loading: notifLoading,
    unreadCount,
    markRead,
    remove: deleteNotif,
    removeAll: deleteAllNotifs,
  } = useNotifications();

  // Simple helper function to check auth state
  const userLoggedIn = () => !!isLoggedIn;

  // Logout handler: clear auth and navigate home
  const onLogout = async () => {
    // If courier, set status to offline before logging out
    if (isCourier) {
      try {
        const uid = currentUser?.user_id || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}')?.user_id : null);
        if (uid) {
          const courierRes = await fetch(`/api/courier/by-user/${uid}`, { credentials: 'include' });
          if (courierRes.ok) {
            const rows = await courierRes.json();
            const row = Array.isArray(rows) ? rows[0] : rows;
            if (row?.courier_id) {
              await fetch(`/api/courier/couriers/${row.courier_id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: 'offline' })
              });
            }
          }
        }
      } catch (_) {
        // Continue with logout even if status update fails
      }
    }
    
    if (typeof handleLogout === 'function') {
      handleLogout();
    }
    // Optional: route to login after logout
    navigate('/');
  };

  const getUserType = () => {
    const type = currentUser?.user_type || (typeof window !== 'undefined' ? localStorage.getItem('user_type') : null);
    return (type || '').toString();
  };

  const getProfilePath = () => {
    const type = getUserType().toLowerCase();
    if (type === 'admin') return '/adminprofile';
    if (type === 'courier') return '/courier/profile';
    if (type === 'customer') return '/customerprofile';
    // default customer
    return '/customerprofile';
  };

  const getHomePath = () => {
    const type = getUserType().toLowerCase();
    if (type === 'admin') return '/adminhome';
    if (type === 'courier') return '/courier/dashboard';
    if (type === 'customer') return '/customerhome';
    // default customer
    return '/customerhome';
  };

  const getProfileImageUrl = () => {
    const raw = currentUser?.profile_image || '';
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    // If already includes uploads path from BE
    if (/^uploads\//i.test(raw) || /\/uploads\//i.test(raw)) {
      return `/${raw.replace(/^\/+/, '')}`;
    }
    // Assume it's a filename stored under uploads/profile
    return `/uploads/profile/${raw}`;
  };

  // Close avatar dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!isAvatarMenuOpen) return;
      if (avatarWrapperRef.current && !avatarWrapperRef.current.contains(e.target)) {
        setIsAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isAvatarMenuOpen]);

  // Toggle header style based on scroll position
  useEffect(() => {
    const handleScroll = () => setIsScrolled((window.scrollY || 0) > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-close notifications UI when a notification triggers navigation
  useEffect(() => {
    const onNotifClose = () => {
      setIsNotifOpen(false);
      setSelectedNotification(null);
    };
    window.addEventListener('notif-close', onNotifClose);
    return () => window.removeEventListener('notif-close', onNotifClose);
  }, []);

  // Dynamic plan link: if user (customer) has any plan -> /plan, else /plan-maker
  const [planLink, setPlanLink] = useState('/plan-maker');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isLoggedIn || getUserType().toLowerCase() !== 'customer') {
          if (!cancelled) setPlanLink('/plan-maker');
          return;
        }
        const customerId = await getCurrentCustomerId();
        const qs = customerId ? `?customer_id=${encodeURIComponent(customerId)}` : '';
        const res = await fetch(`/api/plan${qs}`, { credentials: 'include' });
        if (!res.ok) throw new Error('plan check failed');
        const rows = await res.json();
        if (!cancelled) setPlanLink(Array.isArray(rows) && rows.length > 0 ? '/plan' : '/plan-maker');
      } catch {
        if (!cancelled) setPlanLink('/plan-maker');
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn, currentUser]);

  // Navigation links (Hebrew labels)
  const navLinks = [
    { name: 'שאלות ותשובות', path: '/faq' },
    { name: 'תוכניות ארוחה', path: planLink },
    { name: 'תפריט', path: '/menu' },
    { name: 'מתכונים', path: '/recipes' },
    { name: 'צור קשר', path: '/contact' },
    { name: 'מאמרים', path: '/articles' }
  ];

  const isCustomer = (getUserType() || '').toLowerCase() === 'customer';
  const isCourier = (getUserType() || '').toLowerCase() === 'courier';
  const [courierIsOnline, setCourierIsOnline] = useState(false);

  // For courier pages, filter notifications to relevant types
  const notifIsCourierContext = isCourier && location.pathname.startsWith('/courier');
  const filteredNotifList = React.useMemo(() => {
    if (!notifIsCourierContext) return notifList;
    const allow = new Set(['order', 'courier']);
    return Array.isArray(notifList) ? notifList.filter(n => allow.has(String(n.type || '').toLowerCase())) : [];
  }, [notifIsCourierContext, notifList]);
  const filteredUnreadCount = React.useMemo(() => {
    if (!notifIsCourierContext) return unreadCount;
    return Array.isArray(filteredNotifList) ? filteredNotifList.filter(n => !n.is_read && (n.status !== 'read')).length : 0;
  }, [notifIsCourierContext, filteredNotifList, unreadCount]);

  // Fetch courier online status and name
  useEffect(() => {
    if (!isCourier) return;
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
        const status = String(row.status || '').toLowerCase();
        setCourierIsOnline(status === 'active' || status === 'on route');
        // Set actual courier name from database
        if (row.name) setDisplayName(row.name);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [isCourier, currentUser]);

  // Listen for status changes from the sidebar toggle
  useEffect(() => {
    if (!isCourier) return;
    const handler = async () => {
      try {
        const uid = currentUser?.user_id || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('currentUser') || '{}')?.user_id : null);
        if (!uid) return;
        const res = await fetch(`/api/courier/by-user/${uid}`, { credentials: 'include' });
        if (!res.ok) return;
        const rows = await res.json();
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (!row) return;
        const status = String(row.status || '').toLowerCase();
        setCourierIsOnline(status === 'active' || status === 'on route');
      } catch (_) {}
    };
    window.addEventListener('courier:statusChanged', handler);
    return () => window.removeEventListener('courier:statusChanged', handler);
  }, [isCourier, currentUser]);

  // Apply transparent on home top, solid when scrolled or on other routes
  const solid = isScrolled || location.pathname !== '/';

  return (
    <header className={`${styles.header} ${solid ? styles.headerSolid : styles.headerTransparent}`} style={{ position: 'fixed' }}>
      <div className={styles.container}>
        <div className={styles.row}>
          {/* Courier sidebar toggle + Logo + Notifications bell (bell only when logged in) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Courier menu toggle to the left of the logo */}
            {isCourier && location.pathname.startsWith('/courier') && (
              <button
                type="button"
                aria-label="פתח תפריט שליח"
                title="תפריט"
                onClick={() => {
                  try { window.dispatchEvent(new CustomEvent('courier:toggleSidebar')); } catch(_) {}
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                }}
              >
                <Menu size={22} color={solid ? '#111827' : '#ffffff'} />
              </button>
            )}
            <Link to={userLoggedIn() ? getHomePath() : '/'} className={styles.logo}>
              <span className={styles.brand}>Nutribite</span>
            </Link>
            {userLoggedIn() && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {/* Cart icon for customers */}
                {isCustomer && (
                  <Link to="/cart" aria-label="Cart" title="Cart" style={{ display: 'inline-flex', alignItems: 'center', marginInlineEnd: 8 }}>
                    <ShoppingCart size={20} color={solid ? '#111827' : '#ffffff'} />
                  </Link>
                )}
                <button
                  type="button"
                  aria-label="Notifications"
                  title="Notifications"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                  data-notif-anchor
                  onClick={() => setIsNotifOpen((v) => !v)}
                >
                  <Bell size={20} color={solid ? '#111827' : '#ffffff'} />
                  {(notifIsCourierContext ? filteredUnreadCount : unreadCount) > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -4,
                        insetInlineStart: 18,
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: 10,
                        lineHeight: '14px',
                        minWidth: 16,
                        height: 16,
                        padding: '0 4px',
                        borderRadius: 9999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
                      }}
                    >
                      {notifIsCourierContext ? filteredUnreadCount : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          {isCustomer && (
            <nav className={styles.navDesktop}>
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={styles.navLink}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          )}

          {/* Auth Buttons - Desktop (with courier welcome/status inline) */}
          <div className={styles.authDesktop}>
            {userLoggedIn() ? (
              <div
                ref={avatarWrapperRef}
                style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
              >
                {isCourier && location.pathname.startsWith('/courier') && (
                  <div className={styles.courierWelcome}>
                    <div style={{ fontSize: 13 }}>
                      <div className={styles.courierName}>ברוך השב{displayName ? `, ${displayName}` : ''}</div>
                      <div style={{ display: 'flex', alignItems: 'center', color: courierIsOnline ? '#16a34a' : '#9ca3af', fontSize: 11 }}>
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: 9999,
                          background: courierIsOnline ? '#16a34a' : '#9ca3af', marginInlineEnd: 6
                        }} />
                        <span>{courierIsOnline ? 'עובד' : 'לא עובד'}</span>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setIsAvatarMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={isAvatarMenuOpen}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={getProfileImageUrl() || 'https://ui-avatars.com/api/?name=NB&background=0D8ABC&color=fff'}
                    alt="Profile"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid rgba(255,255,255,0.7)'
                    }}
                    onError={(e) => {
                      e.currentTarget.src = 'https://ui-avatars.com/api/?name=NB&background=0D8ABC&color=fff';
                    }}
                  />
                </button>
                {isAvatarMenuOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: '110%',
                      right: 0,
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                      minWidth: 160,
                      zIndex: 20,
                      overflow: 'hidden'
                    }}
                  >
                    <button
                      role="menuitem"
                      onClick={() => {
                        setIsAvatarMenuOpen(false);
                        const profilePath = getProfilePath();
                        navigate(profilePath);
                        // Force reload if already on profile page
                        if (location.pathname === profilePath) {
                          window.location.reload();
                        }
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'right',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      פרופיל
                    </button>
                    <div style={{ height: 1, background: '#e5e7eb' }} />
                    <button
                      role="menuitem"
                      onClick={onLogout}
                      style={{
                        width: '100%',
                        textAlign: 'right',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        color: '#b91c1c',
                        cursor: 'pointer'
                      }}
                    >
                      התנתק
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link 
                  to="/" 
                  className={styles.loginLink}
                >
                  התחבר
                </Link>
                <Link
                  to="/"
                  state={{ openRegister: true }}
                  className={styles.signupBtn}
                >
                  הרשמה
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          {isCustomer && (
            <button
              className={styles.mobileToggle}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>
      </div>

      {/* Notifications (only for logged-in users) */}
      {userLoggedIn() && (
        <>
          <NotificationsPanel
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            notifications={notifIsCourierContext ? filteredNotifList : notifList}
            loading={notifLoading}
            onOpenNotification={(n) => {
              setSelectedNotification(n);
              setIsNotifOpen(false);
            }}
            onDelete={(id) => deleteNotif(id)}
            onDeleteAll={() => deleteAllNotifs()}
          />

          <NotificationModal
            open={!!selectedNotification}
            notification={selectedNotification}
            onClose={() => setSelectedNotification(null)}
            onMarkRead={async (id) => {
              await markRead(id);
              setSelectedNotification((prev) => (prev && prev.id === id ? { ...prev, is_read: true, status: 'read' } : prev));
            }}
            onDelete={async (id) => {
              await deleteNotif(id);
              setSelectedNotification(null);
            }}
          />
        </>
      )}

      {/* Mobile Menu */}
      {isCustomer && isMenuOpen && (
        <div className={styles.mobileMenu}>
          <div className={styles.mobileMenuInner}>
            <nav className={styles.mobileNav}>
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={styles.mobileLink}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className={styles.mobileAuth}>
                {userLoggedIn() ? (
                  <>
                    <Link
                      to={getProfilePath()}
                      className={styles.mobileLink}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      פרופיל
                    </Link>
                    <button
                      className={styles.mobileSignupBtn}
                      onClick={() => {
                        onLogout();
                        setIsMenuOpen(false);
                      }}
                    >
                      התנתק
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/"
                      className={styles.mobileLink}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      התחבר
                    </Link>
                    <Link
                      to="/"
                      state={{ openRegister: true }}
                      className={styles.mobileSignupBtn}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      הרשמה
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

