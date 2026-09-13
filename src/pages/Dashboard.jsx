import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  BedDouble,
  CalendarDays,
  LogIn,
  LogOut,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import { getFcmToken } from "../firebaseMessaging";

const API = import.meta.env.VITE_API_URL;
const URL  = `${API}/bookings`;
const URLR = `${API}/rooms`;

function parseNotes(text) {
  if (!text) return [];

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  return lines.flatMap((line) => {
    let icon = null;
    let enriched = line;
    let extraItem = null; // For “Late arrival” additional row

    // 🔍 Detect flight numbers (A3, U2, FR, BA, LX, TK, etc.)
    const flightRegex = /\b([A-Z]{2,3}\d{3,4})\b/;
    const flightMatch = line.match(flightRegex);

    if (flightMatch) {
      const flight = flightMatch[1];
      icon = "✈️";
      const url = `https://www.flightradar24.com/${flight}`;

      enriched = (
        <span>
          {line.replace(flight, "")} 
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline ml-1"
          >
            {flight} (Track Flight)
          </a>
        </span>
      );
    }

    // 🔍 Detect times (23:40, 00:15, etc.)
    const timeRegex = /\b([01]?\d|2[0-3]):[0-5]\d\b/;
    const timeMatch = line.match(timeRegex);

    if (timeMatch) {
      const time = timeMatch[0];
      icon = icon || "⏱️";

      // Convert HH:MM → number for comparison
      const [hh, mm] = time.split(":").map(Number);

      if (hh >= 22) {
        // Create extra warning line
        extraItem = {
          text: `Late arrival (${time})`,
          icon: "🌙"
        };
      }
    }

    // Detect keywords
    const keywords = [
      { word: "cot", icon: "🛏️" },
      { word: "baby", icon: "👶" },
      { word: "vip", icon: "⭐" },
      { word: "allergy", icon: "⚠️" },
      { word: "birthday", icon: "🎂" },
      { word: "anniversary", icon: "💍" },
      { word: "transfer", icon: "🚐" },
      { word: "late", icon: "🌙" },
    ];

    for (const k of keywords) {
      if (typeof enriched === "string" && enriched.toLowerCase().includes(k.word)) {
        icon = icon || k.icon;
      }
    }

    const items = [{ text: enriched, icon }];
    if (extraItem) items.push(extraItem);

    return items;
  });
}

const norm = (d) => new Date(d).toISOString().slice(0, 10);

const formatGuests = (booking) => {
  const adults = Number(booking.adults || 0);
  const kids = Number(booking.kids || 0);
  const parts = [`${adults} ${adults === 1 ? "adult" : "adults"}`];

  if (kids > 0) parts.push(`${kids} ${kids === 1 ? "child" : "children"}`);
  return parts.join(" · ");
};

