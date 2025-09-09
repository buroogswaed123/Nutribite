//functions to help the components be more readable

import axios from "axios";

// Axios defaults for dev: backend on 3000, include cookies
axios.defaults.baseURL = axios.defaults.baseURL || 'http://localhost:3000';
axios.defaults.withCredentials = true;

// Normalize image URLs to absolute backend-served paths
export function ensureImageUrl(val) {
  if (!val) return '';
  const cleaned = String(val).replace(/^\/+/, '');
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (/^uploads\//i.test(cleaned)) return `http://localhost:3000/${cleaned}`;
  return `http://localhost:3000/uploads/${cleaned}`;
}

// Get current plan daily calorie goal (calories_per_day) from nutritionplan
export async function getCurrentPlanGoalAPI() {
  const customerId = await getCurrentCustomerId();
  const plans = await listPlansAPI(customerId);
  const planId = Array.isArray(plans) && plans[0] ? plans[0].plan_id : null;
  if (!planId) return null;
  const plan = await getPlanAPI(planId);
  const goal = Number(plan?.calories_per_day || 0) || null;
  return goal;
}

// Overwrite a plan's products with exactly the provided list
// items: Array<{ product_id: number, servings?: number }>
export async function replacePlanProductsAPI(planId, items) {
  if (!planId) throw new Error('Missing planId');
  const payload = { items: Array.isArray(items) ? items : [] };
  const { data } = await axios.post(`/api/plan/${planId}/replace_products`, payload);
  return data; // { success, plan_id, replaced }
}

function extractOrThrow(responseData, fallbackMsg) {
  // Expecting { user, ... } on success
  if (responseData?.user) return responseData.user;
  const msg = responseData?.message || responseData?.error || fallbackMsg;
  const err = new Error(msg || fallbackMsg);
  if (responseData?.field) err.field = responseData.field;
  if (responseData?.code) err.code = responseData.code;
  throw err;
}

// Convenience: get top-rated summary for dashboard cards
// Returns array of { name, image, rating }
export async function getTopRatedSummaryAPI(limit = 3) {
  const items = await fetchTopRatedRecipesAPI(limit);
  return (items || []).map((r) => ({
    name: r.title || r.name || 'מתכון',
    image: ensureImageUrl(r.picture || r.imageUrl || r.image || ''),
    rating: Number(r.rating_avg ?? r.avg_rating ?? r.rating ?? 0) || 0,
  }));
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
  const session = await getSessionUser();
  const userId = session?.user_id || session?.id;
  if (!userId) throw new Error('Not logged in');

  // Cache per userId to avoid leaking IDs across accounts within the SPA session
  if (!getCurrentCustomerId._cache) getCurrentCustomerId._cache = {};
  if (getCurrentCustomerId._cache[userId]) return getCurrentCustomerId._cache[userId];

  try {
    const { data } = await axios.get(`/api/customers/by-user/${userId}`);
    if (data?.cust_id) {
      getCurrentCustomerId._cache[userId] = data.cust_id;
      return data.cust_id;
    }
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
  }

  // If not found, auto-create customer (idempotent with UNIQUE on customers.user_id)
  const { data: createData } = await axios.post('/api/customers', { user_id: userId });
  if (createData?.cust_id) {
    getCurrentCustomerId._cache[userId] = createData.cust_id;
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

// New canonical admin ban API (server implements POST /ban)
export async function adminBanUserAPI(userId, { reason } = {}) {
  if (!userId) throw new Error('Missing userId');
  const { data } = await axios.post(`/api/admin/users/${userId}/ban`, { reason });
  return data;
}

// New canonical admin unban API (server implements POST /unban)
export async function adminUnbanUserAPI(userId) {
  if (!userId) throw new Error('Missing userId');
  const { data } = await axios.post(`/api/admin/users/${userId}/unban`);
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

// Fetch top-rated recipes (max N). Tries backend endpoint first; falls back to client-side sort.
export async function fetchTopRatedRecipesAPI(limit = 3) {
  try {
    const { data } = await axios.get('/api/recipes/top-reviewed', { params: { limit }, withCredentials: false });
    const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    return items.slice(0, limit);
  } catch (err) {
    // Fallback: fetch all public recipes and sort by rating average if endpoint is missing
    const all = await fetchPublicRecipesAPI();
    const norm = (all || []).map(r => ({
      ...r,
      __rating: Number(r.rating_avg ?? r.avg_rating ?? r.rating ?? 0) || 0,
    }));
    return norm.sort((a, b) => b.__rating - a.__rating).slice(0, limit);
  }
}

// Ratings API
export async function getRecipeRatingsAPI(recipeId) {
  const { data } = await axios.get(`/api/recipes/${recipeId}/ratings`);
  return data; // { avg, count, userStars }
}

export async function rateRecipeAPI(recipeId, stars) {
  const { data } = await axios.post(`/api/recipes/${recipeId}/ratings`, { stars });
  return data; // { avg, count, userStars }
}

// Products by recipe helpers
export async function getProductByRecipeAPI(recipeId) {
  // Try admin endpoint first for richer data; fallback to public menu endpoint
  const tryAdmin = async () => {
    const { data } = await axios.get(`/api/admin/recipes/${recipeId}/product`);
    return data;
  };
  const tryPublic = async () => {
    const { data } = await axios.get(`/api/menu/by-recipe/${recipeId}`);
    return data;
  };
  const tryScanMenu = async () => {
    // Last-resort: scan public menu list and find matching recipe_id
    const { data } = await axios.get('/api/menu');
    const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    const found = items.find(it => String(it.recipe_id) === String(recipeId));
    if (!found) {
      const err = new Error('Product not found for recipe');
      err.status = 404;
      throw err;
    }
    return {
      product_id: found.product_id,
      recipe_id: found.recipe_id,
      price: found.price,
      stock: found.stock,
      name: found.name,
      picture: found.picture,
    };
  };
  let data;
  try {
    data = await tryAdmin();
  } catch (err) {
    // If admin route not available or unauthorized, try public route
    try {
      data = await tryPublic();
    } catch (err2) {
      // As a final fallback, scan /api/menu
      data = await tryScanMenu();
    }
  }
  // Normalize stock field for callers
  const stock = Number(
    data?.stock ?? data?.quantity ?? data?.qty ?? data?.available_stock ?? data?.inStock ?? 0
  ) || 0;
  return { ...data, stock };
}

export async function updateProductByRecipeAPI(recipeId, { price, stock }) {
  const payload = {};
  if (price != null) payload.price = price;
  if (stock != null) payload.stock = stock;
  const { data } = await axios.patch(`/api/admin/recipes/${recipeId}/product`, payload);
  return data;
}

// Bulk fetch all menu products once and build a quick lookup by recipe_id
export async function fetchMenuProductsMap() {
  const { data } = await axios.get('/api/menu');
  const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
  const map = {};
  for (const it of items) {
    const rid = it.recipe_id || it.recipe || it.rid;
    if (!rid) continue;
    const stock = Number(it.stock ?? it.quantity ?? it.qty ?? 0) || 0;
    map[rid] = stock;
  }
  return map;
}

// =============================
// Admin user management helpers
// =============================
// Update a user's role
export async function updateUserRoleAPI(userId, user_type) {
  if (!userId) throw new Error('Missing userId');
  if (!user_type) throw new Error('Missing user_type');
  const { data } = await axios.patch(`/api/admin/users/${userId}/role`, { user_type });
  return data;
}

// Ban or unban a user
export async function updateUserBanStatusAPI(userId, banned) {
  if (!userId) throw new Error('Missing userId');
  const { data } = await axios.patch(`/api/admin/users/${userId}/ban`, { banned: !!banned });
  return data;
}

// Update user's ban details (admin). Backend should accept these fields.
export async function updateUserBanDetailsAPI(userId, { banned, ban_reason, banned_at, ban_effective_at, banned_by }) {
  if (!userId) throw new Error('Missing userId');
  const payload = {};
  if (typeof banned !== 'undefined') payload.banned = !!banned;
  if (typeof ban_reason !== 'undefined') payload.ban_reason = ban_reason;
  if (typeof banned_at !== 'undefined') payload.banned_at = banned_at;
  if (typeof ban_effective_at !== 'undefined') payload.ban_effective_at = ban_effective_at;
  if (typeof banned_by !== 'undefined') payload.banned_by = banned_by;
  const { data } = await axios.patch(`/api/admin/users/${userId}/ban`, payload);
  return data;
}

// Delete a user
export async function deleteUserAPI(userId) {
  if (!userId) throw new Error('Missing userId');
  const { data } = await axios.delete(`/api/admin/users/${userId}`);
  return data;
}

// Restore a soft-deleted user
export async function adminRestoreUserAPI(userId) {
  if (!userId) throw new Error('Missing userId');
  const { data } = await axios.post(`/api/admin/users/${userId}/restore`);
  return data;
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


//fetch customer allergies
export async function fetchCustomerAllergiesAPI(customerId) {
  const { data } = await axios.get(`/api/customers/${customerId}/allergies`);
  return data;
}

// =============================
// Plan API helpers (customer plan CRUD)
// =============================

export async function listPlansAPI(customerId) {
  const params = {};
  if (customerId) params.customer_id = customerId;
  const { data } = await axios.get('/api/plan', { params });
  return data;
}

export async function getPlanAPI(planId) {
  const { data } = await axios.get(`/api/plan/${planId}`);
  return data;
}

export async function createPlanAPI(payload) {
  const { data } = await axios.post('/api/plan', payload);
  return data;
}

export async function addPlanProductAPI(planId, product_id, servings = 1) {
  const { data } = await axios.post(`/api/plan/${planId}/products`, { product_id, servings });
  return data;
}

export async function updatePlanProductAPI(planId, linkId, servings) {
  const { data } = await axios.patch(`/api/plan/${planId}/products/${linkId}`, { servings });
  return data;
}

export async function deletePlanProductAPI(planId, linkId) {
  const { data } = await axios.delete(`/api/plan/${planId}/products/${linkId}`);
  return data;
}

// Renew a plan: sets start_date=today and end_date=today+7 on server
export async function renewPlanAPI(planId) {
  if (!planId) throw new Error('Missing planId');
  const { data } = await axios.post(`/api/plan/${planId}/renew`);
  return data;
}

// Eligible menu items for a given customer and optional diet type
export async function fetchEligibleMenuAPI({ customer_id, dietType } = {}) {
  const params = {};
  if (customer_id != null) params.customer_id = String(customer_id);
  if (dietType != null) params.dietType = String(dietType);
  const { data } = await axios.get('/api/menu/eligible', { params });
  return data?.items || [];
}

// Fetch categories for Menu filters
export async function fetchMenuCategoriesAPI() {
  const { data } = await axios.get('/api/menu/categories');
  return Array.isArray(data?.items) ? data.items : [];
}



//Notifications management //

//get all notifications for user
export async function fetchNotificationsAPI(userId) {
  const { data } = await axios.get(`/api/notifications/user/${userId}`);
  return data;
}

//delete notification
export async function deleteNotificationAPI(notificationId) {
  const { data } = await axios.delete(`/api/notifications/${notificationId}`);
  return data;
}

//mark notification as read
export async function markNotificationReadAPI(notificationId) {
  if (!notificationId) throw new Error('Missing notificationId');
  const { data } = await axios.put(`/api/notifications/${notificationId}`);
  return data;
}

//create a notification (admin-only backend)
export async function createNotificationAPI({ user_id, type, related_id, title, description }) {
  if (!user_id) throw new Error('Missing user_id');
  if (!type) throw new Error('Missing type');
  const payload = { user_id, type, related_id, title, description };
  const { data } = await axios.post('/api/notifications', payload);
  return data;
}

//return notification type (order,ban,answer)=>for customers,(order,ban)=>for courier,(question)=>for admin
export async function getNotificationTypeAPI(userId) {
  try {
    const { data } = await axios.get(`/api/notifications/user/${userId}/type`);
    return data;
  } catch (err) {
    if (err?.response?.status === 404) {
      // Endpoint not implemented on backend; let caller fall back silently
      return [];
    }
    throw err;
  }
}

//delete all notifications for a given user
export async function deleteAllNotificationsAPI(userId) {
  if (!userId) throw new Error('Missing userId');
  const { data } = await axios.delete(`/api/notifications/user/${userId}`);
  return data;
}

// =============================
// Cart API helpers
// =============================
export async function getCartAPI() {
  const { data } = await axios.get('/api/cart');
  return Array.isArray(data?.items) ? data.items : [];
}

export async function getCartSummaryAPI() {
  const { data } = await axios.get('/api/cart/summary');
  return data || { total_price: 0, total_items: 0, total_calories: 0 };
}

export async function addToCartAPI(product_id, quantity = 1) {
  const payload = { product_id, quantity };
  const { data } = await axios.post('/api/cart', payload);
  return data;
}

export async function updateCartItemAPI(id, quantity) {
  const { data } = await axios.patch(`/api/cart/${id}`, { quantity });
  return data;
}

export async function removeCartItemAPI(id) {
  const { data } = await axios.delete(`/api/cart/${id}`);
  return data;
}

export async function clearCartAPI() {
  const { data } = await axios.delete('/api/cart');
  return data;
}

// Calorie goal (temporary local persistence)
const CAL_GOAL_KEY = 'nb_calorie_goal';
export function getCalorieGoal() {
  const v = (typeof localStorage !== 'undefined') ? localStorage.getItem(CAL_GOAL_KEY) : null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 2000; // default 2000 kcal
}
export function setCalorieGoal(val) {
  const n = Number(val);
  if (typeof localStorage !== 'undefined' && Number.isFinite(n) && n > 0) {
    localStorage.setItem(CAL_GOAL_KEY, String(n));
  }
}

// =============================
// Orders API helpers
// =============================
export async function checkoutOrderAPI({ schedule = {}, applyToAll = null } = {}) {
  const payload = { schedule, applyToAll };
  const { data } = await axios.post('/api/orders/checkout', payload);
  return data; // { order_id }
}

export async function listOrdersAPI() {
  const { data } = await axios.get('/api/orders');
  return Array.isArray(data?.items) ? data.items : [];
}

export async function getOrderAPI(orderId) {
  const { data } = await axios.get(`/api/orders/${orderId}`);
  return data; // { order, items }
}

// Add exact plan items to cart (server-side), no client suggestion logic
export async function addPlanToCartAPI(planId, { clear = true, quantityMode = 'one' } = {}) {
  const { data } = await axios.post(`/api/plan/${planId}/add_to_cart`, { clear, quantityMode });
  return data; // { added }
}

// Get all meals (products) in nutrition_plan_contains_products for the current plan
// Returns array of rows from GET /api/plan/:id/products
export async function getCurrentPlanProductsAPI() {
  // Resolve current customer -> latest plan -> products
  const customerId = await getCurrentCustomerId();
  const plans = await listPlansAPI(customerId);
  const planId = Array.isArray(plans) && plans[0] ? plans[0].plan_id : null;
  if (!planId) return [];
  const { data } = await axios.get(`/api/plan/${planId}/products`);
  const rows = Array.isArray(data) ? data : [];
  return rows.map(it => ({
    ...it,
    picture: ensureImageUrl(it.picture)
  }));
}
