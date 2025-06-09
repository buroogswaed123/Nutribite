import React, { useState } from "react";
import classes from "../../assets/styles/login.module.css";
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage({ onLoginSuccess, newUserCredentials }) {
  const [isActive, setIsActive] = useState(false);
  const [email, setEmail] = useState(newUserCredentials?.email || '');
  const [password, setPassword] = useState(newUserCredentials?.password || '');
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

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        onLoginSuccess(data.user);
        navigate('/home');
      } else if (response.status === 401) {
        setError('Invalid email or password');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const handleGuestClick = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'guest@example.com', password: 'guest' }),
      });

      const data = await response.json();
      
      if (response.ok) {
        onLoginSuccess(data.user);
        navigate('/home');
      } else {
        setError(data.error || 'Guest login failed');
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
    // Reset error state when switching back to login
    setError('');
    // Reset form fields
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Response status:', response.status);
        console.error('Error data:', errorData);
        if (response.status === 401) {
          setError('Invalid email or password');
        } else if (errorData.error) {
          setError(errorData.error);
        } else {
          setError('Login failed. Please try again.');
        }
        return;
      }

      const data = await response.json();
      console.log('Login response:', data);
      if (data.success) {
        onLoginSuccess(data.user);
        navigate('/home');
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
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
        <form onSubmit={handleSubmit}>
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
          <div className={classes.error}>{error}</div>
          <button type="submit" className={classes.loginButton}>
            להיכנס
          </button>
         
          <a href="/forgotPassword" className={classes.forgotPassword} onClick={(e) => {
            e.preventDefault();
            navigate('/forgotPassword');
          }}>שכחת סיסמא?</a>
          <a href="/home" className={classes.guestLink}
            onClick={(e) => {
              e.preventDefault();
              navigate('/home');
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