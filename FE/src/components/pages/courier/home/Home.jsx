import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./home.module.css";

/**
 * Delivery Home (app-agnostic, visually mirrors Delivery_enhanced.jsx)
 *
 * Props (all optional):
 * - customer: { name?: string, profileImage?: string }
 * - onQuickOrder?: () => void
 * - onEditProfile?: () => void
 * - onOrderHistory?: () => void
 * - checkAvailability?: (address: string) => Promise<{ fast?: boolean; estimate?: string; message?: string } | null>
 */
export default function Home({
  customer,
  onQuickOrder,
  onEditProfile,
  onOrderHistory,
  checkAvailability,
  // Courier dashboard (optional)
  showCourier,
  courierStats,
  courierFilter,
  onCourierFilterChange,
  courierTodayOnly,
  onCourierTodayOnlyChange,
  renderOrders,
}) {
  const displayName = customer?.name || "";
  const imgSrc = useMemo(() => {
    const raw = customer?.profileImage || "";
    if (!raw) return "";
    return /^https?:\/\//i.test(raw)
      ? raw
      : `http://localhost:3000/${String(raw).replace(/^\/+/, "")}`;
  }, [customer?.profileImage]);

  const [address, setAddress] = useState("");
  const [deliveryAvailability, setDeliveryAvailability] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const howItWorksRef = useRef(null);

  useEffect(() => {
    if (!address) {
      setDeliveryAvailability(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        if (typeof checkAvailability === "function") {
          const res = await checkAvailability(address);
          setDeliveryAvailability(res || null);
        } else {
          const fast = /tel\s*aviv|תל\s*אביב/i.test(address);
          setDeliveryAvailability(
            fast
              ? { fast: true, estimate: "35–60 דקות" }
              : {
                  fast: false,
                  message:
                    "מגיעים גם לאזור זה — זמני האספקה משתנים; בדקו בעת ההזמנה.",
                }
          );
        }
      } catch {
        setDeliveryAvailability(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [address, checkAvailability]);

  return (
    <div dir="rtl" style={{ textAlign: "right", direction: "rtl" }}>
      {/* Hero Section */}
      <header
        className="heroSection"
        style={{
          background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
          padding: "60px 20px",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          marginBottom: "40px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="heroContent" style={{ flex: "1 1 400px", maxWidth: "600px" }}>
          <h1
            className="heroTitle"
            style={{
              fontSize: "3rem",
              fontWeight: "900",
              marginBottom: "20px",
              color: "#333",
              lineHeight: "1.1",
              letterSpacing: "0.05em",
            }}
          >
            🌱 משלוח בריא — טרי, מאוזן, עד פתח הבית
          </h1>
          <p
            className="heroDescription"
            style={{
              fontSize: "1.25rem",
              color: "#555",
              marginBottom: "30px",
              lineHeight: "1.6",
            }}
          >
            אנחנו מבשלים בשבילכם כל יום מנות שנוקדו על ידי תזונאים, אורזים באריזה
            מקיימת ושולחים בזמן שמתאים לכם. ברוח בריאות אמיתית — פשוט לבחור,
            ללחוץ ולקבל.
          </p>
          <div className="heroActions" style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowProfileModal(true)}
              className="heroPrimaryBtn"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                padding: "15px 35px",
                borderRadius: "30px",
                fontSize: "1.1rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 6px 15px rgba(102, 126, 234, 0.5)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
            >
              👤 פרופיל משתמש
            </button>
            <button
              onClick={onQuickOrder}
              className="heroSecondaryBtn"
              style={{
                background: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
                color: "#333",
                border: "none",
                padding: "15px 35px",
                borderRadius: "30px",
                fontSize: "1.1rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 6px 15px rgba(255, 210, 0, 0.5)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
            >
              🚚 הזמנה מהירה
            </button>
          </div>
        </div>
        <div
          className="heroVisual"
          style={{
            flex: "1 1 300px",
            maxWidth: "350px",
            textAlign: "center",
            fontSize: "6rem",
            userSelect: "none",
            color: "#764ba2",
            fontWeight: "900",
            filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.1))",
          }}
        >
          <div
            className="heroImagePlaceholder"
            style={{
              display: "inline-block",
              padding: "20px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.7)",
              boxShadow: "0 8px 20px rgba(118, 75, 162, 0.3)",
            }}
          >
            <span>🍽️</span>
            <p style={{ fontSize: "1.25rem", color: "#555", marginTop: "10px" }}>מנות בריאות טריות</p>
          </div>
        </div>
      </header>

      {/* QuickActions style helper for parity */}
      <style jsx>{`
        .quickActions {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }
      `}</style>

      {/* Enhanced Profile Modal (app-agnostic; actions via props) */}
      {showProfileModal && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowProfileModal(false)}
        >
          <div className="profileModal" onClick={(e) => e.stopPropagation()}>
            {imgSrc ? (
              <img src={imgSrc} alt="Profile" className="profileImage" />
            ) : null}
            <h2 className="profileTitle">👤 פרופיל משתמש{displayName ? `: ${displayName}` : ""}</h2>

            <div className="contentSection">
              <h3 className="sectionTitle">📊 סטטיסטיקות</h3>
              <p className="sectionText">חברת מועדון • רמת פעילות: בינונית</p>
              <p className="sectionText">הזמנות קודמות: 28 • אחרונה: 12/09/2025</p>
            </div>

            <div className="contentSection">
              <h3 className="sectionTitle">🏠 פרטי משלוח</h3>
              <p className="sectionText">כתובת ברירת מחדל: שדרות רוטשילד 10, תל אביב</p>
              <p className="sectionText">העדפות תזונה: טבעוני · ללא גלוטן · פחות מלח</p>
              <p className="sectionText">תכניות פעילות: חבילת שבוע בריא (1x בשבוע)</p>
            </div>

            <div className="contentSection">
              <h3 className="sectionTitle">⚡ פעולות מהירות</h3>
              <div className="quickActions">
                <button
                  className="contentActionBtn quickOrderBtn"
                  onClick={() => {
                    setShowProfileModal(false);
                    onQuickOrder && onQuickOrder();
                  }}
                  title="✨ הזמן עכשיו — משלוח מהיר עד הדלת"
                >
                  🚚 הזמנה מהירה
                </button>
                <button
                  className="contentActionBtn editProfileBtn"
                  onClick={() => {
                    setShowProfileModal(false);
                    onEditProfile && onEditProfile();
                  }}
                  title="✨ עדכון פרטי משלוח והעדפות"
                >
                  ✏️ ערוך פרופיל
                </button>
                <button
                  className="contentActionBtn orderHistoryBtn"
                  onClick={() => {
                    setShowProfileModal(false);
                    onOrderHistory && onOrderHistory();
                  }}
                  title="✨ המשלוחים הקודמים שלי"
                >
                  📋 היסטוריית הזמנות
                </button>
              </div>
            </div>

            <div className="contentSection">
              <h3 className="sectionTitle">💡 טיפים אישיים</h3>
              <p className="highlight">
                "עדכני כתובת ותעדפי משלוח בשעות שנוחות לך."
                <br />
                "רוצה לחזור על הזמנה קודמת? הזמנה מהירה — בחר, אשר, ונשלח."
              </p>
            </div>

            <button className="closeModalBtn" onClick={() => setShowProfileModal(false)}>
              סגור
            </button>
          </div>
        </div>
      )}

      {/* How It Works Section */}
      <section className={styles.howItWorks} ref={howItWorksRef}>
        <h2>איך זה עובד — שלוש דקות להסבר</h2>
        <ol>
          <li>בחרו מנות או חבילה מהתפריט — ניתן לסנן לפי העדפות תזונה.</li>
          <li>התאמה אישית — הגדילו/הקטינו מנות, בחרו תוספות, ציינו הוראות למשלוח.</li>
          <li>אריזה וניקיון — אריזה רב־פעמית/מוחזרת אופציונלית, תוויות תזונתיות ברורות.</li>
          <li>מעקב חי — זמני הכנה ומשלוח בזמן אמת, הודעות עד קבלת המנה.</li>
          <li>קבלת המנה — תוספת קטנה: בקשה להשאיר על המרפסת? ציינו בהנחיות.</li>
        </ol>
        <p className={styles.microcopy}>
          "הזמנתכם בדרך — עקבו אחרי השליח בדקה ובשנייה."
          <br />
          "אוהבים לקבל הכל מוכן? בחרו 'הכן לאכילה' ונעטוף לכם הכל מוכן לחימום."
        </p>
      </section>

      {/* Benefits Section */}
      <section className={styles.benefits}>
        <h2>למה להזמין מאיתנו?</h2>
        <ul>
          <li>טריות מוקפדת — הכנה יום־יומית עם חומרי גלם ברמה גבוהה.</li>
          <li>תפריטים מאוזנים — בנויים על ידי תזונאית קלינית; מידע קל לקריאה על כל מנה.</li>
          <li>מהירות ואמינות — מרבית ההזמנות מגיעות בתוך 45–90 דקות באזורי השירות.</li>
          <li>קיימות — אריזות קומפוסט, אפשרות לחבילה רב־פעמית.</li>
          <li>התאמה אישית — אלרגיות, העדפות וסגנונות תזונה נשמרים בפרופיל ומותאמים אוטומטית.</li>
        </ul>
      </section>

      {/* Delivery Availability Section */}
      <section className={styles.availability}>
        <h2>בדקו זמינות והערכת זמן</h2>
        <input
          type="text"
          placeholder="הקלידו כתובת למשלוח — קבלו זמינות בזמן אמת"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={styles.addressInput}
        />
        {deliveryAvailability && deliveryAvailability.fast && (
          <p className={styles.fastDelivery}>זמינות משלוח מהירה — משוערת: {deliveryAvailability.estimate}</p>
        )}
        {deliveryAvailability && !deliveryAvailability.fast && (
          <p className={styles.variableDelivery}>{deliveryAvailability.message}</p>
        )}
        {!deliveryAvailability && (
          <p className={styles.microcopy}>הקלידו כתובת לקבלת זמן אספקה מדויק</p>
        )}
      </section>

      {/* Popular Packages Section */}
      <section className={styles.popularPackages}>
        <h2>חבילות פופולריות</h2>
        <div className={styles.packageCards}>
          <div className={styles.packageCard}>
            <h3>חבילת שבוע בריא</h3>
            <p>5 ארוחות ליום · משלוח שבועי אחד · ₪399</p>
            <button className={styles.ctaBtn} onClick={onQuickOrder}>בחר/התאם לי</button>
          </div>
          <div className={styles.packageCard}>
            <h3>ארוחת ספורטאי</h3>
            <p>מנה עתירת חלבון, פחמימות מתוחזקות · ₪59</p>
            <button className={styles.ctaBtn} onClick={onQuickOrder}>בחר/התאם לי</button>
          </div>
          <div className={styles.packageCard}>
            <h3>מארז מתנה בריא</h3>
            <p>אריזת שי לאירועים · החל מ־₪129</p>
            <button className={styles.ctaBtn} onClick={onQuickOrder}>בחר/התאם לי</button>
          </div>
        </div>
      </section>

      {/* Special Deliveries Section */}
      <section className={styles.specialDeliveries}>
        <h2>משלוחים מיוחדים ושירותים עסקיים</h2>
        <ul>
          <li>תיאום זמן מדויק — בחרו שעה למשלוח (לפי אזורי שירות).</li>
          <li>משלוחים לאירועים — בראנצ'ים משרדיים, ארוחות יחידות, קייטרינג בריאות.</li>
          <li>מנויים — חיסכון עד 15% על מנוי שבועי/חודשי + עדיפות למשלוח.</li>
        </ul>
        <p className={styles.microcopy}>"עזבו את הבישולים — קבלו תפריט מאוזן אוטומטית כל שבוע."</p>
      </section>

      {/* Payment and Security Section */}
      <section className={styles.paymentSecurity}>
        <h2>תשלום ואבטחה</h2>
        <ul>
          <li>כרטיס אשראי/PayPal/Apple Pay.</li>
          <li>אופציית תשלום במזומן/באשראי ליחידת משלוח — בכפוף לאזור.</li>
          <li>פרטי כרטיס מאוחסנים בצורה מוצפנת; ניתן להסיר בכל עת.</li>
        </ul>
      </section>

      {/* Tracking and Notifications Section */}
      <section className={styles.trackingNotifications}>
        <h2>מעקב והודעות</h2>
        <ul>
          <li>Toast אחרי אישור הזמנה: הזמנה נקלטה! מקבלים אישור ב־SMS תוך דקה.</li>
          <li>SMS בזמן יציאת השליח: השליח בדרך — זמן משוער: 25 דקות.</li>
          <li>Push לאפליקציה: המנה שלך מתקמלת — הזמן להתחמם!</li>
          <li>הודעה במקרה איחור: מצטערים על האיחור — המשלוח יתעכב עד 20 דקות, קבלו קוד להנחה 10%.</li>
        </ul>
      </section>

      {/* FAQ Section */}
      <section className={styles.faq}>
        <h2>שאלות נפוצות (FAQ)</h2>
        <dl>
          <dt>מה זמן האספקה הממוצע?</dt>
          <dd>ברוב אזורי השירות: 45–90 דקות. ניתן לבחור תיאום זמן למשלוחים עתידיים.</dd>
          <dt>האם יש עלות משלוח?</dt>
          <dd>תלוי מרחק וסכום ההזמנה. משלוחים מעל ₪120 ברוב האזורים — חינם.</dd>
          <dt>איך מתמודדים עם אלרגיות?</dt>
          <dd>באפשרותכם לציין אלרגיות בפרופיל — נרחיק מרכיבים לא רצויים ונציג התראה על המנות.</dd>
          <dt>אם המנה התקלקלה או לא תואמת — מה עושים?</dt>
          <dd>צרו קשר עם התמיכה דרך הצ'ט/טלפון ונציע פתרון מהיר: החלפה/החזר או זיכוי להזמנה הבאה.</dd>
        </dl>
      </section>

      {/* Courier Dashboard (optional) */}
      {(showCourier ?? true) && (
        <section className={styles.courierDashboard} style={{ marginTop: 32 }}>
          <header className={styles.header} style={{ marginBottom: 16 }}>
            <div>
              <h2 className={styles.title} style={{ margin: 0 }}>לוח שליחים</h2>
              <p className={styles.subtitle} style={{ margin: 0, color: '#6b7280' }}>עקבו אחרי הזמנות ומשלוחים של היום</p>
            </div>
            <div className={styles.statsRow} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { key: 'new', label: 'חדשים', value: courierStats?.new ?? 8, color: '#3b82f6' },
                { key: 'inTransit', label: 'בדרך', value: courierStats?.inTransit ?? 12, color: '#f59e0b' },
                { key: 'delivered', label: 'נמסרו', value: courierStats?.delivered ?? 23, color: '#10b981' },
              ].map((s) => (
                <div key={s.key} className={styles.statCard} style={{
                  background: 'white', borderRadius: 12, padding: 12, minWidth: 110,
                  boxShadow: '0 6px 16px rgba(0,0,0,0.06)', border: '1px solid #eee'
                }}>
                  <div className={styles.statLabel} style={{ color: '#6b7280', fontSize: 12 }}>{s.label}</div>
                  <div className={styles.statValue} style={{ fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </header>

          <section className={styles.content} style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
            {/* Filters */}
            <aside className={styles.sidebar} style={{ background: 'white', border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
              <h3 className={styles.sidebarTitle} style={{ marginTop: 0 }}>מסננים</h3>
              <div className={styles.filterGroup} style={{ marginBottom: 12 }}>
                <label>סטטוס</label>
                <select
                  value={courierFilter ?? 'all'}
                  onChange={(e) => onCourierFilterChange ? onCourierFilterChange(e.target.value) : undefined}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}
                >
                  <option value="all">הכל</option>
                  <option value="new">חדש</option>
                  <option value="in_transit">בדרך</option>
                  <option value="delivered">נמסר</option>
                  <option value="cancelled">בוטל</option>
                </select>
              </div>
              <div className={styles.filterGroup} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="todayOnly"
                  type="checkbox"
                  checked={!!(courierTodayOnly ?? true)}
                  onChange={(e) => onCourierTodayOnlyChange ? onCourierTodayOnlyChange(e.target.checked) : undefined}
                />
                <label htmlFor="todayOnly">היום בלבד</label>
              </div>
            </aside>

            {/* Orders */}
            <main className={styles.main} style={{ background: 'white', border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
              <div className={styles.sectionHeader} style={{ marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>הזמנות</h3>
              </div>
              {typeof renderOrders === 'function' ? (
                renderOrders({ filter: courierFilter ?? 'all', todayOnly: courierTodayOnly ?? true })
              ) : (
                <div style={{ color: '#6b7280' }}>אין רכיב הזמנות משויך. עברו פונקציה ב־renderOrders כדי להציג רשימה.
                </div>
              )}
            </main>
          </section>
        </section>
      )}

      {/* Footer Line */}
      <footer className={styles.footerLine}>טעם טוב זה סגנון חיים. הזמינו עכשיו — הבריאות שלכם בדרך הביתה. 🌿</footer>
    </div>
  );
}
