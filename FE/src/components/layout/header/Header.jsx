import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, ShoppingCart } from 'lucide-react';
import styles from './header.module.css';
import { AuthContext } from '../../../app/App';
import { getCurrentCustomerId } from '../../../utils/functions';
import useNotifications from '../../../hooks/useNotif';
import NotificationsPanel from '../../notifications/Notifications';
import NotificationModal from '../../notifications/NotificationModal';

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

  // Notifications hook
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

  const onLogout = () => {
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
    if (type === 'courier') return '/courierprofile';
    if (type === 'customer') return '/customerprofile';
    // default customer
    return '/customerprofile';
  };

  const getHomePath = () => {
    const type = getUserType().toLowerCase();
    if (type === 'admin') return '/adminhome';
    if (type === 'courier') return '/courierhome';
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
      return `http://localhost:3000/${raw.replace(/^\/+/, '')}`;
    }
    // Assume it's a filename stored under uploads/profile
    return `http://localhost:3000/uploads/profile/${raw}`;
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

  // Enable scroll-based toggle (match Tailwind snippet behavior)
  useEffect(() => {
    const handleScroll = () => setIsScrolled((window.scrollY || 0) > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
        const res = await fetch(`http://localhost:3000/api/plan${qs}`, { credentials: 'include' });
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

  // Apply transparent on home top, solid when scrolled or on other routes
  const solid = isScrolled || location.pathname !== '/';

  return (
    <header className={`${styles.header} ${solid ? styles.headerSolid : styles.headerTransparent}`} style={{ position: 'fixed' }}>
      <div className={styles.container}>
        <div className={styles.row}>
          {/* Logo + Notifications bell (bell only when logged in) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  {unreadCount > 0 && (
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
                      {unreadCount}
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

          {/* Auth Buttons - Desktop */}
          <div className={styles.authDesktop}>
            {userLoggedIn() ? (
              <div
                ref={avatarWrapperRef}
                style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
              >
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
                        navigate(getProfilePath());
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
            notifications={notifList}
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

