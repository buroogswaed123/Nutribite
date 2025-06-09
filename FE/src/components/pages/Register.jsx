import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classes from "../../assets/styles/login.module.css";

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch("http://localhost:8801/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await response.json();

      if (response.ok) {
        // Registration successful, redirect to home
        navigate('/home');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError("Network error: " + err.message);
    }
  };

  return (
    <div className={`${classes.container} ${classes.active}`} id="container">
      <div className={`${classes["form-container"]} ${classes["sign-up"]}`}>
        <form onSubmit={handleRegister}>
          <h1>צור חשבון</h1>
          <div className={classes.icons}>
            <a onClick={(e) => { e.preventDefault(); }} className="icon"><i className="fa-brands fa-google-plus-g"></i></a>
            <a onClick={(e) => { e.preventDefault(); }} className="icon"><i className="fa-brands fa-facebook-f"></i></a>
            <a onClick={(e) => { e.preventDefault(); }} className="icon"><i className="fa-brands fa-github"></i></a>
            <a onClick={(e) => { e.preventDefault(); }} className="icon"><i className="fa-brands fa-linkedin-in"></i></a>
          </div>
          <span>או הרשמ במייל</span>
          <input 
            type="text" 
            placeholder="שם" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input 
            type="email" 
            placeholder="דו''א" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
          {error && <p className={classes.error}>{error}</p>}
          <button type="submit">להירשם</button>
        </form>
      </div>
    </div>
  );
}
