// src/config.js
// ✅ APENAS LOCALHOST - SEM NGROK

export const API_URL = 'http://localhost:3000';

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
  
  // Empréstimos
  loanRequest: `${API_URL}/api/loan/request`,
  loanReserve: `${API_URL}/api/loan/reserve`,
  loanRequestReturn: `${API_URL}/api/loan/request-return`,
  loanCancelRequest: `${API_URL}/api/loan/cancel-request`,
  loanCancelReserve: `${API_URL}/api/loan/cancel-reserve`,
  loanMarkRead: `${API_URL}/api/loan/mark-read`,
  
  // Favoritos
  favorites: `${API_URL}/api/favorites`,
  favoriteRemove: (bookId) => `${API_URL}/api/favorites/${bookId}`,
  
  // Prateleiras
  shelves: `${API_URL}/api/user/shelves`,
  shelfRemove: (shelfId) => `${API_URL}/api/user/shelves/${shelfId}`,
  shelfAddBook: `${API_URL}/api/user/shelves/add-book`,
  
  // Dashboard
  dashboard: `${API_URL}/api/user/dashboard`,
  
  // Notificações
  notifications: `${API_URL}/api/user/notifications`,
  notificationMarkRead: `${API_URL}/api/user/notifications/mark-read`,
  
  // Resenhas
  reviews: `${API_URL}/api/reviews`,
  review: (bookId) => `${API_URL}/api/reviews/${bookId}`,
  reviewUpdate: (reviewId) => `${API_URL}/api/reviews/${reviewId}`,
  reviewDelete: (reviewId) => `${API_URL}/api/reviews/${reviewId}`,
  
  // Conquistas
  achievements: `${API_URL}/api/user/achievements`,
  checkAchievements: `${API_URL}/api/user/check-achievements`,
  
  // Admin
  adminDashboard: `${API_URL}/api/admin/dashboard`,
  adminConfirmPickup: `${API_URL}/api/admin/confirm-pickup`,
  adminApproveReturn: `${API_URL}/api/admin/approve-return`,
  adminUsers: `${API_URL}/api/users`,
  adminAddAdmin: `${API_URL}/api/admin/add-admin`,
  adminRemoveAdmin: `${API_URL}/api/admin/remove-admin`,
  adminReport: `${API_URL}/api/admin/report`,
  
  // Testes
  testSimple: `${API_URL}/api/test-simple`,
  testConnection: `${API_URL}/api/test-connection`,
};

export const apiConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // ⚡ CRUCIAL para enviar cookies
};

export default { API_URL, API_ENDPOINTS, apiConfig };