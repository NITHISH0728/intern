// src/config.ts

// This automatically chooses the right URL:
// - If you are working on localhost, it uses your local backend.
// - If you are deployed on Vercel, it uses the Render backend (we will set this up later).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export const endpoints = {
  login: `${API_BASE_URL}/auth/login`,
  courses: `${API_BASE_URL}/courses`,
  // Add other endpoints here...
};

export default API_BASE_URL;