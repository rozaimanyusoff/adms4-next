import axios from 'axios';

// Sanitize the base URL to avoid double slashes
const baseURL = `${process.env.NEXT_PUBLIC_API_URL}`.replace(/([^:]\/\/)+/g, '$1');

// Create an Axios instance with the base URL
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create an Axios instance for authenticated requests
const authenticatedApi = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add an interceptor to include the Bearer token from AuthContext
authenticatedApi.interceptors.request.use((config) => {
  if (!config.headers) {
    config.headers = {};
  }
  const token = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData') || '{}').token : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { api, authenticatedApi };