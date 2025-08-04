import axios from 'axios';
import { useAuthStore } from './store';

// 1. Read the base URL from the environment variable.
// The NEXT_PUBLIC_ prefix is required for Next.js to expose the variable to the browser.
// We also provide a default value for local development if the variable isn't set.
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Optional: A log to confirm which API endpoint is being used during development.
console.log(`API requests will be sent to: ${baseURL}`);

const api = axios.create({
  baseURL: baseURL,
});

// Add a response interceptor to handle expired tokens
api.interceptors.response.use(
  (response) => response, // Directly return successful responses
  (error) => {
    // Check if the error is for an expired token (401 Unauthorized)
    if (error.response && error.response.status === 401) {
      // Access the logout function from the auth store
      // NOTE: This must be done inside the callback to get the current state
      const { logout } = useAuthStore.getState();
      logout();
    }
    // Return the error to be handled by the component's catch block
    return Promise.reject(error);
  }
);


export default api;