import axios from "axios";
import { API } from "./operations";

export default async function loadStays(signal) {
  const [bookings, rooms] = await Promise.all([
    axios.get(API + "/bookings", { signal }),
    axios.get(API + "/rooms", { signal }),
  ]);
  if (!Array.isArray(bookings.data) || !Array.isArray(rooms.data)) throw new Error("Invalid response");
  return { bookings: bookings.data, rooms: rooms.data };
}

