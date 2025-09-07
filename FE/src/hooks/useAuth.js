// imports functions from utils and "translates" them to be used in the components

import { 
  login, 
  register, 
  checkUserType, 
  validateEmail, 
  isBannedError,
  fetchDashboardStatsAPI,
  fetchRecentUsersAPI,
  fetchAllUsersAPI,
  fetchAllRecipesAPI,
  fetchRecipeAPI,
  fetchPublicRecipesAPI,
  fetchPublicRecipeAPI,
  updateUserRoleAPI,
  updateUserBanStatusAPI,
  deleteUserAPI,
  updateUserBanDetailsAPI,
  createNotificationAPI,
  adminBanUserAPI,
  adminUnbanUserAPI,
} from "../utils/functions";

// exports useAuth hook
 export function useAuth() {
  const doLogin = async (identifier, password) => {
    const method = validateEmail(identifier) ? "email" : "username";
    try {
      return await login(identifier, password, method);
    } catch (err) {
      // Normalize banned error to a Hebrew message for consumers
      if (isBannedError(err)) {
        const banned = new Error("החשבון שלך נחסם. אנא פנה לתמיכה אם אתה סבור שזה טעות.");
        banned.code = "BANNED";
        throw banned;
      }
      throw err;
    }
  };

  const doRegister = async (username, email, password, user_type) => {
    return await register(username, email, password, user_type);
  };

  const getUserType = async (userId) => {
    return await checkUserType(userId);
  };

  // Admin dashboard helpers
  const fetchDashboardStats = async () => {
    return await fetchDashboardStatsAPI();
  };

  const fetchRecentUsers = async (limit = 5) => {
    return await fetchRecentUsersAPI({ limit });
  };

  const fetchAllUsers = async () => {
    return await fetchAllUsersAPI();
  };

  const fetchAllRecipes = async () => {
    return await fetchAllRecipesAPI();
  };

  const fetchRecipe = async (recipeId) => {
    return await fetchRecipeAPI(recipeId);
  };

  // Public-facing recipes
  const fetchPublicRecipes = async () => {
    return await fetchPublicRecipesAPI();
  };

  const fetchPublicRecipe = async (recipeId) => {
    return await fetchPublicRecipeAPI(recipeId);
  };

  const updateUserRole = async (userId, user_type) => {
    return await updateUserRoleAPI(userId, user_type);
  };

  const updateUserBanStatus = async (userId, banned) => {
    return await updateUserBanStatusAPI(userId, banned);
  };

  const deleteUser = async (userId) => {
    return await deleteUserAPI(userId);
  };

  const updateUserBanDetails = async (userId, payload) => {
    return await updateUserBanDetailsAPI(userId, payload);
  };

  const createNotification = async (payload) => {
    return await createNotificationAPI(payload);
  };

  // New canonical ban/unban helpers aligned with backend routes
  const adminBanUser = async (userId, { reason } = {}) => {
    return await adminBanUserAPI(userId, { reason });
  };
  const adminUnbanUser = async (userId) => {
    return await adminUnbanUserAPI(userId);
  };

  // Provide aliases to match existing component usage
  return {
    doLogin,
    doRegister,
    getUserType,
    fetchDashboardStats,
    fetchRecentUsers,
    fetchAllUsers,
    fetchAllRecipes,
    fetchRecipe,
    fetchPublicRecipes,
    fetchPublicRecipe,
    updateUserRole,
    updateUserBanStatus,
    deleteUser,
    updateUserBanDetails,
    createNotification,
    adminBanUser,
    adminUnbanUser,
    login: doLogin,
    register: doRegister,
    checkUserType: getUserType,
  };
}
