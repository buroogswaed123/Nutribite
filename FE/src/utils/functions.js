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
