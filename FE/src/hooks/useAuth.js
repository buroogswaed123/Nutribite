// imports functions from utils and "translates" them to be used in the components

import { 
  login, 
  register, 
  checkUserType, 
  validateEmail, 
  isBannedError,
  fetchDashboardStatsAPI,
  fetchRecentUsersAPI,
  fetchAllUsersAPI
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

  // Provide aliases to match existing component usage
  return {
    doLogin,
    doRegister,
    getUserType,
    fetchDashboardStats,
    fetchRecentUsers,
    fetchAllUsers,
    login: doLogin,
    register: doRegister,
    checkUserType: getUserType,
  };
}
