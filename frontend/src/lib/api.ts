// src/lib/api.ts

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000', // The base URL of your backend
});

// The interceptor has been removed. We will handle auth headers manually.

export default api;