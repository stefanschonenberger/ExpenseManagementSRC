import axios from 'axios';

// 1. Read the base URL from the environment variable.
// The NEXT_PUBLIC_ prefix is required for Next.js to expose the variable to the browser.
// We also provide a default value for local development if the variable isn't set.
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Optional: A log to confirm which API endpoint is being used during development.
console.log(`API requests will be sent to: ${baseURL}`);

const api = axios.create({
  baseURL: baseURL,
});

export default api;
