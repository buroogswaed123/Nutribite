import styles from './home.module.css';
import { useRef } from "react";
import { BarChart3, Calendar, Gift } from "lucide-react";

/**
 * Features
 * @returns {JSX.Element} - The Features component that shows in the customer home page.
 */
export default function Features({ featuresRef }) {
     return(
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
     )
}