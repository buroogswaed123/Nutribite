
import styles from "./home.module.css";
import DietTypes from "./DietTypes.jsx";
import CustomerHomeHero from './CustomerHomeHero.jsx'
import Features from "./Features.jsx";
import Reviews from "./Reviews.jsx";


export default function CustomerHome() {
   return (
    <div className={styles.homeWrapper}>
      <CustomerHomeHero />
      
      <DietTypes />
      <Features />

      <Reviews />
      
    </div>
  );
}