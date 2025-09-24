import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import classes from "../../assets/styles/login.module.css"
import prStyles from "../../assets/styles/passwordResetPage.module.css"

export default function PasswordReset() {
  const [identifier, setIdentifier] = useState(''); // email or username
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
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
      // Stay on this page so the user can read the message
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
            <form onSubmit={handleSimpleReset} style={{ position:'relative' }}>
              <button
                type="button"
                onClick={() => navigate('/')}
                aria-label="חזרה למסך התחברות"
                title="חזרה"
                style={{
                  position:'absolute',
                  top:12,
                  left:12,
                  background:'#ffffff',
                  border:'none',
                  padding:8,
                  borderRadius:'9999px',
                  cursor:'pointer',
                  zIndex:50,
                  color:'#111827',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                <ArrowLeft size={22} />
              </button>
              <h1>איפוס סיסמה</h1>
              <div className={classes.error}>{error}</div>
              <div className={classes.success}>{success}</div>

              <input
                type="text"
                placeholder='דוא"ל / שם משתמש'
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              <div style={{ position:'relative', width:'100%' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="סיסמה חדשה"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingRight:36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  aria-label={showPw ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  style={{ position:'absolute', top:6, insetInlineEnd:8, background:'transparent', border:'none', padding:4, cursor:'pointer' }}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button type="submit" disabled={loading}>{loading ? 'מעדכן...' : 'אשר'}</button>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
