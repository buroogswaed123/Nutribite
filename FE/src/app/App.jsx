import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { createContext, useContext } from "react";
import { useState } from "react";
import classes from "./app.module.css";


//Home Page imports
import CustomerHome from "../components/pages/customer/home/Home";
import AdminHome from "../components/pages/admin/home/Home";
import CourierHome from "../components/pages/courier/home/Home";

//Profile Page imports
import AdminProfile from "../components/pages/admin/profile/Profile";
import CustomerProfile from "../components/pages/customer/profile/Profile";
import  CourierProfile from "../components/pages/courier/profile/Profile";

//Regular imports
import Login from "../components/pages/Login";
import CalorieCalc from "../components/pages/CalorieCalc";
import PasswordReset from "../components/pages/PasswordReset";
import NotFound from "../components/pages/NotFound";
import Footer from "../components/layout/footer/Footer";
import Header from "../components/layout/header/Header";
import Articles from "../components/pages/customer/articles/Articles";
import QA from "../components/pages/customer/articles/QA";
import FAQ from "../components/pages/customer/faq/FAQ";

function QAWrapper() {
  const { articleId } = useParams();
  return <QA articleId={parseInt(articleId, 10)} />;
}

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
  path="/customerhome"
  element={
    <RequireAuth>
    <div className={classes.withNav}>
      <Header />
      <CustomerHome />
      <Footer />
    </div>
    </RequireAuth>
  }
/>
<Route
  path="/adminhome"
  element={
    <RequireAuth>
    <div className={classes.withNav}>
      <Header />
      <AdminHome />
      <Footer />
    </div>
    </RequireAuth>
  }
/>
<Route
  path="/courierhome"
  element={
    <RequireAuth>
    <div className={classes.withNav}>
      <Header />
      <CourierHome />
      <Footer />
    </div>
    </RequireAuth>
  }
/>
<Route
  path="/customerprofile"
  element={
    <RequireAuth>
    <div className={classes.withNav}>
      
      <CustomerProfile />
      
    </div>
    </RequireAuth>
  }
/>
<Route
  path="/adminprofile"
  element={
    <RequireAuth>
    <div className={classes.withNav}>
      <Header />
      <AdminProfile />
      <Footer />
    </div>
    </RequireAuth>
  }
/>
<Route
  path="/courierprofile"
  element={
    <RequireAuth>
    <div className={classes.withNav}>
      
      <CourierProfile />
      
    </div>
    </RequireAuth>
  }
/>
    
             
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
            {/* Public content routes with Header/Footer */}
            <Route
              path="/articles"
              element={
                <div className={classes.withNav}>
                  <Header />
                  <Articles />
                  <Footer />
                </div>
              }
            />
            <Route
              path="/qa/:articleId"
              element={
                <div className={classes.withNav}>
                  <Header />
                  <QAWrapper />
                  <Footer />
                </div>
              }
            />
            <Route
              path="/faq"
              element={
                <div className={classes.withNav}>
                  <Header />
                  <FAQ />
                  <Footer />
                </div>
              }
            />
            
            <Route path="/password-reset" element={<PasswordReset />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthContext.Provider>
    </BrowserRouter>
  );
}

export default App;
