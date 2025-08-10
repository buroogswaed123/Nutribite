import React, { useState, useEffect } from "react";
import classes from "../../assets/styles/login.module.css";
import { useNavigate, Link, useLocation } from 'react-router-dom';

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default function LoginPage({ onLoginSuccess, newUserCredentials }) {
  const [isActive, setIsActive] = useState(false);
  const [identifier, setIdentifier] = useState(newUserCredentials?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'username'
  const [username, setUsername] = useState(newUserCredentials?.username || '');
  const [userType, setUserType] = useState(newUserCredentials?.user_type || 'Customer');
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // If navigated with state { openRegister: true }, open the register panel
  useEffect(() => {
    if (location.state && location.state.openRegister) {
      setIsActive(true);
    }
  }, [location.state]);

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const openPopup = (url) => {
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      url,
      'authPopup',
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );
    return false;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setUsernameError('');
    setEmailError('');
    if (!validateEmail(identifier)) {
      setError('Please enter a valid email address');
      return;
    }
    try {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          username: username,
          email: identifier,
          password: password,
          user_type: userType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }));
        const msg = (errorData && (errorData.message || errorData.error)) || '';

        // Prefer structured field info if provided by backend
        const field = (errorData && (errorData.field || errorData.key)) || '';
        const code = (errorData && (errorData.code || errorData.type)) || '';

        let handled = false;
        if (field) {
          if (/^user(name)?$/i.test(field)) {
            setUsernameError('שם המשתמש כבר תפוס');
            setError('שם המשתמש כבר תפוס');
            handled = true;
          } else if (/^e?-?mail$/i.test(field) || /email/i.test(field)) {
            setEmailError('כתובת הדוא"ל כבר תפוס');
            setError('כתובת הדוא"ל כבר תפוס');
            handled = true;
          }
        }

        if (!handled) {
          const lower = (msg || '').toLowerCase();
          const mentionsUsername = /\buser(name)?\b/.test(lower);
          const mentionsEmail = /\bemail\b|\bmail\b/.test(lower);
          const isDuplicate = /(exists|taken|duplicate|already)/.test(lower);

          if (isDuplicate && mentionsUsername && !mentionsEmail) {
            setUsernameError('שם המשתמש כבר תפוס');
            setError('שם המשתמש כבר תפוס');
          } else if (isDuplicate && mentionsEmail && !mentionsUsername) {
            setEmailError('כתובת הדוא"ל כבר רשומה');
            setError('כתובת הדוא"ל כבר רשומה');
          } else {
            // Ambiguous or generic backend message: choose one field to display
            // Prefer marking email as taken to avoid double-highlighting
            setEmailError('כתובת הדוא"ל כבר רשומה');
            setError('שם המשתמש או הדוא"ל כבר בשימוש');
          }
        }
        return;
      }

      const data = await response.json();
      if (data.error) {
        console.error('Registration error:', data.error);
        setError(data.error);
        return;
      }

      onLoginSuccess(data.user);
      navigate('/home', { replace: true });
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your identifier');
      return;
    }
    
    const isEmail = validateEmail(identifier);
    const loginMethod = isEmail ? 'email' : 'username';

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          identifier: identifier,
          password: password,
          loginMethod
        }),
      });

      const data = await response.json();
      if (response.ok) {
        onLoginSuccess(data.user);
        navigate('/home');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const handleRegisterClick = () => {
    setIsActive(true);
  };

  const handleBackToLogin = () => {
    setIsActive(false);
    setError('');
    setUsernameError('');
    setEmailError('');
    setIdentifier('');
    setPassword('');
  };

  const handleContainerNaming = () => {
    return isActive
      ? `${classes.container} ${classes.active}`
      : classes.container;
  };

  return (
    <div className={classes.loginPage}>
      <div className={handleContainerNaming()} id="container">
        <div className={`${classes["form-container"]} ${classes["sign-up"]}`}>
          <form onSubmit={handleRegister}>
            <h1>צור חשבון</h1>
            <div className={classes.icons}>
              <a onClick={(e) => { e.preventDefault(); openPopup('https://accounts.google.com/signin'); }} className="icon"><i className="fa-brands fa-google-plus-g"></i></a>
              <a onClick={(e) => { e.preventDefault(); openPopup('https://www.facebook.com/login'); }} className="icon"><i className="fa-brands fa-facebook-f"></i></a>
              <a onClick={(e) => { e.preventDefault(); openPopup('https://github.com/login'); }} className="icon"><i className="fa-brands fa-github"></i></a>
              <a onClick={(e) => { e.preventDefault(); openPopup('https://www.linkedin.com/login'); }} className="icon"><i className="fa-brands fa-linkedin-in"></i></a>
            </div>
            <span>או הרשמ במייל</span>
            <input 
              type="text" 
              placeholder="שם"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setUsernameError(''); }}
              className={usernameError ? classes.errorInput : ''}
            />
            <input 
              type="text" 
              placeholder="דו''א"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setEmailError(''); }}
              className={emailError ? classes.errorInput : ''}
            />
            <input 
              type="password" 
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={''}
            />
            <input 
              type="password" 
              placeholder="אימות סיסמה"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={''}
            />
            <div className={classes.error}>{error}</div>
            <button type="submit">להירשם</button>
          </form>
        </div>

        <div className={`${classes["form-container"]} ${classes["sign-in"]}`}>
          <form onSubmit={handleLogin}>
            <h1>להיכנס</h1>
            <div className={classes.icons}>
              <a onClick={(e) => { e.preventDefault(); openPopup('https://accounts.google.com/signin'); }} className="icon"><i className="fa-brands fa-google-plus-g"></i></a>
              <a onClick={(e) => { e.preventDefault(); openPopup('https://www.facebook.com/login'); }} className="icon"><i className="fa-brands fa-facebook-f"></i></a>
              <a onClick={(e) => { e.preventDefault(); openPopup('https://github.com/login'); }} className="icon"><i className="fa-brands fa-github"></i></a>
              <a onClick={(e) => { e.preventDefault(); openPopup('https://www.linkedin.com/login'); }} className="icon"><i className="fa-brands fa-linkedin-in"></i></a>
            </div>
            <span>או השתמש בסיסמת הדוא&#39;&#39;ל שלך</span>
            <input 
              type="text" 
              placeholder="דוא&quot;ל/שם משתמש"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={error ? classes.errorInput : ''}
            />
            <input 
              type="password" 
              placeholder="סיסמה" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={error ? classes.errorInput : ''}
            />
            <div className={classes.error}>{error}</div>
            <button type="submit" className={classes.loginButton}>להיכנס</button>
            <a href="/password-reset" className={classes.forgotPassword} onClick={(e) => {
              e.preventDefault();
              navigate('/password-reset');
            }}>שכחת סיסמא?</a>
            <a href="/home" className={classes.guestLink} onClick={(e) => {
              e.preventDefault();
              navigate('/home');
            }}>הכנס כאורח</a>
          </form>
        </div>
      

      <div className={classes.toggleContainer}>
        <div className={classes.Logintoggle}>
          <div className={`${classes["togglePanel"]} ${classes["toggleLeft"]}`}>
            <h1> שלום, חבר!</h1>
            <p>רשום את הפרטים האישיים שלך,או</p>
            <button className={classes.hidden} id="login" onClick={handleBackToLogin}>הכנס</button>
          </div>
          <div className={`${classes["togglePanel"]} ${classes["toggleRight"]}`}>
            <h1>!ברוך הבא</h1>
            <p>הכנס את הפרטים האישיים שלך,או</p>

            <button 
              className={classes.hidden} 
              id="register" 
              onClick={handleRegisterClick}
            >
              הרשם
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}