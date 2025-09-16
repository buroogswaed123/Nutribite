import { getSessionUser } from "../utils/functions";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { createContext, useContext, useEffect } from "react";
import { useState } from "react";
import classes from "./app.module.css";

//Home Page imports
import CustomerHome from "../components/pages/customer/home/Home";
import HomeEnhanced from "../components/pages/admin/home/Home";
import CourierHome from "../components/pages/courier/home/Home";
import UsersList from "../components/pages/admin/profile/management/UsersList";

//Profile Page imports
import AdminProfile from "../components/pages/admin/profile/Profile";
import CustomerProfile from "../components/pages/customer/profile/Profile";
import CourierProfile from "../components/pages/courier/profile/Profile";

//Regular imports
import Login from "../components/pages/Login";
import Plan from "../components/pages/customer/plan/Plan";
import PasswordReset from "../components/pages/PasswordReset";
import NotFound from "../components/pages/NotFound";
import Footer from "../components/layout/footer/Footer";
import Header from "../components/layout/header/Header";
import Articles from "../components/pages/customer/articles/Articles";
import QA from "../components/pages/customer/articles/QA";
import FAQ from "../components/pages/customer/faq/FAQ";
import Recipes from "../components/pages/recipes/Recipes";
import RecipeDetail from "../components/pages/recipes/RecipeDetail";
import Menu from "../components/pages/menu/Menu";
import Contact from "../components/pages/contact/ContactUs";
import PlanMaker from "../components/pages/customer/plan/CalorieCalc";
import Cart from "../components/pages/cart/Cart";
import Order from "../components/pages/cart/Order";
import OrderDetails from "../components/pages/orders/OrderDetails";

function QAWrapper() {
  const { articleId } = useParams();
  return <QA articleId={parseInt(articleId, 10)} />;
}

export const AuthContext = createContext();

const RequireAuth = ({ children, allowGuest = false }) => {
  const location = useLocation();
  const { isLoggedIn, authReady } = useContext(AuthContext);

  // Wait for initial auth check to complete to avoid flicker
  if (!allowGuest && !authReady) {
    return null; // or a small loader
  }

  if (!isLoggedIn && !allowGuest) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

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
    authReady,
    handleLogin,
    handleLogout,
  };

  // Hydrate session from backend (/api/me), with a single retry to smooth races
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const tryFetch = async () => {
        try {
          const user = await getSessionUser();
          if (cancelled) return null;
          if (user && user.user_id) return user;
          return null;
        } catch (_) {
          return null;
        }
      };
      let user = await tryFetch();
      if (!user) {
        // Retry once after short delay (handles immediate nav after login)
        await new Promise(r => setTimeout(r, 250));
        user = await tryFetch();
      }
      if (!cancelled) {
        if (user) {
          setIsLoggedIn(true);
          setCurrentUser(user);
        } else {
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
        setAuthReady(true);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <BrowserRouter>
      <AuthContext.Provider value={auth}>
        <div className={classes.app}>
          <Routes>
            <Route path="/" element={<Login onLoginSuccess={handleLogin} />} />
            <Route
              path="/customerhome"
              element={
                <RequireAuth allowGuest={true}>
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
                    <HomeEnhanced />
                    <Footer />
                  </div>
                </RequireAuth>
              }
            />
            <Route
              path="/users"
              element={
                <RequireAuth>
                  <div className={classes.withNav}>
                    <Header />
                    <UsersList />
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
              path="/contact"
              element={
                <RequireAuth>
                  <div className={classes.withNav}>
                    <Header />
                    <Contact />
                    <Footer />
                  </div>
                </RequireAuth>
              }
            />
            <Route
              path="/plan-maker"
              element={
                <RequireAuth>
                  <div className={classes.withNav}>
                    <Header />
                    <PlanMaker />
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
              path="/plan"
              element={
                <RequireAuth allowGuest={true}>
                  <div className={classes.withNav}>
                    <Header />
                    <Plan />
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
              path="/recipes/:slug/:id"
              element={
                <div className={classes.withNav}>
                  <Header />
                  <RecipeDetail />
                  <Footer />
                </div>
              }
            />
            <Route
              path="/faq"
              element={
                <div className={classes.withNav}>
                  <Header />
                  <FAQ currentUser={currentUser} />
                  <Footer />
                </div>
              }
            />

            <Route path="/password-reset" element={<PasswordReset />} />
            <Route path="*" element={<NotFound />} />
            <Route
              path="/recipes"
              element={
                <RequireAuth>
                  <div className={classes.withNav}>
                    <Header />
                    <Recipes />
                    <Footer />
                  </div>
                </RequireAuth>
              }
            />
            <Route
              path="/menu"
              element={
                <RequireAuth>
                  <div className={classes.withNav}>
                    <Header />
                    <Menu />
                    <Footer />
                  </div>
                </RequireAuth>
              }
            />
            <Route
              path="/cart"
              element={
                <RequireAuth>
                  <div className={classes.withNav}>
                    <Header />
                    <Cart />
                    <Footer />
                  </div>
                </RequireAuth>
              }
            />
            <Route
              path="/order"
              element={
                <RequireAuth>
                  <div className={classes.withNav}>
                    <Header />
                    <Order />
                    <Footer />
                  </div>
                </RequireAuth>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <RequireAuth>
                  <div className={classes.withNav}>
                    <Header />
                    <OrderDetails />
                    <Footer />
                  </div>
                </RequireAuth>
              }
            />
          </Routes>
        </div>
      </AuthContext.Provider>
    </BrowserRouter>
  );
}

export default App;
