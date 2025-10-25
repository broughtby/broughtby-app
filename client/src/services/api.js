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

export default api;
