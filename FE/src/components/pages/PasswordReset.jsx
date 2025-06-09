import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classes from "../../assets/styles/login.module.css"
import timerClasses from "../../assets/styles/passwordReset.module.css"

export default function PasswordReset() {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let countdown;
    if (timer > 0) {
      countdown = setInterval(() => {
        setTimer(prev => {
          if (prev <= 0) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdown) {
        clearInterval(countdown);
      }
    };
  }, [timer]);

  const handleGetResetCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`http://localhost:3001/api/password-reset/${encodeURIComponent(email)}`);
      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setTimer(15 * 60); // 15 minutes in seconds
      } else {
        setError(data.error || 'Failed to get reset code');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetCode || !newPassword) {
      setError('Please enter both reset code and new password');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resetCode,
          newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password updated successfully! You can now log in with your new password.');
        // Clear the form fields
        setResetCode('');
        setNewPassword('');
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  return (
    <div className={classes.container}>
      <div className={`${classes['form-container']} ${classes['sign-in']}`}>
        <form onSubmit={handleGetResetCode}>
          <h1>שחזור סיסמה</h1>
          <div className={classes.error}>{error}</div>
          <div className={classes.success}>{success}</div>
          
          <input 
            type="email" 
            placeholder="דוא" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit">קבל קוד איפוס</button>
          {success && (
            <div className={classes.success}>
              <p>קוד איפוס נשלח לכתובת הדוא"ל שלך</p>
              <p>הקוד תקף עד 15 דקות</p>
              <div className={timerClasses.timer}>
                {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
              </div>
            </div>
          )}
        </form>

        {success && (
          <form onSubmit={handleResetPassword}>
            <input 
              type="text" 
              placeholder="קוד איפוס" 
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="סיסמה חדשה" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button type="submit">שנה סיסמה</button>
          </form>
        )}
      </div>
    </div>
  );
}
