import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// attach auth token (same as PMS)
API.interceptors.request.use((config) => {
  const user = localStorage.getItem("user");
  if (user) {
    config.headers.Authorization = `Bearer ${user}`;
  }
  return config;
});

// READ-ONLY endpoints
export const fetchActiveProducts = async () => {
  const res = await API.get("/api/kitchen/products");
  return res.data.filter((p) => p.active);
};

export const fetchActiveNotes = async () => {
  const res = await API.get("/api/kitchen/notes");
  return res.data.filter((n) => n.active);
};

export const fetchActiveTables = async () => {
  const res = await API.get("/api/kitchen/tables");
  return res.data.filter((t) => t.active);
};
