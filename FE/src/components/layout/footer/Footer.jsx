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
              <span className={styles.brand}>EatThisMuch</span>
            </Link>
            <p className={styles.description}>
              Automatic meal planning that makes eating healthy and reaching your diet goals easier than ever before.
            </p>
            <div className={styles.socialRow}>
              <a href="#" className={styles.socialLink}>
                <Twitter size={20} />
              </a>
              <a href="#" className={styles.socialLink}>
                <Facebook size={20} />
              </a>
              <a href="#" className={styles.socialLink}>
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Column 2: Features */}
          <div>
            <h3 className={styles.sectionTitle}>Features</h3>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link to="/meal-planner" className={styles.link}>
                  Meal Planner
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/recipes" className={styles.link}>
                  Recipe Database
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/grocery-list" className={styles.link}>
                  Grocery Lists
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/nutrition-tracking" className={styles.link}>
                  Nutrition Tracking
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className={styles.sectionTitle}>Resources</h3>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link to="/blog" className={styles.link}>
                  Blog
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/faq" className={styles.link}>
                  FAQ
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/support" className={styles.link}>
                  Support
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/how-it-works" className={styles.link}>
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className={styles.sectionTitle}>Company</h3>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link to="/about" className={styles.link}>
                  About Us
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/careers" className={styles.link}>
                  Careers
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/privacy" className={styles.link}>
                  Privacy Policy
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link to="/terms" className={styles.link}>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.bottomBar}>
          <p className={styles.bottomText}>
            &copy; {new Date().getFullYear()} EatThisMuch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
