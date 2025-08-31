import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { calculateCalories } from "../../../../utils/functions";
import { getCurrentCustomerId } from "../../../../utils/functions";
import styles from "./caloriecalc.module.css";

export default function CalorieCalculator() {
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [form, setForm] = useState({
    gender: "זכר",
    height: "",
    weight: "",
    activity_level: "עצמוני",
    diet_type_id: 1,
    birthdate: "",
  });

  const [result, setResult] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const cust_id = await getCurrentCustomerId();
        const { data } = await axios.get(`/api/customers/${cust_id}`);
        setCustomer(data);

        setForm((prev) => ({
          ...prev,
          gender: data.gender || prev.gender,
          birthdate: data.birthdate || "",
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getAge = () => {
    const bd = (customer && customer.birthdate) ? customer.birthdate : form.birthdate;
    if (!bd) return null;
    const birth = new Date(bd);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSubmit = async () => {
    let age = getAge();
    if (!age) {
      alert("נא להזין תאריך לידה");
      return;
    }

    // Save birthdate if missing
    if (!customer.birthdate) {
      await axios.put(`/api/customers/${customer.cust_id}`,
       { birthdate: form.birthdate },{ withCredentials: true });
    }

    const caloriesData = calculateCalories({
      age,
      gender: form.gender,
      height: Number(form.height),
      weight: Number(form.weight),
      activity_level: form.activity_level,
    });

    setResult(caloriesData);
    setModalOpen(true);

    // Save nutrition plan (backend route: /api/plan)
    await axios.post("/api/plan", {
      customer_id: customer.cust_id,
      age,
      gender: form.gender,
      height_cm: Number(form.height),
      weight_kg: Number(form.weight),
      activity_level: form.activity_level,
      diet_type_id: form.diet_type_id,
      calories_per_day: caloriesData.calories,
      protein_g: caloriesData.protein,
      carbs_g: caloriesData.carbs,
      fats_g: caloriesData.fat,
      // start_date omitted; server defaults to today
    });
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>חישוב קלוריות</h2>
  
      {/* Birthdate: only ask if customer has no saved DoB */}
      {!customer?.birthdate && (
        <div className={styles.inputGroup}>
          <label className={styles.label}>תאריך לידה</label>
          <input
            type="date"
            name="birthdate"
            value={form.birthdate}
            onChange={handleChange}
            max={new Date().toISOString().slice(0,10)}
            className={styles.input}
          />
        </div>
      )}
  
      {/* Gender */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>מין</label>
        <select
          name="gender"
          value={form.gender}
          onChange={handleChange}
          className={styles.select}
        >
          <option value="זכר">זכר</option>
          <option value="נקבה">נקבה</option>
          <option value="אחר">אחר</option>
        </select>
      </div>
  
      {/* Height */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>גובה (ס״מ)</label>
        <input
          type="number"
          name="height"
          value={form.height}
          onChange={handleChange}
          className={styles.input}
        />
      </div>
  
      {/* Weight */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>משקל (ק״ג)</label>
        <input
          type="number"
          name="weight"
          value={form.weight}
          onChange={handleChange}
          className={styles.input}
        />
      </div>
  
      {/* Activity level */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>רמת פעילות</label>
        <select
          name="activity_level"
          value={form.activity_level}
          onChange={handleChange}
          className={styles.select}
        >
          <option value="עצמוני">עצמוני</option>
          <option value="קל">קל</option>
          <option value="בינוני">בינוני</option>
          <option value="פעיל">פעיל</option>
          <option value="פעיל מאוד">פעיל מאוד</option>
        </select>
      </div>
  
      {/* Diet type */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>סוג דיאטה</label>
        <select
          name="diet_type_id"
          value={form.diet_type_id}
          onChange={handleChange}
          className={styles.select}
        >
          <option value={1}>דיאטה רגילה</option>
          <option value={2}>דיאטה קטוגנית</option>
          <option value={3}>דיאטה טבעונית</option>
        </select>
      </div>
  
      {/* Submit button */}
      <button onClick={handleSubmit} className={styles.button}>
        חשב
      </button>
  
      {/* Modal */}
      {modalOpen && result && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>תוצאות החישוב</h3>
            <div className={styles.modalRow}>קלוריות: {result.calories}</div>
            <div className={styles.modalRow}>חלבון: {result.protein} גרם</div>
            <div className={styles.modalRow}>שומן: {result.fat} גרם</div>
            <div className={styles.modalRow}>פחמימות: {result.carbs} גרם</div>
  
            <div className={styles.modalButtons}>
              <button
                onClick={() => setModalOpen(false)}
                className={`${styles.modalButton} ${styles.close}`}
              >
                סגור
              </button>
              <button
                onClick={() => navigate("/plan")}
                className={`${styles.modalButton} ${styles.plan}`}
              >
                צור תוכנית
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}