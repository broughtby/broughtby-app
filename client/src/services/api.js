import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// User endpoints
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getAmbassadors: (params) => api.get('/users/ambassadors', { params }),
};

// Like endpoints
export const likeAPI = {
  createLike: (ambassadorId) => api.post('/likes', { ambassadorId }),
  createPass: (ambassadorId) => api.post('/likes/pass', { ambassadorId }),
  declineLike: (brandId) => api.post('/likes/decline', { brandId }),
  demoAcceptLike: (ambassadorId) => api.post('/likes/demo-accept', { ambassadorId }),
  getReceivedLikes: () => api.get('/likes/received'),
};

// Match endpoints
export const matchAPI = {
  createMatch: (brandId) => api.post('/matches', { brandId }),
  getMatches: () => api.get('/matches'),
};

// Message endpoints
export const messageAPI = {
  getMessages: (matchId) => api.get(`/messages/${matchId}`),
  createMessage: (matchId, content) => api.post('/messages', { matchId, content }),
};

// Booking endpoints
export const bookingAPI = {
  createBooking: (data) => api.post('/bookings', data),
  getBookings: () => api.get('/bookings'),
  getBookingById: (id) => api.get(`/bookings/${id}`),
  updateBookingStatus: (id, status) => api.put(`/bookings/${id}/status`, { status }),
  deleteBooking: (id) => api.delete(`/bookings/${id}`),
  checkIn: (id) => api.post(`/bookings/${id}/check-in`),
  checkOut: (id) => api.post(`/bookings/${id}/check-out`),
  getTimeStatus: (id) => api.get(`/bookings/${id}/time-status`),
};

// Admin endpoints
export const adminAPI = {
  searchUsers: (query) => api.get('/admin/users/search', { params: { q: query } }),
  impersonateUser: (userId) => api.post('/admin/impersonate', { userId }),
  stopImpersonation: () => api.post('/admin/stop-impersonation'),
  resetDemoData: (targetUserId) => api.post('/admin/reset-demo-data', { targetUserId }),
};

// Review endpoints
export const reviewAPI = {
  createReview: (data) => api.post('/reviews', data),
  getBookingReviews: (bookingId) => api.get(`/reviews/booking/${bookingId}`),
  getUserReviews: (userId) => api.get(`/reviews/user/${userId}`),
  getBookingsNeedingReview: () => api.get('/reviews/needs-review'),
};

// Preview endpoints
export const previewAPI = {
  resetPreview: () => api.post('/preview/reset'),
};

export default api;
