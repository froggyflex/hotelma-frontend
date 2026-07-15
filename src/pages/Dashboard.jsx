import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  format,
  parseISO
} from "date-fns";

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
  const bookingsByMonth = React.useMemo(() => {
        const map = {};

        bookings.forEach((b) => {
          const month = format(parseISO(b.checkIn), "MMMM yyyy");
          
          map[month] = (map[month] || 0) + 1;
        });

        return Object.entries(map);  
  }, [bookings]);

const fullyPaidExpectedRevenue = bookings
  .filter((b) => b.paid === true)
  .reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);


  // -------------------------------
// TODAY AT A GLANCE
// -------------------------------

// Next arrival (today, earliest check-in)
const nextArrival = arrivalsToday[0] || null;

// Next departure (today)
const nextDeparture = departuresToday[0] || null;

// Outstanding balance today
const outstandingToday = arrivalsToday.reduce((sum, b) => {
  if (b.paid) return sum;
  const total = Number(b.totalAmount || 0);
  const deposit = Number(b.deposit || 0);
  return sum + Math.max(0, total - deposit);
}, 0);

// Special notes summary (using your existing parsed notes)
const notesSummary = {
  flights: arrivalsToday.filter(b => b.flight).length,
  lateArrivals: arrivalsToday.filter(b => b.lateArrival).length,
  deposits: arrivalsToday.filter(b => Number(b.deposit) > 0).length,
};


