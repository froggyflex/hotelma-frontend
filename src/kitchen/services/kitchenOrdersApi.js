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

export const fetchOrdersByTable = async (tableId) => {
  const res = await API.get(`/api/kitchen/orders?tableId=${tableId}`);
  return res.data;
};

export const createKitchenOrder = async (payload) => {
  const res = await API.post("/api/kitchen/orders", payload);
  return res.data;
};

export const updateOrderPrintStatus = async (orderId, payload) => {
  const res = await API.patch(
    `/api/kitchen/orders/${orderId}/print-status`,
    payload
  );
  return res.data;
};

export async function fetchActiveOrderByTable(tableId) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/kitchen/orders/active/${tableId}`
  );
  return res.json();
}

export async function addItemsToOrder(orderId, items) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/kitchen/orders/${orderId}/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }
  );
  return res.json();
}

export async function markOrderPrinted(orderId) {
  await fetch(
    `${import.meta.env.VITE_API_URL}/api/kitchen/orders/${orderId}/print`,
    { method: "POST" }
  );
}

export async function markItemDelivered(itemId) {
  await fetch(
    `${import.meta.env.VITE_API_URL}/api/kitchen/orders/items/${itemId}/delivered`,
    { method: "PATCH" }
  );
}
export async function closeOrder(orderId) {
  await fetch(
    `${import.meta.env.VITE_API_URL}/api/kitchen/orders/${orderId}/close`,
    { method: "POST" }
  );
}

export const appendItemsToOrder = async (orderId, items) => {
   await fetch(
    `${import.meta.env.VITE_API_URL}/api/kitchen/orders/${orderId}/items${items}`,
    { method: "POST" }
  );
};


