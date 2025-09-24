import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from 'lucide-react';
import classes from "../../assets/styles/login.module.css";
import { useNavigate, useLocation } from "react-router-dom";
import SocialAuthButtons from "./SocialAuthButtons";
import { useAuth } from "../../hooks/useAuth"; 

/**
 * Login JSX component
 * @param {Object} props - The props object
 * @param {Function} props.onLoginSuccess - The callback function to be called when the login is successful
 * @param {Object} props.newUserCredentials - The credentials of the new user
 */
export default function LoginPage({ onLoginSuccess, newUserCredentials }) {
  const [isActive, setIsActive] = useState(false);
  const [identifier, setIdentifier] = useState(newUserCredentials?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState(newUserCredentials?.username || "");
  const [userType, setUserType] = useState(newUserCredentials?.user_type || "Customer");
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegPw2, setShowRegPw2] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  
  const { login, register, checkPasswordExpired } = useAuth();

  
  useEffect(() => {
    if (location.state?.openRegister) {
      setIsActive(true);
    }
  }, [location.state]);

  
  //checks user type and routes to the appropriate page
  const resolveHomePath = (type) => {
    switch ((type || "").toLowerCase()) {
      case "admin":
        return "/adminhome";
      case "courier":
        return "/courierhome";
      default:
        return "/customerhome";
    }
  };

  //handles register
  const handleRegister = async (e) => {
    e.preventDefault();
    setUsernameError("");
    setEmailError("");
    setError("");

    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    try {
      const user = await register(username, identifier, password, userType);

      if (!user) {
        setError("הרשמה נכשלה");
        return;
      }

      if (typeof onLoginSuccess === "function") onLoginSuccess(user);
      navigate(resolveHomePath(user.user_type), { replace: true });
    } catch (err) {
      
      if (err.field === "username") {
        setUsernameError("שם המשתמש כבר תפוס");
        setError("שם המשתמש כבר תפוס");
      } else if (err.field === "email") {
        setEmailError("כתובת הדוא\"ל כבר תפוס");
        setError("כתובת הדוא\"ל כבר תפוס");
      } else {
        setError(err.message || "הרשמה נכשלה");
      }
    }
  };

  //handles login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("אנא הזן דוא\"ל או שם משתמש");
      return;
    }

    try {
      const user = await login(identifier, password);

      if (!user) {
        setError("פרטי התחברות שגויים");
        return;
      }

      // If account ban takes effect today (date equals today), prevent login and show message
      const banEff = user?.ban_effective_at ? new Date(user.ban_effective_at) : null;
      const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
      if (banEff && sameDay(banEff, new Date())) {
        const whenText = (() => {
          try { return banEff.toLocaleDateString('he-IL'); } catch { return null; }
        })();
        setError(`החשבון שלך חסום${whenText ? ` החל מתאריך ${whenText}` : ''}. לא ניתן להתחבר.`);
        return;
      }

      // Enforce password expiry policy: if expired, show prompt before redirecting
      const uid = user?.user_id || user?.id;
      if (uid) {
        const expired = await checkPasswordExpired(uid);
        if (expired) {
          setShowExpiryModal(true);
          return; // block normal login flow
        }
      }

      setUserType(user.user_type);
      if (typeof onLoginSuccess === "function") onLoginSuccess(user);
      navigate(resolveHomePath(user.user_type));
    } catch (err) {
      // If server enforces password expiry, show prompt before redirecting
      if (err && err.code === 'PASSWORD_EXPIRED') {
        setShowExpiryModal(true);
        return;
      }
      // If the hook normalized a banned account error, show the Hebrew message
      setError(err?.message || "התחברות נכשלה");
    }
  };

  //handles register click
  const handleRegisterClick = () => {
    setIsActive(true);
  };

  //handles back to login
  const handleBackToLogin = () => {
    setIsActive(false);
    setError("");
    setUsernameError("");
    setEmailError("");
    setIdentifier("");
    setPassword("");
  };

  //if register is active, add active class to container else shows default login panel
  const handleContainerNaming = () =>
    isActive ? `${classes.container} ${classes.active}` : classes.container;

  return (
    <div className={classes.loginPage}>
      <div className={handleContainerNaming()} id="container">
        {/* Register */}
        <div className={`${classes["form-container"]} ${classes["sign-up"]}`}>
          <form onSubmit={handleRegister}>
            <h1>צור חשבון</h1>
            <SocialAuthButtons variant="register" />
            <span>או הרשמ במייל</span>
            <input
              type="text"
              placeholder="שם"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError("");
              }}
              className={usernameError ? classes.errorInput : ""}
            />
            <input
              type="text"
              placeholder="דו''א"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setEmailError("");
              }}
              className={emailError ? classes.errorInput : ""}
            />
            <div style={{ position:'relative', width:'100%' }}>
              <input
                type={showRegPw ? 'text' : 'password'}
                placeholder="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight:36 }}
              />
              <button
                type="button"
                onClick={() => setShowRegPw(v=>!v)}
                aria-label={showRegPw ? 'הסתר סיסמה' : 'הצג סיסמה'}
                style={{ position:'absolute', top:6, insetInlineEnd:8, background:'transparent', border:'none', padding:4, cursor:'pointer' }}
              >
                {showRegPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ position:'relative', width:'100%' }}>
              <input
                type={showRegPw2 ? 'text' : 'password'}
                placeholder="אימות סיסמה"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ paddingRight:36 }}
              />
              <button
                type="button"
                onClick={() => setShowRegPw2(v=>!v)}
                aria-label={showRegPw2 ? 'הסתר סיסמה' : 'הצג סיסמה'}
                style={{ position:'absolute', top:6, insetInlineEnd:8, background:'transparent', border:'none', padding:4, cursor:'pointer' }}
              >
                {showRegPw2 ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className={classes.error}>{error}</div>
            <button type="submit">להירשם</button>
          </form>
        </div>

        {/* Login */}
        <div className={`${classes["form-container"]} ${classes["sign-in"]}`}>
          <form onSubmit={handleLogin}>
            <h1>להיכנס</h1>
            <SocialAuthButtons />
            <span>או השתמש בסיסמת הדוא&quot;ל שלך</span>
            <input
              type="text"
              placeholder="דוא&quot;ל/שם משתמש"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={error ? classes.errorInput : ""}
            />
            <div style={{ position:'relative', width:'100%' }}>
              <input
                type={showLoginPw ? 'text' : 'password'}
                placeholder="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={error ? classes.errorInput : ""}
                style={{ paddingRight:36 }}
              />
              <button
                type="button"
                onClick={() => setShowLoginPw(v=>!v)}
                aria-label={showLoginPw ? 'הסתר סיסמה' : 'הצג סיסמה'}
                style={{ position:'absolute', top:6, insetInlineEnd:8, background:'transparent', border:'none', padding:4, cursor:'pointer' }}
              >
                {showLoginPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className={classes.error}>{error}</div>
            <button type="submit" className={classes.loginButton}>
              להיכנס
            </button>
            <a
              href="/password-reset"
              className={classes.forgotPassword}
              onClick={(e) => {
                e.preventDefault();
                navigate("/password-reset");
              }}
            >
              שכחת סיסמא?
            </a>
            <a
              href="/home"
              className={classes.guestLink}
              onClick={(e) => {
                e.preventDefault();
                navigate("/customerhome");
              }}
            >
              הכנס כאורח
            </a>
          </form>
        </div>

        {/* Toggle */}
        <div className={classes.toggleContainer}>
          <div className={classes.Logintoggle}>
            <div className={`${classes["togglePanel"]} ${classes["toggleLeft"]}`}>
              <h1> שלום, חבר!</h1>
              <p>רשום את הפרטים האישיים שלך,או</p>
              <button className={classes.hidden} id="login" onClick={handleBackToLogin}>
                הכנס
              </button>
            </div>
            <div className={`${classes["togglePanel"]} ${classes["toggleRight"]}`}>
              <h1>!ברוך הבא</h1>
              <p>הכנס את הפרטים האישיים שלך,או</p>
              <button className={classes.hidden} id="register" onClick={handleRegisterClick}>
                הרשם
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Expiry Modal (Hebrew, RTL) */}
      {showExpiryModal && (
        <div role="dialog" aria-modal="true" className={classes.expiryModalOverlay}>
          <div className={classes.expiryModal}>
            <h3 className={classes.expiryModalTitle}>תוקפה של הסיסמה פג</h3>
            <p className={classes.expiryModalText}>עליך לשנות את הסיסמה לפני שתוכל/י להתחבר.</p>
            <div className={classes.expiryModalActions}>
              <button
                className={`${classes.loginButton} ${classes.btnPrimary}`}
                onClick={() => { setShowExpiryModal(false); navigate('/password-reset', { replace: true, state: { force: true } }); }}
              >
                אישור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
