import React, { useEffect, useState } from 'react'
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

  console.log("Bookings:", bookings);
  const arrivalsToday = bookings.filter((b) => (
    isActiveArrivalBooking(b) && norm(b.checkIn) === todayStr
  ))

  const departuresToday = bookings.filter((b) => norm(b.checkOut) === todayStr)
   
  const occupiedToday = bookings.filter(
    (b) => norm(b.checkIn) <= todayStr && norm(b.checkOut) > todayStr
  )

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
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-400 flex flex-col items-center flex-1 space-y-6">
        <div className="font-semibold text-gray-700 mb-3">Occupancy</div>

        {/* DONUT (placeholder – plug your chart here) */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[8px] sm:border-[10px] border-blue-500 border-t-gray-300 flex items-center justify-center ">
          <span className="text-xl font-semibold text-blue-600">
            {Math.round((occupiedToday.length / rooms.length) * 100)}%
          </span>
        </div>

        <div className="text-gray-500 text-sm mt-4">
          {occupiedToday.length} / {rooms.length} occupied
        </div>
      </div>

      {/* UNITS BREAKDOWN */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-400 space-y-3 ">
        <div className="font-semibold text-gray-700">Units Overview</div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Available units</span>
          <span className="font-medium">{rooms.length - occupiedToday.length}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Booked units</span>
          <span className="font-medium">{occupiedToday.length}</span>
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
          <span className="text-lg font-semibold text-gray-800">{occupiedToday.length}</span>
          <span className="text-gray-600 text-sm">In-house</span>
        </div>

        <div className="cursor-pointer flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-800">
            {occupiedToday.length - arrivalsToday.length}
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
