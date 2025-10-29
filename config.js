// src/config.js
const isDevelopment = import.meta.env.DEV;

// ⚡ FORCE usar o ngrok do BACKEND (porta 3000)
export const API_URL = 'https://1f7d34df5a25.ngrok-free.app';

export const API_ENDPOINTS = {
  // Autenticação
  login: `${API_URL}/api/login`,
  register: `${API_URL}/api/register`,
  logout: `${API_URL}/api/logout`,
  checkCpf: (cpf) => `${API_URL}/api/check-cpf/${cpf}`,
  forgotPassword: `${API_URL}/api/forgot-password`,
  resetPassword: `${API_URL}/api/reset-password`,
  
  // Perfil
  profile: `${API_URL}/api/profile`,
  profileAvatar: `${API_URL}/api/profile/avatar`,
  profileBio: `${API_URL}/api/profile/bio`,
  profileName: `${API_URL}/api/profile/name`,
  
  // Livros
  books: `${API_URL}/api/books`,
  book: (id) => `${API_URL}/api/books/${id}`,
  bookUserStatus: (id) => `${API_URL}/api/books/${id}/user-status`,
  
  // Testes
  testSimple: `${API_URL}/api/test-simple`,
  testConnection: `${API_URL}/api/test-connection`,
};

export const apiConfig = {
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  credentials: 'include',
  withCredentials: true,
};

export default { API_URL, API_ENDPOINTS, apiConfig };