return (
  <div className="w-full flex flex-col lg:flex-row gap-4 lg:gap-6 px-3 sm:px-4 lg:px-6 py-4">

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

    <div className="w-full lg:w-64 flex flex-col gap-4 lg:gap-6">

      {/* DATE CARD */}
      <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-400">
        <div className="text-4xl font-bold text-gray-900">
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
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-400 flex flex-col items-center">
        <div className="font-semibold text-gray-700">Occupancy</div>

        {/* DONUT (placeholder – plug your chart here) */}
        <div className="relative mt-4 h-28 w-28" aria-label={`${occupancyPercent}% occupancy`}>
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
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-400 space-y-3 ">
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
      
    </div>

    {/* ---------------------------------- */}
    {/* RIGHT MAIN DASHBOARD               */}
    {/* ---------------------------------- */}
    


    <div className="flex-1 flex flex-col gap-6">
 
      {/* ---------------------------------- */}
      {/* REVENUE OVERVIEW                   */}
      {/* ---------------------------------- */}
        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-300 rounded-2xl p-6 shadow-md">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            💶 Revenue Overview
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Monthly */}
            <div className="bg-white rounded-xl p-5 border border-blue-400">
              <div className="text-sm text-blue-700 font-medium">
                {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <div className="mt-2 text-3xl font-semibold text-blue-900">
                €{monthlyExpectedRevenue.toLocaleString()}
              </div>
            </div>

            {/* Total */}
            <div className="bg-white rounded-xl p-5 border border-slate-400">
              <div className="text-sm text-slate-600 font-medium">
                All bookings
              </div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">
                €{totalExpectedRevenue.toLocaleString()} 
                
                <div className="text-xs text-slate-500">
                  Deposits received: €{totalDeposits.toLocaleString()}
                </div>
              </div>
            </div>

        

            {/* Paid */}
            <div className="bg-white rounded-xl p-5 border border-emerald-400">
              <div className="text-sm text-emerald-700 font-medium">
                Fully paid
              </div>
              <div className="mt-2 text-3xl font-semibold text-emerald-900">
                €{fullyPaidExpectedRevenue.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
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
        </div>
       
      {/* ACTIVITY TABS */}
      <div className="bg-white rounded-xl shadow-md border border-gray-400 p-4 flex flex-wrap gap-4 justify-between sm:justify-start">

        <div className="cursor-pointer flex flex-col items-center ">
          <span className="text-lg font-semibold text-blue-600">{arrivalsToday.length}</span>
          <span className="text-gray-600 text-sm">Arrivals</span>
        </div>

        <div className="cursor-pointer flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-800">{departuresToday.length}</span>
          <span className="text-gray-600 text-sm">Departures</span>
        </div>

        <div className="cursor-pointer flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-800">{occupiedRoomCount}</span>
          <span className="text-gray-600 text-sm">In-house</span>
        </div>

        <div className="cursor-pointer flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-800">
            {Math.max(0, occupiedRoomCount - arrivalsToday.length)}
          </span>
          <span className="text-gray-600 text-sm">Stayovers</span>
        </div>
      </div>

      {/* ---------------------------------- */}
      {/* ARRIVALS TABLE                     */}
      {/* ---------------------------------- */}
      
 
      <div className="bg-white rounded-xl shadow-md border border-gray-400">
        <div className="px-4 py-2 bg-gray-100 border-b text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-blue-600">🛬</span> Arrivals Today
        </div>

        {arrivalsToday.length === 0 ? (
          <div className="p-6 text-gray-500 text-sm">No arrivals today.</div>
        ) : (
          <div className="divide-y">
            {arrivalsToday.map((b) => {
              const notes = parseNotes(b.notes);

              return (
                <div key={b.id} className="p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
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
                        {b.adults} adults, {b.kids} kids
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
      </div>



      {/* ---------------------------------- */}
      {/* DEPARTURES TABLE                   */}
      {/* ---------------------------------- */}
   
      <div className="bg-white rounded-xl shadow-md border border-gray-400">
        <div className="px-4 py-2 bg-gray-100 border-b text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-green-600">🛫</span> Departures Today
        </div>

        {departuresToday.length === 0 ? (
          <div className="p-6 text-gray-500 text-sm">No departures today.</div>
        ) : (
          <div className="divide-y">
            {departuresToday.map((b) => {
              const notes = parseNotes(b.notes);

              return (
                <div key={b.id} className="p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
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
                        {b.adults} adults, {b.kids} kids
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
      </div>

          
    <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
  <h3 className="text-sm font-semibold text-slate-700 mb-4">
    Today at a glance
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

    {/* Next arrival */}
    <div>
      <span className="text-slate-500">🛬 Next arrival</span>
      <div className="font-medium text-slate-800">
        {nextArrival
          ? `${nextArrival.guestName} — Room ${nextArrival.room}`
          : "No arrivals today"}
      </div>
      {nextArrival?.flight && (
        <div className="text-xs text-slate-500">
          Flight: {nextArrival.flight}
        </div>
      )}
    </div>

    {/* Next departure */}
    <div>
      <span className="text-slate-500">🛫 Next departure</span>
      <div className="font-medium text-slate-800">
        {nextDeparture
          ? `${nextDeparture.guestName} — Room ${nextDeparture.room}`
          : "No departures today"}
      </div>
    </div>

    {/* Outstanding balance */}
    <div>
      <span className="text-slate-500">💶 Outstanding today</span>
      <div className="font-semibold text-sky-700">
        €{outstandingToday.toLocaleString()}
      </div>
    </div>

    {/* Notes summary */}
    <div>
      <span className="text-slate-500">📝 Special notes</span>
      <div className="text-slate-700">
        {notesSummary.flights > 0 && `${notesSummary.flights} flights`}
        {notesSummary.lateArrivals > 0 && ` · ${notesSummary.lateArrivals} late arrivals`}
        {notesSummary.deposits > 0 && ` · ${notesSummary.deposits} deposits`}
        {(notesSummary.flights +
          notesSummary.lateArrivals +
          notesSummary.deposits) === 0 && "None"}
      </div>
    </div>

  </div>
</div>

    </div>
    
  </div>
  
);

}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
      <div className={`w-10 h-10 rounded-full ${accent} opacity-80`} />
    </div>
  )
}

function ListCard({ title, items }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-semibold mb-2 text-blue-700">{title}</h3>

      {items.length === 0 && (
        <p className="text-sm text-slate-400">No records.</p>
      )}

      <div className="space-y-3">
        {items.map((b) => {
          const parsedNotes = parseNotes(b.notes);

          return (
            <div
              key={b.id}
              className="border-b pb-3 last:border-none"
            >
              {/* Booking header */}
              <div className="flex justify-between items-center">
                <span className="font-medium">{b.guestName}</span>
                <span className="text-xs text-slate-500">
                  Room {b.room} • {b.checkIn} → {b.checkOut}
                </span>
              </div>

              {/* Notes */}
              {parsedNotes.length > 0 && (
                <ul className="mt-2 pl-4 space-y-1">
                  {parsedNotes.map((n, i) => (
                    <li key={i} className="text-sm text-slate-700 flex gap-2">
                      <span>{n.icon || "•"}</span>
                      <span>{n.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
