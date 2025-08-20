import styles from './home.module.css';


/**
 * Reviews
 * @returns {JSX.Element} - The Reviews component that shows in the customer home page.
 */
export default function Reviews() {
    return(
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
    )
}