import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Check, Clock3, Sparkles } from "lucide-react";
import { DataFeedback, useWorkspaceData } from "../components/Workspace";
import { API, errorMessage, isActiveBooking, todayAtHotel } from "../utils/operations";
import loadStays from "../utils/loadStays";

const labels = {
  dirty: "Needs cleaning", "in-progress": "In progress", clean: "Ready",
};

export default function Housekeeping() {
  const [params] = useSearchParams();
  const selectedRoom = params.get("room");
  const resource = useWorkspaceData(loadStays);
  const { data, setData, loading, error, reload } = resource;
  const [filter, setFilter] = useState("all");
  const [pending, setPending] = useState({});
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const today = todayAtHotel();

  const active = (data?.bookings || []).filter(isActiveBooking);
  const priority = (room) => {
    const { status } = room;
    const sameDayArrival = active.some((booking) => booking.room === room.name && booking.checkIn === today);
    if (["dirty", "in-progress"].includes(status)) return sameDayArrival ? 0 : 1;
    return status === "clean" ? 2 : 3;
  };

  const rooms = [...(data?.rooms || [])].sort((a, b) => priority(a) - priority(b) || String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
  const visible = rooms.filter((room) => (filter === "all" || room.status === filter) && (!selectedRoom || selectedRoom === room.name));

  async function updateStatus(room, status) {
    if (pending[room.id]) return;
    setPending((current) => ({ ...current, [room.id]: true }));
    setActionError("");
    setNotice("");
    try {
      const { data: saved } = await axios.patch(API + "/rooms/" + room.id + "/cleaning", { status, expectedStatus: room.status ?? null });
      if (saved.id !== room.id || saved.status !== status) throw new Error("Room status not confirmed");
      setData((current) => ({ ...current, rooms: current.rooms.map((entry) => entry.id === room.id ? saved : entry) }));
      setNotice("Room " + room.name + " · " + labels[status]);
    } catch (failure) {
      setActionError(errorMessage(failure, "Could not update room " + room.name + ". Try again."));
      if (failure.response?.status === 409) await reload();
    } finally {
      setPending((current) => ({ ...current, [room.id]: false }));
    }
  }

  return <div className="workspace">
    <header className="workspace-heading">
      <div><h1>Housekeeping</h1><p className="mt-1">Rooms with arrivals today appear first in the cleaning queue.</p></div>
      {selectedRoom && <Link to="/housekeeping" className="workspace-button">All rooms</Link>}
    </header>
    {actionError && <p className="workspace-alert" role="alert">{actionError}</p>}
    {notice && <p className="workspace-badge workspace-badge-ready justify-self-start" role="status">{notice}</p>}
    {(!data || loading || error) && <DataFeedback {...resource} />}
    {data && <>
      <section className="workspace-panel">
        <div className="workspace-toolbar" aria-label="Filter rooms">
          {[["all", "All"], ...Object.entries(labels)].map(([value, label]) =>
            <button key={value} className={"workspace-button" + (value === filter ? " workspace-primary" : "")}
              aria-pressed={value === filter} onClick={() => setFilter(value)}>
              {label} · {value === "all" ? rooms.length : rooms.filter((room) => room.status === value).length}
            </button>)}
        </div>
        {visible.length === 0 && <p className="workspace-empty">{rooms.length ? "No rooms match this view." : "No rooms have been set up."}</p>}
        {visible.map((room) => {
          const { status } = room;
          const arrival = active.find((booking) => booking.room === room.name && booking.checkIn === today);
          const departure = active.find((booking) => booking.room === room.name && booking.checkOut === today);
          const urgent = arrival && ["dirty", "in-progress"].includes(status);
          const disabled = pending[room.id] || loading || Boolean(error);
          const statusLabel = labels[status] || (status === "maintenance" ? "Maintenance" : status === "occupied" ? "Occupied" : "Status unset");

          return <article className="workspace-row housekeeping-room" key={room.id}>
            <div className="space-y-1 min-w-0">
              <div className="workspace-actions"><h2>Room {room.name}</h2>
                <span className={"workspace-badge" + (status === "clean" ? " workspace-badge-ready" : urgent ? " workspace-badge-warn" : "")}>{statusLabel}</span>
                {urgent && <span className="workspace-badge workspace-badge-warn"><Clock3 size={14} /> Arrival today</span>}
              </div>
              <p className="workspace-muted">{room.type} · Sleeps {room.capacity}</p>
              <div className="workspace-actions">
                {departure && <Link to={"/bookings?booking=" + encodeURIComponent(departure.id)} className="workspace-muted underline">Departure today</Link>}
                {arrival && <Link to={"/bookings?booking=" + encodeURIComponent(arrival.id)} className="workspace-muted underline">View arrival</Link>}
              </div>
            </div>
            {status !== "maintenance" && status !== "occupied" && (
              <div className="workspace-actions">
                {status === "dirty" ? <button className="workspace-button workspace-primary" disabled={disabled} onClick={() => updateStatus(room, "in-progress")}><Sparkles size={17} /> {pending[room.id] ? "Saving…" : "Start cleaning"}</button> :
                  status === "in-progress" ? <button className="workspace-button workspace-primary" disabled={disabled} onClick={() => updateStatus(room, "clean")}><Check size={18} /> {pending[room.id] ? "Saving…" : "Mark ready"}</button> : null}
                {status !== "dirty" && <button className="workspace-button" disabled={disabled} onClick={() => updateStatus(room, "dirty")}>Mark dirty</button>}
              </div>
            )}
          </article>;
        })}
      </section>
      {!loading && !error && <DataFeedback {...resource} />}
    </>}
  </div>;
}

