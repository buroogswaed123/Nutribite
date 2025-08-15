import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { createContext, useContext } from "react";
import { useState } from "react";
import classes from "./app.module.css";
import Home from "../components/pages/customer/home/Home";
import Login from "../components/pages/Login";
import CalorieCalc from "../components/pages/CalorieCalc";
// import Profile from "../components/pages/admin/Profile";
import PasswordReset from "../components/pages/PasswordReset";
import NotFound from "../components/pages/NotFound";
import Footer from "../components/layout/footer/Footer";
import Header from "../components/layout/header/Header";

// NavBar replaced by Header and Footer

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
    <BrowserRouter>
      <AuthContext.Provider value={auth}>
        <div className={classes.app}>
          <Routes>
            <Route path="/" element={<Login onLoginSuccess={handleLogin} />} />
            <Route
  path="/home"
  element={
    <div className={classes.withNav}>
      <Header />
      <Home />
      <Footer />
    </div>
  }
/>
             {/* <Route
              path="/home"
              element={
                 <RequireAuth>
                
                  <NavBar pages={pages} />
                  <Home />
                 </RequireAuth> 
              }
            /> */}
             
            <Route
              path="/caloriecalc"
              element={
                <RequireAuth>
                  <div className={classes.withNav}>
                    <Header />
                    <CalorieCalc />
                    <Footer />
                  </div>
                </RequireAuth>
              }
            />
            {/* <Route
              path="/profile"
              element={
                <RequireAuth>
                  <NavBar pages={pages} />
                  <Profile />
                </RequireAuth>
              }
            /> */}
            <Route path="/password-reset" element={<PasswordReset />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthContext.Provider>
    </BrowserRouter>
  );
}

export default App;