const isActiveArrivalBooking = (booking) => {
  const status = String(booking.status || booking.bookingStatus || "").toLowerCase();

  return (
    status !== "cancelled" &&
    status !== "canceled" &&
    status !== "removed" &&
    status !== "deleted" &&
    booking.cancelled !== true &&
    booking.canceled !== true &&
    booking.removed !== true &&
    booking.deleted !== true &&
    booking.isDeleted !== true &&
    booking.active !== false
  );
};

 
export default function Dashboard() {
  const [bookings, setBookings] = useState([])
  const [rooms, setRooms] = useState([])
  const [removingArrivalId, setRemovingArrivalId] = useState(null)
  const [conflictDetailsOpen, setConflictDetailsOpen] = useState(false)
  
  
  useEffect(() => {
    axios.get(URL).then((res) => setBookings(res.data))
    axios.get(URLR).then((res) => setRooms(res.data))

     
  }, [])

 
const authToken = localStorage.getItem("user");
useEffect(() => {
  async function registerToken() {
    const token = await getFcmToken();
    if (!token) return;

    await fetch("https://hotelma.onrender.com/register-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
  }

  registerToken();
}, []);

  const removeArrival = async (booking) => {
    if (!booking?.id) return;
    if (!window.confirm(`Remove ${booking.guestName || "this arrival"} from bookings?`)) return;

    try {
      setRemovingArrivalId(booking.id);
      await axios.delete(`${URL}/${booking.id}`);
      setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    } catch (err) {
      console.error("Failed to remove arrival:", err);
      alert("Could not remove this arrival. Please try again.");
    } finally {
      setRemovingArrivalId(null);
    }
  };
   
  //from the database => "2025-11-24"
  const todayStr = new Date().toISOString().slice(0, 10)
  const today = new Date();    

  const arrivalsToday = bookings.filter((b) => (
    isActiveArrivalBooking(b) && norm(b.checkIn) === todayStr
  ))

  const departuresToday = bookings.filter((b) => norm(b.checkOut) === todayStr)
   
  const occupiedToday = bookings.filter(
    (b) => isActiveArrivalBooking(b) && norm(b.checkIn) <= todayStr && norm(b.checkOut) > todayStr
  )
  const knownRoomNames = new Set(rooms.map((room) => String(room.name)));
  const occupiedRoomNames = new Set(
    occupiedToday
      .map((booking) => String(booking.room))
      .filter((roomName) => knownRoomNames.has(roomName))
  );
  const occupiedRoomCount = occupiedRoomNames.size;
  const occupancyPercent = rooms.length
    ? Math.min(100, Math.round((occupiedRoomCount / rooms.length) * 100))
    : 0;
  const overlappingBookingsToday = Math.max(0, occupiedToday.length - occupiedRoomCount);
  const occupiedBookingCounts = occupiedToday.reduce((counts, booking) => {
    const roomName = String(booking.room);
    counts.set(roomName, (counts.get(roomName) || 0) + 1);
    return counts;
  }, new Map());
  const overlappingRoomNames = Array.from(occupiedBookingCounts)
    .filter(([roomName, count]) => knownRoomNames.has(roomName) && count > 1)
    .map(([roomName]) => roomName);
  const unknownRoomBookingsToday = occupiedToday.filter(
    (booking) => !knownRoomNames.has(String(booking.room))
  );
  const unknownRoomBookingsCount = unknownRoomBookingsToday.length;
  const conflictRoomGroups = overlappingRoomNames.map((roomName) => {
    const roomBookings = occupiedToday
      .filter((booking) => String(booking.room) === roomName)
      .sort((a, b) => String(a.checkIn).localeCompare(String(b.checkIn)));
    const overlaps = [];

    roomBookings.forEach((booking, index) => {
      roomBookings.slice(index + 1).forEach((otherBooking) => {
        const overlapStart = booking.checkIn > otherBooking.checkIn ? booking.checkIn : otherBooking.checkIn;
        const overlapEnd = booking.checkOut < otherBooking.checkOut ? booking.checkOut : otherBooking.checkOut;
        if (overlapStart < overlapEnd) {
          overlaps.push({ booking, otherBooking, overlapStart, overlapEnd });
        }
      });
    });

    return { roomName, bookings: roomBookings, overlaps };
  });

  const dirtyRooms = rooms.filter((r) => r.status === 'dirty')
 
  // -------------------------------
  // REVENUE CALCULATIONS
  // -------------------------------

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const overlapsCurrentMonth = (b) => {
    const ci = new Date(b.checkIn);
    const co = new Date(b.checkOut);
    return !(co <= monthStart || ci >= monthEnd);
  };

  const monthlyExpectedRevenue = bookings
    .filter(overlapsCurrentMonth)
    .reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

  const totalExpectedRevenue = bookings.reduce(
    (sum, b) => sum + Number(b.totalAmount || 0),
    0
  );

  const totalDeposits = bookings.reduce(
    (sum, b) => sum + Number(b.deposit || 0),
    0
  );
  const expectedRevenueByYear = useMemo(() => {
    const totals = new Map();

    bookings.forEach((booking) => {
      if (!isActiveArrivalBooking(booking)) return;

      const year = Number(String(booking.checkIn || "").slice(0, 4));
      const amount = Number(booking.totalAmount || 0);
      if (!Number.isInteger(year) || !Number.isFinite(amount)) return;

      const current = totals.get(year) || { revenue: 0, bookings: 0 };
      totals.set(year, {
        revenue: current.revenue + amount,
        bookings: current.bookings + 1,
      });
    });

    return Array.from(totals, ([year, values]) => ({ year, ...values }))
      .sort((a, b) => a.year - b.year);
  }, [bookings]);

  const formatCurrency = (amount) => new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
const fullyPaidExpectedRevenue = bookings
  .filter((b) => b.paid === true)
  .reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);


  // -------------------------------
// TODAY AT A GLANCE
// -------------------------------

// Outstanding balance today
const outstandingToday = arrivalsToday.reduce((sum, b) => {
  if (b.paid) return sum;
  const total = Number(b.totalAmount || 0);
  const deposit = Number(b.deposit || 0);
  return sum + Math.max(0, total - deposit);
}, 0);

const arrivalAttentionCount = arrivalsToday.filter((booking) => (
  /\b[A-Z]{2,3}\d{3,4}\b/i.test(booking.notes || "") ||
  /\blate\b/i.test(booking.notes || "") ||
  /\b(?:22|23):[0-5]\d\b/.test(booking.notes || "") ||
  Number(booking.deposit) > 0
)).length;


return (
  <div className="mx-auto flex w-full max-w-[1600px] flex-col items-start gap-4 lg:flex-row">

    {conflictDetailsOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
        onMouseDown={() => setConflictDetailsOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="conflict-details-title"
          className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Data integrity</p>
              <h2 id="conflict-details-title" className="mt-1 text-xl font-semibold text-slate-900">Today's occupancy conflicts</h2>
              <p className="mt-1 text-sm text-slate-500">These bookings all include {todayStr} and require review.</p>
            </div>
            <button
              type="button"
              onClick={() => setConflictDetailsOpen(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-500 hover:bg-slate-50"
              aria-label="Close conflict details"
            >
              &times;
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            {conflictRoomGroups.map(({ roomName, bookings: roomBookings, overlaps }) => (
              <section key={roomName} className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Room {roomName}</h3>
                    <p className="text-xs text-amber-800">{roomBookings.length} simultaneous bookings</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Overlap</span>
                </div>
                <div className="space-y-1.5 border-b border-amber-100 bg-amber-50/50 px-4 py-3 text-sm text-amber-900">
                  {overlaps.map(({ booking, otherBooking, overlapStart, overlapEnd }) => (
                    <div key={`${booking.id}-${otherBooking.id}`}>
                      <span className="font-semibold">{booking.guestName}</span> and <span className="font-semibold">{otherBooking.guestName}</span>
                      {" overlap from "}<span className="font-semibold">{overlapStart}</span> to <span className="font-semibold">{overlapEnd}</span>
                      <span className="text-xs text-amber-700"> (check-out exclusive)</span>
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-slate-100">
                  {roomBookings.map((booking) => (
                    <div key={booking.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1.3fr_1fr_auto] sm:items-center">
                      <div>
                        <div className="font-semibold text-slate-900">{booking.guestName || "Unnamed guest"}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {booking.channel || "Direct"} · Booking {String(booking.id).slice(-8)}
                        </div>
                      </div>
                      <div className="text-sm text-slate-700">
                        <div>{booking.checkIn} → {booking.checkOut}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {Number(booking.adults || 0)} adults · {Number(booking.kids || 0)} children
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-slate-500">Expected</div>
                        <div className="font-semibold text-slate-900">{formatCurrency(Number(booking.totalAmount || 0))}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {unknownRoomBookingsToday.length > 0 && (
              <section className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
                <div className="border-b border-red-100 bg-red-50 px-4 py-3">
                  <h3 className="font-semibold text-slate-900">Unknown room assignments</h3>
                  <p className="text-xs text-red-700">The assigned room no longer exists in the Rooms list.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {unknownRoomBookingsToday.map((booking) => (
                    <div key={booking.id} className="grid gap-2 px-4 py-4 sm:grid-cols-2">
                      <div>
                        <div className="font-semibold text-slate-900">{booking.guestName || "Unnamed guest"}</div>
                        <div className="text-sm text-red-700">Assigned room: {booking.room || "None"}</div>
                      </div>
                      <div className="text-sm text-slate-700 sm:text-right">{booking.checkIn} → {booking.checkOut}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <p className="text-xs text-slate-500">Open Bookings to edit or remove the incorrect reservation.</p>
            <a href="/bookings" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Open bookings</a>
          </div>
        </div>
      </div>
    )}

    {/* ---------------------------------- */}
    {/* LEFT SIDEBAR (DATE + OCCUPANCY)    */}
    {/* ---------------------------------- */}

    <aside className="flex w-full flex-col gap-3 lg:sticky lg:top-0 lg:w-56 lg:shrink-0">

      {/* DATE CARD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
        <CalendarDays className="mx-auto mb-2 h-5 w-5 text-blue-600" aria-hidden="true" />
        <div className="text-3xl font-bold text-slate-900">
          {today.toLocaleDateString("en-US", { day: "numeric" })}
        </div>
        <div className="text-gray-500 text-lg -mt-1">
          {today.toLocaleDateString("en-US", { weekday: "long" })}
        </div>
        <div className="text-gray-400 text-sm mt-1">
          {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
      </div>

      {/* OCCUPANCY CARD */}
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="font-semibold text-gray-700">Occupancy</div>

        {/* DONUT (placeholder – plug your chart here) */}
        <div className="relative mt-3 h-24 w-24" aria-label={`${occupancyPercent}% occupancy`}>
          <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="48" fill="none" stroke="#3b82f6" strokeWidth="10"
              strokeLinecap="round" pathLength="100" strokeDasharray={`${occupancyPercent} 100`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-blue-600">
            {occupancyPercent}%
          </span>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          {occupiedRoomCount} / {rooms.length} occupied
        </div>
        {overlappingBookingsToday > 0 && (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
            <div>{overlappingBookingsToday} occupancy {overlappingBookingsToday === 1 ? "conflict" : "conflicts"} detected</div>
            {overlappingRoomNames.length > 0 && <div className="mt-1">Overlapping: room {overlappingRoomNames.join(", ")}</div>}
            {unknownRoomBookingsCount > 0 && <div className="mt-1">Unknown room assignments: {unknownRoomBookingsCount}</div>}
            <button
              type="button"
              onClick={() => setConflictDetailsOpen(true)}
              className="mt-2 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
            >
              View conflict details
            </button>
          </div>
        )}
      </div>

      {/* UNITS BREAKDOWN */}
      <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="font-semibold text-gray-700">Units Overview</div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Available units</span>
          <span className="font-medium">{Math.max(0, rooms.length - occupiedRoomCount)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Booked units</span>
          <span className="font-medium">{occupiedRoomCount}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Dirty rooms</span>
          <span className="font-medium">{dirtyRooms.length}</span>
        </div>
      </div>
      
    </aside>

    {/* ---------------------------------- */}
    {/* RIGHT MAIN DASHBOARD               */}
    {/* ---------------------------------- */}
    


    <main className="grid min-w-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-2">
 
      {/* ---------------------------------- */}
      {/* REVENUE OVERVIEW                   */}
      {/* ---------------------------------- */}
        <section className="order-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm xl:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            💶 Revenue Overview
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Monthly */}
            <div className="rounded-xl border border-blue-200 bg-white p-4">
              <div className="text-sm text-blue-700 font-medium">
                {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <div className="mt-1 text-2xl font-semibold text-blue-900">
                €{monthlyExpectedRevenue.toLocaleString()}
              </div>
            </div>

            {/* Total */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-600 font-medium">
                All bookings
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">
                €{totalExpectedRevenue.toLocaleString()} 
                
                <div className="text-xs text-slate-500">
                  Deposits received: €{totalDeposits.toLocaleString()}
                </div>
              </div>
            </div>

        

            {/* Paid */}
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <div className="text-sm text-emerald-700 font-medium">
                Fully paid
              </div>
              <div className="mt-1 text-2xl font-semibold text-emerald-900">
                €{fullyPaidExpectedRevenue.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-800">Expected income by year</h4>
                <p className="text-xs text-slate-500">Grouped by each booking's arrival year</p>
              </div>
            </div>

            {expectedRevenueByYear.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-sm text-slate-500">No booking income available.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {expectedRevenueByYear.map(({ year, revenue, bookings: count }) => (
                  <div key={year} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-600">{year}</span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {count} {count === 1 ? "booking" : "bookings"}
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatCurrency(revenue)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
       
      {/* ACTIVITY TABS */}
      <section className="order-1 grid w-full grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-3 xl:col-span-2 xl:grid-cols-6">

        <div className="flex items-center gap-3 bg-white px-4 py-3">
          <LogIn className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <div><div className="text-xl font-semibold text-slate-900">{arrivalsToday.length}</div><div className="text-xs text-slate-500">Arrivals</div></div>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-3">
          <LogOut className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          <div><div className="text-xl font-semibold text-slate-900">{departuresToday.length}</div><div className="text-xs text-slate-500">Departures</div></div>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-3">
          <Users className="h-5 w-5 text-violet-600" aria-hidden="true" />
          <div><div className="text-xl font-semibold text-slate-900">{occupiedRoomCount}</div><div className="text-xs text-slate-500">In-house</div></div>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-3">
          <BedDouble className="h-5 w-5 text-cyan-600" aria-hidden="true" />
          <div><div className="text-xl font-semibold text-slate-900">{Math.max(0, rooms.length - occupiedRoomCount)}</div><div className="text-xs text-slate-500">Available</div></div>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-3">
          <WalletCards className="h-5 w-5 text-amber-600" aria-hidden="true" />
          <div><div className="text-xl font-semibold text-slate-900">{formatCurrency(outstandingToday)}</div><div className="text-xs text-slate-500">Due today</div></div>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-3">
          <Sparkles className="h-5 w-5 text-rose-500" aria-hidden="true" />
          <div>
            <div className="text-xl font-semibold text-slate-900">{arrivalAttentionCount}</div>
            <div className="text-xs text-slate-500">Arrival flags</div>
          </div>
        </div>
      </section>

      {/* ---------------------------------- */}
      {/* ARRIVALS TABLE                     */}
      {/* ---------------------------------- */}
      
 
      <section className="order-2 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><LogIn className="h-5 w-5 text-blue-600" aria-hidden="true" /> Arrivals today</div>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">{arrivalsToday.length}</span>
        </div>

        {arrivalsToday.length === 0 ? (
          <div className="p-6 text-gray-500 text-sm">No arrivals today.</div>
        ) : (
          <div className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
            {arrivalsToday.map((b) => {
              const notes = parseNotes(b.notes);

              return (
                <div key={b.id} className="flex flex-col gap-2 p-3.5 sm:flex-row sm:gap-3">
                  {/* LEFT: guest + stay + notes */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <div>
                        <div className="font-medium text-gray-800">{b.guestName}</div>
                        <div className="text-xs text-gray-500">
                          Room {b.room} • {b.checkIn} → {b.checkOut}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {formatGuests(b)}
                      </div>
                    </div>

                    {/* REMARKS / NOTES */}
                    {notes.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs sm:text-xs text-gray-700 leading-snug">
                        {notes.map((n, i) => (
                          <li key={i} className="flex items-start gap-2">
                            {n.icon && <span className="mt-[1px]">{n.icon}</span>}
                            <span>{n.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* RIGHT: action */}
                  <div className="self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => removeArrival(b)}
                      disabled={removingArrivalId === b.id}
                      className="px-4 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removingArrivalId === b.id ? "Removing..." : "No-show"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>



      {/* ---------------------------------- */}
      {/* DEPARTURES TABLE                   */}
      {/* ---------------------------------- */}
   
      <section className="order-3 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><LogOut className="h-5 w-5 text-emerald-600" aria-hidden="true" /> Departures today</div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{departuresToday.length}</span>
        </div>

        {departuresToday.length === 0 ? (
          <div className="p-6 text-gray-500 text-sm">No departures today.</div>
        ) : (
          <div className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
            {departuresToday.map((b) => {
              const notes = parseNotes(b.notes);

              return (
                <div key={b.id} className="flex flex-col gap-2 p-3.5 sm:flex-row sm:gap-3">
                  {/* LEFT: guest + stay + notes */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <div>
                        <div className="font-medium text-gray-800">{b.guestName}</div>
                        <div className="text-xs text-gray-500">
                          Room {b.room} • {b.checkIn} → {b.checkOut}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {formatGuests(b)}
                      </div>
                    </div>

                    {/* REMARKS / NOTES */}
                    {notes.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs sm:text-xs text-gray-700 leading-snug">
                        {notes.map((n, i) => (
                          <li key={i} className="flex items-start gap-2">
                            {n.icon && <span className="mt-[1px]">{n.icon}</span>}
                            <span>{n.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* RIGHT: action */}
                  <div className="self-center">
                    <button className="px-4 py-1.5 rounded-full bg-gray-200 text-gray-800 text-xs font-medium hover:bg-gray-400">
                      Check-out
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </main>
    
  </div>
  
);

}
