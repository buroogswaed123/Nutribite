// App shell: routes, auth context, and layout wrappers (Header/Footer)
import { getSessionUser } from "../utils/functions";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
  useNavigate,
} from "react-router-dom";
import { createContext, useContext, useEffect } from "react";
import { useState } from "react";
import classes from "./app.module.css";

// Home pages (by role)
import CustomerHome from "../components/pages/customer/home/Home";
import HomeEnhanced from "../components/pages/admin/home/Home";
import CourierHome from "../components/pages/courier/home/Home";
import UsersList from "../components/pages/admin/profile/management/UsersList";
import FloatingMessageButton from "../components/common/FloatingMessageButton";

// Profile pages (by role)
import AdminProfile from "../components/pages/admin/profile/Profile";
import CustomerProfile from "../components/pages/customer/profile/Profile";
import CourierProfile from "../components/pages/courier/CourierProfile";
import CourierDashboard from "../components/pages/courier/CourierDashboard";
import CourierSupport from "../components/pages/courier/CourierSupport";
import CourierLayout from "../components/layouts/courier/CourierLayout";

// Public and customer pages
import Login from "../components/pages/Login";
import Plan from "../components/pages/customer/plan/Plan";
import PasswordReset from "../components/pages/PasswordReset";
import NotFound from "../components/pages/NotFound";
import Footer from "../components/layout/footer/Footer";
import Header from "../components/layout/header/Header";
import Articles from "../components/pages/customer/articles/Articles";
import QA from "../components/pages/customer/articles/QA";
import FAQ from "../components/pages/customer/faq/FAQ";
import AdminFAQ from "../components/pages/admin/faq/AdminFAQ";
import Recipes from "../components/pages/recipes/Recipes";
import RecipeDetail from "../components/pages/recipes/RecipeDetail";
import Menu from "../components/pages/menu/Menu";
import Contact from "../components/pages/contact/ContactUs";
import PlanMaker from "../components/pages/customer/plan/CalorieCalc";
import Cart from "../components/pages/cart/Cart";
import Order from "../components/pages/cart/Order";
import OrderDetails from "../components/pages/orders/OrderDetails";
import Orders from "../components/pages/orders/Orders";

//courier specific pages
import {CourierUIProvider  } from "../components/layouts/CourierUiContext";
// Tiny wrapper to pass :articleId as number to QA component
function QAWrapper() {
  const { articleId } = useParams();
  return <QA articleId={parseInt(articleId, 10)} />;
}

// Global auth context (login state + current user)
export const AuthContext = createContext();

// Guarded route wrapper (optionally allows guest rendering)
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

// Guard: only allow couriers
const RequireCourier = ({ children }) => {
  const location = useLocation();
  const { currentUser, authReady } = useContext(AuthContext);
  if (!authReady) return null;
  const role = (currentUser?.role || currentUser?.user_role || currentUser?.user_type || '').toString().toLowerCase();
  if (role !== 'courier') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

// Helper to render CourierLayout and sync section with URL
function CourierLayoutRoute({ section, children, showHeader = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = section || (location.pathname.split('/')[2] || 'dashboard');
  const onSectionChange = (next) => {
    const target = next === 'dashboard' ? 'dashboard' : next;
    navigate(`/courier/${target}`);
  };
  return (
    <CourierLayout activeSection={activeSection} onSectionChange={onSectionChange} showHeader={showHeader}>
      <div key={location.pathname}>
        {children}
      </div>
    </CourierLayout>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Set logged-in session user
  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
  };

  // Clear session user
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  // Context value handed to children
  const auth = {
    isLoggedIn,
    currentUser,
    authReady,
    handleLogin,
    handleLogout,
  };

  // Optimistic auth hydration: seed from localStorage, then verify with backend (non-blocking)
  useEffect(() => {
    let cancelled = false;
    // 1) Seed from localStorage (instant render, avoids blank page)
    try {
      const keys = ['currentUser', 'user', 'authUser'];
      for (const k of keys) {
        const raw = window.localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.user_id) {
            setIsLoggedIn(true);
            setCurrentUser(parsed);
            break;
          }
        }
      }
    } catch {}
    // Allow UI to render immediately
    setAuthReady(true);

    // 2) Verify with backend and reconcile state (does not block initial render)
    (async () => {
      try {
        const user = await getSessionUser();
        if (cancelled) return;
        if (user && user.user_id) {
          setIsLoggedIn(true);
          setCurrentUser(user);
        } else {
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
      } catch {
        if (cancelled) return;
        // keep optimistic state if any; no hard failure needed here
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Router + routes map (wrap most pages with Header/Footer)
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
                    <FloatingMessageButton />
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
                    <FloatingMessageButton />
                  </div>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/faq"
              element={
                <RequireAuth>
                  <div className={classes.withNav}>
                    <Header />
                    <AdminFAQ />
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
                <CourierUIProvider> 
                <RequireCourier>
                  <div className={classes.withNav}>
                    <Header />
                    <CourierLayoutRoute section="profile" showHeader={false}>
                      <CourierProfile />
                    </CourierLayoutRoute>
                    <Footer />
                  </div>
                </RequireCourier>
                </CourierUIProvider>
              }
            />
            {/* Legacy redirects */}
            <Route path="/courierhome" element={<Navigate to="/courier/dashboard" replace />} />
            {/* New courier routes */}
            <Route
              path="/courier/dashboard"
              element={
                <RequireCourier>
                  <CourierUIProvider>
                  <CourierLayout activeSection="dashboard" onSectionChange={() => {}}>
                    <div className={classes.withNav}>
                      <Header />
                      <CourierDashboard />
                      <Footer />
                    </div>
                  </CourierLayout>
                  </CourierUIProvider>
                </RequireCourier>
              }
            />
            <Route
              path="/courier/profile"
              element={
                <RequireCourier>
                  <CourierUIProvider>
                  <CourierLayout activeSection="profile" onSectionChange={() => {}}>
                    <CourierProfile />
                  </CourierLayout>
                  </CourierUIProvider>
                </RequireCourier>
              }
            />
            <Route
              path="/courier/support"
              element={
                <RequireCourier>
                  <CourierUIProvider>
                  <CourierLayout activeSection="support" onSectionChange={() => {}}>
                    <div className={classes.withNav}>
                      <Header />
                      <CourierSupport />
                      <Footer />
                    </div>
                  </CourierLayout>
                  </CourierUIProvider>
                </RequireCourier>
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
              path="/orders"
              element={
                <RequireAuth>
                  <div className={classes.withNav}>
                    <Header />
                    <Orders />
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
