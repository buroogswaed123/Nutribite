import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function CalorieCalculator() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    age: "",
    gender: "זכר",
    height: "",
    weight: "",
    activity_level: "עצמוני",
    diet_type_id: 1,
  });

  const [result, setResult] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Simple calorie calculation (Mifflin-St Jeor)
  const calculateCalories = () => {
    const { age, gender, height, weight, activity_level } = form;
    let bmr = 0;

    if (gender === "זכר") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Activity multiplier
    const activityMultipliers = {
      עצמוני: 1.2,
      קל: 1.375,
      בינוני: 1.55,
      פעיל: 1.725,
      "פעיל מאוד": 1.9,
    };

    const calories = Math.round(bmr * activityMultipliers[activity_level]);
    const protein = Math.round(calories * 0.25 / 4); // 25% protein
    const fat = Math.round(calories * 0.25 / 9);     // 25% fat
    const carbs = Math.round(calories * 0.5 / 4);    // 50% carbs

    setResult({ calories, protein, fat, carbs });
    setModalOpen(true);

    // Save to DB
    axios.post("/api/nutritionplan", form)
      .then(res => console.log("Saved plan:", res.data))
      .catch(err => console.error(err));
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">חישוב קלוריות</h2>

      <div className="space-y-2">
        <input
          type="number"
          name="age"
          placeholder="גיל"
          value={form.age}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <select name="gender" value={form.gender} onChange={handleChange} className="w-full border p-2 rounded">
          <option value="זכר">זכר</option>
          <option value="נקבה">נקבה</option>
          <option value="אחר">אחר</option>
        </select>

        <input
          type="number"
          name="height"
          placeholder="גובה (ס״מ)"
          value={form.height}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          type="number"
          name="weight"
          placeholder="משקל (ק״ג)"
          value={form.weight}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <select name="activity_level" value={form.activity_level} onChange={handleChange} className="w-full border p-2 rounded">
          <option value="עצמוני">עצמוני</option>
          <option value="קל">קל</option>
          <option value="בינוני">בינוני</option>
          <option value="פעיל">פעיל</option>
          <option value="פעיל מאוד">פעיל מאוד</option>
        </select>
      </div>

      <button
        onClick={calculateCalories}
        className="mt-4 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      >
        חשב
      </button>

      {/* Modal */}
      {modalOpen && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">תוצאות החישוב</h3>
            <p>קלוריות: {result.calories}</p>
            <p>חלבון: {result.protein} גרם</p>
            <p>שומן: {result.fat} גרם</p>
            <p>פחמימות: {result.carbs} גרם</p>

            <div className="mt-4 flex justify-between">
              <button
                onClick={() => setModalOpen(false)}
                className="bg-gray-300 p-2 rounded hover:bg-gray-400"
              >
                סגור
              </button>
              <button
                onClick={() => navigate("/plan")}
                className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
              >
                צור תוכנית
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
