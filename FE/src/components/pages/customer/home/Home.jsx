
import styles from "./home.module.css";
import DietTypes from "./DietTypes.jsx";
import CustomerHomeHero from './CustomerHomeHero.jsx'
import Features from "./Features.jsx";
import Reviews from "./Reviews.jsx";
import {useRef } from "react";



export default function CustomerHome() {
  const featuresRef = useRef(null);

//how it works in CustomerHomeHero.jsx scrolls to Features
const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
   return (
    <div className={styles.homeWrapper}>
      <CustomerHomeHero scrollToFeatures={scrollToFeatures}/>
      
      <DietTypes />
      <Features featuresRef={featuresRef} />

      <Reviews />
      
    </div>
  );
}