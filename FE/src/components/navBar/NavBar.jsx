import { NavLink, useNavigate } from "react-router-dom";
import classes from "./navbar.module.css";

const defaultPages = [
  { name: "מחשבון קלוריות", path: "/CalorieCalc" },
  { name: "תפריט", path: "/menu" },
  { name: "אודות", path: "/about" },
  { name: "צור קשר", path: "/contact" },
];

export default function NavBar({
  pages = defaultPages,
  auth,
}) {
  const { isLoggedIn, handleLogout: authLogout, currentUser } = auth;
  const navigate = useNavigate();
  
  const handleLogout = () => {
    authLogout();
    navigate("/");
  };
  
  return (
    <nav className={classes.navbar}>
      <ul>
        {/* Show all navigation links all the time */}
        {pages.map((page, index) => (
          <li key={index}>
            <NavLink 
              to={page.path}
              className={({ isActive }) => 
                isActive ? classes.activeLink : undefined
              }
            >
              {page.name}
            </NavLink>
          </li>
        ))}
        
        {/* Show user info and logout button when logged in */}
        {isLoggedIn && (
          <>
            <li className={classes.userInfo}>
              <span>Welcome, {currentUser?.email}</span>
            </li>
            <li>
              <button 
                onClick={handleLogout}
                className={classes.logoutButton}
              >
                Logout
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}