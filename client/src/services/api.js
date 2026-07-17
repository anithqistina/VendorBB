import axios from "axios";
import { showToast } from "./toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("vendorbb_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add global response interceptor to handle token expiry (401/403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response || error.code === "ERR_NETWORK") {
      showToast("Cannot connect to the backend server! Please ensure the server is running on port 5000.", "error", "Connection Error");
    } else if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem("vendorbb_token");
      localStorage.removeItem("vendorbb_user");
      // Only redirect if not already on the login page
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;