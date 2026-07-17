import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Otomaatig ugu dar Token-ka codsi kasta haddii uu jiro localStorage
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('raysin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default client;