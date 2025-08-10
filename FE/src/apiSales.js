// src/apiSales.js
import axios from "axios";

// Adjust the URL to your backend API endpoint
const API_URL = "http://localhost:3000/api/admin/sales";

// Example mock data for development (customize as needed)
const mockSalesData = [
  { date: "2025-08-01", salesQuantity: 10, productsSold: 7 },
  { date: "2025-08-02", salesQuantity: 15, productsSold: 10 },
  { date: "2025-08-03", salesQuantity: 7, productsSold: 5 },
];

export const fetchSalesData = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (err) {
    // Log error for debugging
    console.warn("API unavailable, using mock sales data.", err.message);
    // Optionally, you can show an error in the UI or just return mock data
    return mockSalesData;
  }
};