// imports functions from utils and "translates" them to be used in the components

import { login, register, checkUserType, validateEmail } from "../utils/functions";

// exports useAuth hook
 export function useAuth() {
  const doLogin = async (identifier, password) => {
    const method = validateEmail(identifier) ? "email" : "username";
    return await login(identifier, password, method);
  };

  const doRegister = async (username, email, password, user_type) => {
    return await register(username, email, password, user_type);
  };

  const getUserType = async (userId) => {
    return await checkUserType(userId);
  };

  // Provide aliases to match existing component usage
  return {
    doLogin,
    doRegister,
    getUserType,
    login: doLogin,
    register: doRegister,
    checkUserType: getUserType,
  };
}
