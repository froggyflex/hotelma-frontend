import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach auth exactly like PMS
API.interceptors.request.use((config) => {
  const user = localStorage.getItem("user");
  if (user) {
    config.headers.Authorization = `Bearer ${user}`;
  }
  return config;
});

// PRODUCTS
export const getKitchenProducts = () => API.get("/api/kitchen/products");
export const createKitchenProduct = (data) =>
  API.post("/api/kitchen/products", data);
export const updateKitchenProduct = (id, data) =>
  API.put(`/api/kitchen/products/${id}`, data);

// NOTES
export const getKitchenNotes = () => API.get("/api/kitchen/notes");
export const createKitchenNote = (data) =>
  API.post("/api/kitchen/notes", data);
export const updateKitchenNote = (id, data) =>
  API.put(`/api/kitchen/notes/${id}`, data);

// TABLES
export const getKitchenTables = () => API.get("/api/kitchen/tables");
export const createKitchenTable = (data) =>
  API.post("/api/kitchen/tables", data);
export const updateKitchenTable = (id, data) =>
  API.put(`/api/kitchen/tables/${id}`, data);

export const createKitchenProductsBulk = (payload) =>
  API.post("/api/kitchen/products/bulk", payload);