import styles from './home.module.css';
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

/***
 * CustomerHomeHero
 * @returns {JSX.Element} - The CustomerHomeHero component that shows in the customer home page.
 */

export default function CustomerHomeHero() {

     const navigate = useNavigate();
     const featuresRef = useRef(null);

     const handleGetStarted = () => {
        navigate("/meal-planner");
      };
    
      const scrollToFeatures = () => {
        featuresRef.current?.scrollIntoView({ behavior: "smooth" });
      };
    return (
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
    );
}