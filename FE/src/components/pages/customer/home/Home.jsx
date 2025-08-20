import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Calendar, Gift } from "lucide-react";
import { dietTypes } from "../../../../data/dietTypes";
import styles from "./home.module.css";

export default function CustomerHome() {
  const navigate = useNavigate();
  const featuresRef = useRef(null);

  const handleGetStarted = () => {
    navigate("/meal-planner");
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={styles.homeWrapper}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div>
              <h1 className={styles.heroTitle}>אכול בריא בלי מאמץ</h1>
              <p className={styles.heroDescription}>
                צרו תפריטים מותאמים אישית לפי היעדים התזונתיים, ההעדפות והלו"ז שלכם. תנו לנו
                לתכנן עבורכם כדי שתוכלו להתמקד באכילה בריאה.
              </p>
              <div className={styles.heroButtonGroup}>
                <button onClick={handleGetStarted} className={styles.getStartedBtn}>
                  התחילו עכשיו בחינם
                  <ArrowRight style={{ marginLeft: "0.5rem", height: "1.25rem", width: "1.25rem" }} />
                </button>
                <button onClick={scrollToFeatures} className={styles.howItWorksBtn}>
                  איך זה עובד
                </button>
              </div>
              <p className={styles.heroNote}>
                אין צורך בכרטיס אשראי. התחילו לתכנן את הארוחות שלכם תוך דקות.
              </p>
            </div>
            <div className={styles.heroImgWrapper}>
              <img
                src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                alt="Healthy meal planning"
                className={styles.heroImage}
              />
              <div className={styles.heroStatsBox}>
                <div className={styles.heroStatsAvatars}>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <div className={`${styles.heroStatsAvatar} ${styles.b}`}>B</div>
                    <div className={`${styles.heroStatsAvatar} ${styles.l}`}>L</div>
                    <div className={`${styles.heroStatsAvatar} ${styles.d}`}>D</div>
                  </div>
                  <span className={styles.heroStatsText}>3 ארוחות בתכנון</span>
                </div>
                <div className={styles.heroStatsProgress}>
                  <div className={styles.heroStatsProgressBar}></div>
                </div>
                <div className={styles.heroStatsLabels}>
                  <span>1,500 קלוריות</span>
                  <span>2,000 goal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diet Types Section */}
      <section className={styles.dietSection}>
        <div className={styles.container}>
          <h2 className={styles.dietTitle}>תפריטים מותאמים לכל סוג דיאטה</h2>
          <div className={styles.dietGrid}>
            {dietTypes.map((diet) => (
              <div key={diet.id} className={styles.dietCard}>
                <div className={styles.dietCardContent}>
                  <div className={styles.dietCardIcon}>
                    <img src={diet.iconUrl} alt={diet.name} className={styles.dietCardImg} />
                  </div>
                  <h3 className={styles.dietCardTitle}>{diet.name}</h3>
                  <p className={styles.dietCardDesc}>{diet.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className={styles.featuresSection}>
        <div className={styles.container}>
          <div className={styles.featuresHeader}>
            <h2 className={styles.featuresTitle}> Nutribite  איך עובד</h2>
            <p className={styles.featuresDesc}>המערכת שלנו הופכת אכילה בריאה לפשוטה וללא מאמץ</p>
          </div>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.bar}`}>
                <BarChart3 size={24} />
              </div>
              <h3 className={styles.featureTitle}>הגדירו את היעדים שלכם</h3>
              <p className={styles.featureDesc}>
                ספרו לנו מה היעד הקלורי שלכם, ההעדפות התזונתיות וכמה ארוחות תרצו ביום.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.calendar}`}>
                <Calendar size={24} />
              </div>
              <h3 className={styles.featureTitle}>צרו תפריט</h3>
              <p className={styles.featureDesc}>
                האלגוריתם שלנו יוצר תפריט מותאם אישית עם מתכונים שמתאימים בדיוק לכם.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.gift}`}>
                <Gift size={24} />
              </div>
              <h3 className={styles.featureTitle}>תיהנו מהארוחות שלכם</h3>
              <p className={styles.featureDesc}>
                עקבו אחרי התפריט, תיהנו מארוחות בריאות וטעימות, והמערכת תעקוב אוטומטית אחרי התזונה שלכם.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonialsSection}>
        <div className={styles.container}>
          <h2 className={styles.testimonialsTitle}>מה המשתמשים שלנו אומרים</h2>
          <div className={styles.testimonialsGrid}>
            <div className={styles.testimonialCard}>
              <div className={styles.testimonialHeader}>
                <div className={`${styles.testimonialAvatar} ${styles.blue}`}>JD</div>
                <div>
                  <h4 className={styles.testimonialName}>John D.</h4>
                  <p className={styles.testimonialDesc}>הוריד 13 ק"ג ב-6 חודשים</p>
                </div>
              </div>
              <p className={styles.testimonialText}>
                "האפליקציה הזו שינתה לי את כל הגישה לאוכל. התפריטים טעימים ואף פעם לא הרגשתי שאני בדיאטה. סוף סוף מצאתי משהו שעובד בשבילי."
              </p>
              <div className={styles.testimonialStars}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>

            <div className={styles.testimonialCard}>
              <div className={styles.testimonialHeader}>
                <div className={`${styles.testimonialAvatar} ${styles.green}`}>SM</div>
                <div>
                  <h4 className={styles.testimonialName}>Sarah M.</h4>
                  <p className={styles.testimonialDesc}>אמא עסוקה לשלושה</p>
                </div>
              </div>
              <p className={styles.testimonialText}>
                "עם שלושה ילדים ועבודה במשרה מלאה, אף פעם לא היה לי זמן לתכנן ארוחות בריאות. האפליקציה יוצרת לי תפריט שבועי בשניות ואפילו בונה לי רשימת קניות. זה פשוט משנה חיים!"
              </p>
              <div className={styles.testimonialStars}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>

            <div className={styles.testimonialCard}>
              <div className={styles.testimonialHeader}>
                <div className={`${styles.testimonialAvatar} ${styles.purple}`}>RL</div>
                <div>
                  <h4 className={styles.testimonialName}>Robert L.</h4>
                  <p className={styles.testimonialDesc}>חובב כושר</p>
                </div>
              </div>
              <p className={styles.testimonialText}>
                "ניסיתי המון אפליקציות לתכנון ארוחות, אבל זו היחידה שמביאה לי את הערכים המדויקים ושומרת על גיוון ועניין. אני בונה שריר ונהנה מכל ביס."
              </p>
              <div className={styles.testimonialStars}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      
    </div>
  );
}