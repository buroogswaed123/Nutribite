import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import styles from './header.module.css';
import { AuthContext } from '../../../app/App';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Track scroll to toggle transparent vs solid header
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, handleLogout } = useContext(AuthContext) || {};

  // Simple helper function to check auth state
  const userLoggedIn = () => !!isLoggedIn;

  const onLogout = () => {
    if (typeof handleLogout === 'function') {
      handleLogout();
    }
    // Optional: route to login after logout
    navigate('/');
  };

  // Enable scroll-based toggle (match Tailwind snippet behavior)
  useEffect(() => {
    const handleScroll = () => setIsScrolled((window.scrollY || 0) > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation links (Hebrew labels)
  const navLinks = [
    { name: 'איך זה עובד', path: '/how-it-works' },
    { name: 'תוכניות ארוחה', path: '/meal-planner' },
    { name: 'מתכונים', path: '/recipes' },
    { name: 'מחירים', path: '/pricing' },
  ];

  // Apply transparent on home top, solid when scrolled or on other routes
  const solid = isScrolled || location.pathname !== '/';

  return (
    <header className={`${styles.header} ${solid ? styles.headerSolid : styles.headerTransparent}`}>
      <div className={styles.container}>
        <div className={styles.row}>
          {/* Logo */}
          <Link to="/home" className={styles.logo}>
            <span className={styles.brand}>Nutribite</span>
          </Link>

          {/* Desktop Navigation */}
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

          {/* Auth Buttons - Desktop */}
          <div className={styles.authDesktop}>
            {userLoggedIn() ? (
              <button onClick={onLogout} className={styles.signupBtn}>
                התנתק
              </button>
            ) : (
              <>
                <Link 
                  to="/login" 
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
          <button
            className={styles.mobileToggle}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
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
                  <button
                    className={styles.mobileSignupBtn}
                    onClick={() => {
                      onLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    התנתק
                  </button>
                ) : (
                  <>
                    <Link
                      to="/login"
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

