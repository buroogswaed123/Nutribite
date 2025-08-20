import styles from './home.module.css';
import { dietTypes } from "../../../../data/dietTypes";

/**
 * DietTypes
 * @returns {JSX.Element} - The DietTypes component that shows in the customer home page.
 */
export default function DietTypes() { 
    return(
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
    )
}
    