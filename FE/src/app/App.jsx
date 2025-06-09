import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { createContext, useContext } from "react";
import { useState } from "react";
import classes from "./app.module.css";
import Home from "../components/pages/Home";
import Login from "../components/pages/Login";
import CalorieCalc from "../components/pages/CalorieCalc";
import Profile from "../components/pages/Profile";
import NavBar from "../components/navBar/NavBar";
import NotFound from "../components/pages/NotFound";

const pages = [
  { name: "מחשבון קלוריות", path: "/caloriecalc" },
  { name: "פרופיל", path: "/profile" },
  { name: "בית", path: "/home" },
];

export const AuthContext = createContext();

const RequireAuth = ({ children, allowGuest = false }) => {
  const location = useLocation();
  const { isLoggedIn } = useContext(AuthContext);

  if (!isLoggedIn && !allowGuest) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const auth = {
    isLoggedIn,
    currentUser,
    handleLogin,
    handleLogout
  };

  return (
    <AuthContext.Provider value={auth}>
      <section className={classes.app}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login onLoginSuccess={handleLogin} />} />
            <Route
              path="/home"
              element={
                <RequireAuth allowGuest>
                  <>
                    <NavBar pages={pages} />
                    <Home />
                  </>
                </RequireAuth>
              }
            />
            <Route
              path="/caloriecalc"
              element={
                <RequireAuth>
                  <>
                    <NavBar pages={pages} />
                    <CalorieCalc />
                  </>
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <>
                    <NavBar pages={pages} />
                    <Profile />
                  </>
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </section>
    </AuthContext.Provider>
  );
}

export default App;
