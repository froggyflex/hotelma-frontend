import React, { useEffect, useState } from 'react'
import axios from 'axios'

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

    // 🔍 Detect keywords
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


export default function Dashboard() {
  const [bookings, setBookings] = useState([])
  const [rooms, setRooms] = useState([])

  useEffect(() => {
    axios.get(URL).then((res) => setBookings(res.data))
    axios.get(URLR).then((res) => setRooms(res.data))
  }, [])

  const todayStr = new Date().toISOString().slice(0, 10)

  const arrivalsToday = bookings.filter((b) => b.checkIn === todayStr)
  const departuresToday = bookings.filter((b) => b.checkOut === todayStr)
  const occupiedToday = bookings.filter(
    (b) => b.checkIn <= todayStr && b.checkOut > todayStr
  )

  const dirtyRooms = rooms.filter((r) => r.status === 'dirty')

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-2">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Arrivals today" value={arrivalsToday.length} accent="bg-emerald-500" />
        <StatCard label="Departures today" value={departuresToday.length} accent="bg-rose-500" />
        <StatCard label="Occupied today" value={occupiedToday.length} accent="bg-blue-500" />
        <StatCard label="Rooms needing cleaning" value={dirtyRooms.length} accent="bg-amber-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard title="Arrivals" items={arrivalsToday} />
        <ListCard title="Departures" items={departuresToday} />
      </div>
    </div>
  )
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
