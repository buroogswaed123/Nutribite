import React, { useState, useEffect } from 'react';
import styles from './plan.module.css';
import CalorieCalc from '../../CalorieCalc';

export default function Plan()
{
    const [hasPlan, setHasPlan] = useState(false);
    const [plan, setPlan] = useState(null);
    const { isLoggedIn } = useContext(AuthContext);
    
    
    useEffect(() => {
        // placeholder side-effect
    }, []);

    return (
        <div className={styles.plan}>
            <CalorieCalc />
        </div>
    );
}