import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classes from "../../assets/styles/login.module.css"
import prStyles from "../../assets/styles/passwordResetPage.module.css"

export default function PasswordReset() {
  const [identifier, setIdentifier] = useState(''); // email or username
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setError(''); }, [identifier, newPassword]);

  const handleSimpleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!identifier.trim() || !newPassword.trim()) {
      setError('אנא הזן דוא"ל/שם משתמש וסיסמה חדשה');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch('/api/password_reset_simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), newPassword: newPassword.trim() })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.message || data?.error || 'שגיאה בעדכון הסיסמה');
        return;
      }
      setSuccess('הסיסמה עודכנה בהצלחה! ניתן להתחבר עם הסיסמה החדשה.');
      setNewPassword('');
      // Optionally route to login after a short delay
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      console.error('Password reset request failed:', err);
      setError('שגיאת רשת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.loginPage}>
      <div className={prStyles.pageRoot}>
        <div className={prStyles.inner}>
          <div className={classes.container}>
            <div className={`${classes['form-container']} ${classes['sign-in']}`}>
            <form onSubmit={handleSimpleReset}>
              <h1>איפוס סיסמה</h1>
              <div className={classes.error}>{error}</div>
              <div className={classes.success}>{success}</div>

              <input
                type="text"
                placeholder='דוא"ל / שם משתמש'
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              <input
                type="password"
                placeholder="סיסמה חדשה"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button type="submit" disabled={loading}>{loading ? 'מעדכן...' : 'אשר'}</button>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
