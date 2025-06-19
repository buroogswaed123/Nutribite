import React, { useState } from "react";
import classes from "../../assets/styles/login.module.css";
import { useNavigate, Link } from 'react-router-dom';

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
  const navigate = useNavigate();

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
        console.error('Registration error:', errorData);
        setError(errorData.message || 'Registration failed');
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
    setIdentifier('');
    setPassword('');
  };

  const handleContainerNaming = () => {
    return isActive
      ? `${classes.container} ${classes.active}`
      : classes.container;
  };

  return (
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
            onChange={(e) => setUsername(e.target.value)}
            className={error ? classes.errorInput : ''}
          />
          <input 
            type="text" 
            placeholder="דו''א"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={error ? classes.errorInput : ''}
          />
          <input 
            type="password" 
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={error ? classes.errorInput : ''}
          />
          <input 
            type="password" 
            placeholder="אימות סיסמה"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
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
          <button type="submit" className={classes.loginButton}>
            להיכנס
          </button>
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
        <div className={classes.toggle}>
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
  );
}