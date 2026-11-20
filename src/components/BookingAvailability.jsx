import { useState } from "react";
import { guestCount, overlapsStay } from "../utils/operations";
import { WorkspaceDialog } from "./Workspace";
import OfferTemplate from "./OfferTemplate";

function availableOptions(stay, rooms, bookings) {
  const eligible = rooms.filter((room) => room.status !== "maintenance");
  const fitting = eligible.filter((room) => Number(room.capacity) >= guestCount(stay));
  const conflicts = (room, checkIn, checkOut) =>
    bookings.filter((booking) => booking.room === room.name && overlapsStay(booking, checkIn, checkOut));
  const freeRooms = fitting.filter((room) => !conflicts(room, stay.checkIn, stay.checkOut).length);
  const swaps = fitting.flatMap((room) => {
    const blockers = conflicts(room, stay.checkIn, stay.checkOut);
    if (blockers.length !== 1) return [];
    const [booking] = blockers;
    return eligible
      .filter((target) => target.name !== room.name && Number(target.capacity) >= guestCount(booking))
      .filter((target) => !conflicts(target, booking.checkIn, booking.checkOut).length)
      .map((target) => ({ booking, from: room.name, to: target.name }));
  });
  return { freeRooms, swaps };
}

export default function BookingAvailability({ rooms, bookings, onClose, onSelect }) {
  const [request, setRequest] = useState({ checkIn: "", checkOut: "", adults: 2, kids: 0 });
  const [checked, setChecked] = useState(false);
  const [offer, setOffer] = useState(null);
  const [error, setError] = useState("");
  const { freeRooms, swaps } = checked ? availableOptions(request, rooms, bookings) : { freeRooms: [], swaps: [] };
  const groups = new Map();
  for (const room of freeRooms) {
    const group = groups.get(room.type) || { type: room.type, capacity: 0, rooms: [] };
    group.capacity = Math.max(group.capacity, Number(room.capacity));
    group.rooms.push(room.name);
    groups.set(room.type, group);
  }

  function check(event) {
    event.preventDefault();
    if (request.checkOut <= request.checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }
    setError("");
    setChecked(true);
  }

  return (
    <WorkspaceDialog title="Check availability" wide onClose={onClose}>
      <div className="workspace-dialog-body space-y-4">
        <form className="workspace-form-grid" onSubmit={check}>
          {[["checkIn", "Check-in", "date"], ["checkOut", "Check-out", "date"], ["adults", "Adults", "number"], ["kids", "Children", "number"]].map(([field, label, type]) => (
            <label key={field} className="workspace-field">{label}
              <input className="workspace-input" type={type} required min={field === "adults" ? 1 : field === "kids" ? 0 : undefined} value={request[field]}
                onChange={(event) => { setRequest({ ...request, [field]: event.target.value }); setChecked(false); setOffer(null); setError(""); }} />
            </label>
          ))}
          <button className="workspace-button workspace-primary justify-self-start">Find rooms</button>
        </form>
        {error && <p className="workspace-alert" role="alert">{error}</p>}
        {checked && (
          <div className="space-y-4">
            <h3 className="font-semibold">{freeRooms.length ? "Available rooms" : "No rooms fit these dates and guest count"}</h3>
            {Array.from(groups.values()).map((group) => (
              <section key={group.type} className="workspace-panel">
                <div className="workspace-panel-header"><strong>{group.type}</strong><button type="button" className="workspace-button" onClick={() => setOffer(group)}>Prepare offer</button></div>
                {group.rooms.map((room) => <div className="workspace-row" key={room}><span>Room {room} · Sleeps {rooms.find((entry) => entry.name === room)?.capacity}</span><button className="workspace-button workspace-primary" onClick={() => onSelect({ ...request, room })}>Book room {room}</button></div>)}
              </section>
            ))}
            {offer && <section className="space-y-2"><h3 className="font-semibold">Offer for {offer.type}</h3><OfferTemplate key={offer.type} start={request.checkIn} end={request.checkOut} adults={Number(request.adults)} kids={Number(request.kids)} roomType={offer} /></section>}
            {swaps.length > 0 && <details className="workspace-panel workspace-panel-body">
              <summary className="cursor-pointer font-semibold">Possible room moves ({swaps.length})</summary>
              <ul className="mt-3 space-y-2 text-sm">{swaps.map(({ booking, from, to }) => <li key={booking.id + "-" + to}>Move {booking.guestName} from room {from} to {to} to free room {from}.</li>)}</ul>
            </details>}
          </div>
        )}
      </div>
    </WorkspaceDialog>
  );
}

