import React, { useState, useEffect } from "react";
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

  const navigate = useNavigate();
  const location = useLocation();

  
  const { login, register} = useAuth();

  
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
      setError("Passwords do not match");
      return;
    }

    try {
      const user = await register(username, identifier, password, userType);

      if (!user) {
        setError("Registration failed");
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
        setError(err.message || "Registration failed");
      }
    }
  };

  //handles login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("Please enter your identifier");
      return;
    }

    try {
      const user = await login(identifier, password);

      if (!user) {
        setError("Invalid credentials");
        return;
      }

      setUserType(user.user_type);
      if (typeof onLoginSuccess === "function") onLoginSuccess(user);

      navigate(resolveHomePath(user.user_type));
    } catch (err) {
      setError(err.message || "Login failed");
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
            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={error ? classes.errorInput : ""}
            />
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
    </div>
  );
}
