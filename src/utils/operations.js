export const API = import.meta.env.VITE_API_URL;
export const currency = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});
export const formatMoney = (amount) => currency.format(Number(amount || 0));

const hotelDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Athens",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayAtHotel() {
  const parts = Object.fromEntries(hotelDate.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return [parts.year, parts.month, parts.day].join("-");
}

export function isActiveBooking(booking) {
  return !["no-show", "cancelled", "canceled", "removed", "deleted"].includes(
    String(booking.status || booking.bookingStatus || "").toLowerCase(),
  ) && !booking.cancelled && !booking.canceled && !booking.removed && !booking.deleted &&
    !booking.isDeleted && booking.active !== false;
}

export const overlapsStay = (booking, checkIn, checkOut) =>
  booking.checkIn < checkOut && booking.checkOut > checkIn;

export const guestCount = (booking) => Number(booking.adults || 0) + Number(booking.kids || 0);
export const balanceDue = (booking) => booking.paid ? 0 : Math.max(0, Number(booking.totalAmount || 0) - Number(booking.deposit || 0));
export const errorMessage = (error, fallback) =>
  typeof error.response?.data?.error === "string" ? error.response.data.error : fallback;

