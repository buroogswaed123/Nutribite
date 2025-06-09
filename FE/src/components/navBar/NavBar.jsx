import { Link } from 'react-router-dom';
import classes from "./navbar.module.css";

const defaultPages = [
  { name: "בית", path: "/home" },
  { name: "מחשבון קלוריות", path: "/caloriecalc" },
  { name: "פרופיל", path: "/profile" }
];

export default function NavBar({ pages = defaultPages }) {
  if (!pages || pages.length === 0) {
    return null;
  }
  return (
    <nav className={classes.navbar}>
      <div className={classes.logo}>Nutribite</div>
      <div className={classes.navItems}>
        {pages.map((page) => (
          <Link
            key={page.path}
            to={page.path}
            className={classes.navButton}
          >
            {page.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}