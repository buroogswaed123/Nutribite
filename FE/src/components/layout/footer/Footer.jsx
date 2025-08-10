import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram } from 'lucide-react';
import styles from './footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Column 1: Logo and description */}
          <div>
            <Link to="/" className={styles.brandLink}>
              <span className={styles.brand}>Nutribite</span>
            </Link>
            <p className={styles.description}>
              תכנון ארוחות אוטומטי שהופך את האכילה הבריאה וההגעה ליעדי התזונה לקלים מאי פעם.
            </p>
            <div className={styles.socialRow}>
              <a
                href="https://twitter.com"
                className={styles.socialLink}
                aria-label="Twitter"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter size={20} />
              </a>
              <a
                href="https://facebook.com"
                className={styles.socialLink}
                aria-label="Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook size={20} />
              </a>
              <a
                href="https://instagram.com"
                className={styles.socialLink}
                aria-label="Instagram"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Column 2: Features */}
          <div>
            <h3 className={styles.sectionTitle}>מאפיינים</h3>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link to="/meal-planner" className={styles.link}>
                  מתכנן ארוחות
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/recipes" className={styles.link}>
                  מאגר מתכונים
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/grocery-list" className={styles.link}>
                  רשימות קניות
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/nutrition-tracking" className={styles.link}>
                  מעקב תזונה
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className={styles.sectionTitle}>משאבים</h3>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link to="/blog" className={styles.link}>
                  בלוג
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/faq" className={styles.link}>
                  שאלות נפוצות
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/support" className={styles.link}>
                  תמיכה
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/how-it-works" className={styles.link}>
                  איך זה עובד
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className={styles.sectionTitle}>חברה</h3>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link to="/about" className={styles.link}>
                  אודות
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/careers" className={styles.link}>
                  קריירה
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/privacy" className={styles.link}>
                  מדיניות פרטיות
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/terms" className={styles.link}>
                  תנאי שימוש
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
