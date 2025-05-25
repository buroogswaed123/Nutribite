import React, { useState } from 'react';
import { TextField, Button, FormControl, InputLabel, Select, MenuItem, Grid } from '@mui/material';
import styles from '../../assets/styles/caloriecalc.module.css';

export default function CalorieCalc() {
  const [formData, setFormData] = useState({
    age: '',
    weight: '',
    height: '',
    gender: 'male',
    activityLevel: 'sedentary',
  });

  const [result, setResult] = useState(null);

  const activityLevels = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateCalories = () => {
    const { age, weight, height, gender, activityLevel } = formData;

    if (!age || !weight || !height) return;

    const ageNum = Number(age);
    const weightNum = Number(weight);
    const heightNum = Number(height);
    const activityMultiplier = activityLevels[activityLevel];
    let bmr;

    if (gender === 'male') {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
    } else {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161;
    }

    const tdee = bmr * activityMultiplier;
    setResult({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      maintenance: Math.round(tdee),
      weightLoss: Math.round(tdee * 0.8),
      weightGain: Math.round(tdee * 1.2),
    });
  };

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>מחשבון קלוריות</h1>

      <div className={styles.container}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl className={styles.formControl} fullWidth>
              <InputLabel>מין</InputLabel>
              <Select
                value={formData.gender}
                onChange={handleChange}
                name="gender"
              >
                <MenuItem value="male">זכר</MenuItem>
                <MenuItem value="female">נקבה</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="גיל"
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="משקל (ק״ג)"
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label='גובה (ס"מ)'
              type="number"
              name="height"
              value={formData.height}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl className={styles.formControl} fullWidth>
              <InputLabel>רמת פעילות</InputLabel>
              <Select
                value={formData.activityLevel}
                onChange={handleChange}
                name="activityLevel"
              >
                <MenuItem value="sedentary">נמוכה (מעט או לא פעילות)</MenuItem>
                <MenuItem value="light">קלה (פעילות קלה 1-3 פעמים בשבוע)</MenuItem>
                <MenuItem value="moderate">בינונית (פעילות בינונית 3-5 פעמים בשבוע)</MenuItem>
                <MenuItem value="active">גבוהה (פעילות קשה 6-7 פעמים בשבוע)</MenuItem>
                <MenuItem value="veryActive">גבוהה מאוד (פעילות קשה מאוד או עבודה פיזית)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              className={styles.button}
              onClick={calculateCalories}
              disabled={!formData.age || !formData.weight || !formData.height}
            >
              חישוב
            </Button>
          </Grid>

          {result && (
            <Grid item xs={12}>
              <div className={styles.resultsBox}>
                <h2 className={styles.resultsTitle}>תוצרי החישוב שלך</h2>

                <div className={styles.resultItem}>
                  <strong>קצב השריפה הבסיסי (BMR):</strong> {result.bmr} קלוריות/יום
                </div>

                <div className={styles.resultItem}>
                  <strong>קצב השריפה היומי (TDEE):</strong> {result.tdee} קלוריות/יום
                </div>

                <div className={styles.resultItem}>
                  <strong>שמירה על משקל:</strong> {result.maintenance} קלוריות/יום
                </div>

                <div className={styles.resultItem}>
                  <strong className={styles.loseWeight}>ירידה במשקל:</strong> {result.weightLoss} קלוריות/יום
                </div>

                <div className={styles.resultItem}>
                  <strong className={styles.gainWeight}>עלייה במשקל:</strong> {result.weightGain} קלוריות/יום
                </div>

                <div className={styles.note}>
                  <small>המספרים מוצגים בקירוב ועשויים להשתנות בהתאם לרמת הפעילות שלך.</small>
                </div>

                <div className={styles.buttonRow}>
                  <button className={styles.secondaryButton}>שנה הגדרות</button>
                  <button className={styles.primaryButton}>צור תוכנית תזונה</button>
                </div>
              </div>
            </Grid>
          )}
        </Grid>
      </div>
    </div>
  );
}