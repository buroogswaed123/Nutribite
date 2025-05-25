import React, { useState } from "react";
import classes from "../../assets/styles/login.module.css";
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage({ onLoginSuccess }) {
  const [isActive, setIsActive] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

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

  const handleLogin = (e) => {
    e.preventDefault();
    // In a real application, you would handle the login logic here
    // For now, we'll just redirect to Home
    navigate('/Home');
  };

  const handleGuestClick = (e) => {
    e.preventDefault();
    // Guest login - redirect to Home without authentication
    navigate('/Home');
  };

  const handleRegisterClick = () => {
    setIsActive(true);
  };

  const handleLoginClick = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      const response = await fetch("http://localhost:8801/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();

      if (response.ok) {
        // login success
        onLoginSuccess(data.user);
        navigate('/home');
      } else if (response.status === 401) {
        // Unauthorized - invalid credentials
        setError('Invalid email or password');
      } else {
        // Other server errors
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError("Network error: " + err.message);
    }
  };

  const handleContainerNaming = () => {
    return isActive
      ? `${classes.container} ${classes.active}`
      : classes.container;
  };

  return (
    <div className={handleContainerNaming()} id="container">
      <div className={`${classes["form-container"]} ${classes["sign-up"]}`}>
        <form>
          <h1>צור חשבון</h1>
          <div className={classes.icons}>
            <a onClick={(e) => { e.preventDefault(); openPopup('https://accounts.google.com/signin'); }} className="icon"><i className="fa-brands fa-google-plus-g"></i></a>
            <a onClick={(e) => { e.preventDefault(); openPopup('https://www.facebook.com/login'); }} className="icon"><i className="fa-brands fa-facebook-f"></i></a>
            <a onClick={(e) => { e.preventDefault(); openPopup('https://github.com/login'); }} className="icon"><i className="fa-brands fa-github"></i></a>
            <a onClick={(e) => { e.preventDefault(); openPopup('https://www.linkedin.com/login'); }} className="icon"><i className="fa-brands fa-linkedin-in"></i></a>
          </div>
          <span>או הרשמ במייל</span>
          <input type="text" placeholder="שם" />
          <input type="email" placeholder="דו''א" />
          <input type="password" placeholder="סיסמה" />
          <button type="button">להירשם</button>
        </form>
      </div>

      <div className={`${classes["form-container"]} ${classes["sign-in"]}`}>
        <form>
          <h1>להיכנס</h1>
          <div className={classes.icons}>
            <a onClick={(e) => { e.preventDefault(); openPopup('https://accounts.google.com/signin'); }} className="icon"><i className="fa-brands fa-google-plus-g"></i></a>
            <a onClick={(e) => { e.preventDefault(); openPopup('https://www.facebook.com/login'); }} className="icon"><i className="fa-brands fa-facebook-f"></i></a>
            <a onClick={(e) => { e.preventDefault(); openPopup('https://github.com/login'); }} className="icon"><i className="fa-brands fa-github"></i></a>
            <a onClick={(e) => { e.preventDefault(); openPopup('https://www.linkedin.com/login'); }} className="icon"><i className="fa-brands fa-linkedin-in"></i></a>
          </div>
          <span>או השתמש בסיסמת הדוא"ל שלך</span>
          <input 
            type="email" 
            placeholder="דוא" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={error ? classes.errorInput : ''}
          />
          <input 
            type="password" 
            placeholder="סיסמה" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={error ? classes.errorInput : ''}
          />
          <a href="/forgotPassword" className={classes.forgotPassword} onClick={(e) => {
            e.preventDefault();
            navigate('/forgotPassword');
          }}>שכחת סיסמא?</a>
          {error && <p className={classes.error}>{error}</p>}
          <button 
            type="submit" 
            onClick={handleLoginClick} 
            className={classes.loginButton}
            disabled={!email || !password}
          >
            להיכנס
          </button>
          <a href="/Home" className={classes.guestLink}
            onClick={(e) => {
              e.preventDefault();
              navigate('/Home');
            }}
          >
            הכנס כאורח
          </a>
        </form>
      </div>

      <div className={classes.toggleContainer}>
        <div className={classes.toggle}>
          <div className={`${classes["togglePanel"]} ${classes["toggleLeft"]}`}>
            <h1> שלום, חבר!</h1>
            <p>רשום את הפרטים האישיים שלך,או</p>
            <button className={classes.hidden} id="login" onClick={handleLoginClick}>הכנס</button>
          </div>
          <div className={`${classes["togglePanel"]} ${classes["toggleRight"]}`}>
            <h1>!ברוך הבא</h1>
            <p>הכנס את הפרטים האישיים שלך,או</p>
            <button className={classes.hidden} id="register" onClick={handleRegisterClick}>הרשם</button>
          </div>
        </div>
      </div>
    </div>
  );
}
