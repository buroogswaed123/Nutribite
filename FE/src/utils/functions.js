//functions to help the components be more readable

import axios from "axios";

// Axios defaults for dev: backend on 3000, include cookies
axios.defaults.baseURL = axios.defaults.baseURL || 'http://localhost:3000';
axios.defaults.withCredentials = true;

function extractOrThrow(responseData, fallbackMsg) {
  // Expecting { user, ... } on success
  if (responseData?.user) return responseData.user;
  const msg = responseData?.message || responseData?.error || fallbackMsg;
  const err = new Error(msg || fallbackMsg);
  if (responseData?.field) err.field = responseData.field;
  if (responseData?.code) err.code = responseData.code;
  throw err;
}

//login
export async function login(identifier, password, method) {
  const { data } = await axios.post("/api/login", { identifier, password, loginMethod: method });
  return extractOrThrow(data, 'Login failed');
}

//register
export async function register(username, email, password, user_type) {
  const { data } = await axios.post("/api/register", { username, email, password, user_type });
  return extractOrThrow(data, 'Registration failed');
}

//check user type
export async function checkUserType(userId) {
  const { data } = await axios.get(`/api/users/${userId}/type`);
  if (data?.user_type) return data.user_type;
  const err = new Error(data?.message || 'Failed to get user type');
  throw err;
}

//check if user is admin
export async function isAdmin(userId) {
  const userType = await checkUserType(userId);
  return userType === 'admin';
}

// Get current session user (via /api/me)
export async function getSessionUser() {
  try {
    const { data } = await axios.get('/api/me');
    return data; // expected to be full user row
  } catch (err) {
    // Not logged in or error
    return null;
  }
}

export async function getCurrentCustomerId() {
  if (getCurrentCustomerId._cache) return getCurrentCustomerId._cache;

  const session = await getSessionUser();
  const userId = session?.user_id || session?.id;
  if (!userId) throw new Error('Not logged in');

  try {
    const { data } = await axios.get(`/api/customers/by-user/${userId}`);
    if (data?.cust_id) {
      getCurrentCustomerId._cache = data.cust_id;
      return data.cust_id;
    }
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
  }

  // If not found, auto-create customer (idempotent with UNIQUE on customers.user_id)
  const { data: createData } = await axios.post('/api/customers', { user_id: userId });
  if (createData?.cust_id) {
    getCurrentCustomerId._cache = createData.cust_id;
    return createData.cust_id;
  }
  throw new Error('Failed to resolve customer id');
}

// Fetch recipes with optional query params (server may ignore unknown params; we also filter client-side)
export async function fetchRecipes({ search = '', categoryId = 'all', dietId = 'all', minPrice, maxPrice, minCalories, maxCalories } = {}) {
  // Menu items live under /api/menu. Use /search when any filter is active.
  const hasFilters = (search && search.trim()) || categoryId !== 'all' || dietId !== 'all' ||
    minPrice != null || maxPrice != null || minCalories != null || maxCalories != null;
  const params = {};
  if (search && search.trim()) params.q = search.trim();
  if (categoryId !== 'all') params.category = categoryId;
  if (dietId !== 'all') params.dietType = dietId;
  if (minPrice != null && minPrice !== '') params.minPrice = Number(minPrice);
  if (maxPrice != null && maxPrice !== '') params.maxPrice = Number(maxPrice);
  if (minCalories != null && minCalories !== '') params.minCalories = Number(minCalories);
  if (maxCalories != null && maxCalories !== '') params.maxCalories = Number(maxCalories);
  const path = hasFilters ? '/api/menu/search' : '/api/menu';
  const { data } = await axios.get(path, { params });
  return Array.isArray(data?.items) ? data.items : [];
}

// Fetch diet types for filters
export async function fetchDietTypes() {
  const { data } = await axios.get('/api/diet/types');
  return Array.isArray(data?.items) ? data.items : [];
}

// Bulk update recipe prices (backend should implement this endpoint)
export async function bulkUpdateRecipePrices({ recipeIds, newPrice }) {
  if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
    throw new Error('No recipes selected');
  }
  if (newPrice == null || isNaN(Number(newPrice))) {
    throw new Error('Invalid new price');
  }
  const payload = { recipeIds, newPrice: Number(newPrice) };
  const { data } = await axios.patch('/api/recipes/bulk_price', payload);
  return data;
}

//validate email
export function validateEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

// Detect a banned-account error coming from the backend
// We treat HTTP 403 with a message that includes 'banned' (case-insensitive) as banned
export function isBannedError(err) {
  const status = err?.response?.status;
  const msg = (err?.response?.data?.message || err?.response?.data?.error || err?.message || '').toString().toLowerCase();
  return status === 403 && msg.includes('bann'); // matches 'ban', 'banned'
}

// Normalize and check if a question/item is public
// Accepts booleans, 1/0, and 'true'/'false' strings
export function isPublicQuestion(q) {
  const v = q && q.public;
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return !!v;
}

// admin makes question public
export async function makeQuestionPublic(questionId, userId) {
  const admin = await isAdmin(userId);
  if (!admin) {
    throw new Error('You are not authorized to make a question public');
  }
  const { data } = await axios.patch(`/api/questions/${questionId}/visibility`, { public: true });
  return data;
}

// =============================
// Admin dashboard helpers
// =============================

// Returns dashboard stats object
export async function fetchDashboardStatsAPI() {
  const { data } = await axios.get('/api/admin/data/stats');
  return data;
}

// Returns recent users array; accepts optional limit (default 5)
export async function fetchRecentUsersAPI({ limit = 5 } = {}) {
  const { data } = await axios.get('/api/admin/data/users', { params: { limit } });
  return data;
}

// Returns all users (no limit)
export async function fetchAllUsersAPI() {
  const { data } = await axios.get('/api/admin/data/users');
  return data;
}


//fetch all recipes (admin scope)
export async function fetchAllRecipesAPI() {
  const { data } = await axios.get('/api/admin/recipes');
  return data;
}

//fetch a specific recipe (admin scope)
export async function fetchRecipeAPI(recipeId) {
  const { data } = await axios.get(`/api/admin/recipes/${recipeId}`);
  return data;
}

// =============================
// Public recipes (customer-facing)
// =============================
// Fetch all public recipes
export async function fetchPublicRecipesAPI() {
  const { data } = await axios.get('/api/recipes', { withCredentials: false });
  // server may return array or { items }
  return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
}

// Fetch a single public recipe by id
export async function fetchPublicRecipeAPI(recipeId) {
  const { data } = await axios.get(`/api/recipes/${recipeId}`, { withCredentials: false });
  return data?.item || data;
}

//for calorie calculator
const activityMultipliers = {
  עצמוני: 1.2,
  קל: 1.375,
  בינוני: 1.55,
  פעיל: 1.725,
  "פעיל מאוד": 1.9,
};

export function calculateBMR({ age, gender, height, weight }) {
  if (gender === "זכר") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

export function calculateMacros({ bmr, activity_level }) {
  const calories = Math.round(bmr * activityMultipliers[activity_level]);
  const protein = Math.round((calories * 0.25) / 4); // 25% protein
  const fat = Math.round((calories * 0.25) / 9);     // 25% fat
  const carbs = Math.round((calories * 0.5) / 4);    // 50% carbs

  return { calories, protein, fat, carbs };
}

export function calculateCalories(form) {
  const bmr = calculateBMR(form);
  return calculateMacros({ bmr, activity_level: form.activity_level });
}

