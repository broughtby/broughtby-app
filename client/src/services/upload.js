import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Upload photo file
export const uploadPhoto = async (file) => {
  try {
    const formData = new FormData();
    formData.append('photo', file);

    const token = localStorage.getItem('token');

    // Build headers - only include Authorization if token exists
    const headers = {
      'Content-Type': 'multipart/form-data',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.post(`${API_URL}/upload/photo`, formData, {
      headers,
    });

    return {
      success: true,
      filePath: response.data.filePath,
      fileName: response.data.fileName,
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || 'Upload failed',
    };
  }
};

export const getPhotoUrl = (filePath) => {
  if (!filePath) return null;

  // If it's already a full URL (Cloudinary URL), return it
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  // Legacy support: For old local file paths, construct the server URL
  // (This will only be needed during migration period)
  const baseUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';
  return `${baseUrl}${filePath}`;
};
