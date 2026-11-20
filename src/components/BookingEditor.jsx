import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { WorkspaceDialog } from "./Workspace";
import { API, balanceDue, errorMessage, formatMoney, guestCount, isActiveBooking, overlapsStay } from "../utils/operations";

const URL = API + "/bookings";
const defaults = {
  guestName: "", room: "", checkIn: "", checkOut: "", adults: 2, kids: 0,
  channel: "Direct", totalAmount: "", deposit: 0, paid: false, notes: "",
};

export default function BookingEditor({ booking, seed, rooms, bookings, onClose, onSave, onDelete, readOnly }) {
  const inactive = booking && !isActiveBooking(booking);
  const [initial] = useState(() => ({ ...defaults, ...(booking || seed) }));
  const [form, setForm] = useState(initial);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const dirty = Object.keys(defaults).some((key) => form[key] !== initial[key]);
  const validDates = form.checkIn && form.checkOut && form.checkOut > form.checkIn;
  const nights = validDates ? differenceInCalendarDays(parseISO(form.checkOut), parseISO(form.checkIn)) : 0;
  const selectedRoom = rooms.find((room) => room.name === form.room);

  function roomIssue(room) {
    if (room.status === "maintenance" && !(booking?.room === room.name && booking?.checkIn === form.checkIn && booking?.checkOut === form.checkOut)) return "Room is under maintenance.";
    if (guestCount(form) > Number(room.capacity)) return "Room sleeps up to " + room.capacity + " guests.";
    if (validDates && bookings.some((other) => other.id !== booking?.id && other.room === room.name && overlapsStay(other, form.checkIn, form.checkOut))) return "Room is reserved for these dates.";
    return "";
  }

  const availabilityIssue = !form.room || inactive ? "" : selectedRoom ? roomIssue(selectedRoom) : "This room no longer exists.";

  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined, room: undefined }));
    setError("");
  }

  function close() {
    if (pending) return;
    if (dirty) setConfirmation("discard");
    else onClose();
  }

  async function submit(event) {
    event.preventDefault();
    if (pending || readOnly || inactive || confirmation) return;
    const errors = {};
    if (!form.guestName?.trim()) errors.guestName = "Enter the guest name.";
    if (!form.checkIn) errors.checkIn = "Enter a check-in date.";
    if (!validDates) errors.checkOut = "Choose a date after check-in.";
    if (!Number.isInteger(Number(form.adults)) || Number(form.adults) < 1) errors.adults = "Enter at least one adult.";
    if (!Number.isInteger(Number(form.kids)) || Number(form.kids) < 0) errors.kids = "Enter zero or more children.";
    if (!form.room || availabilityIssue) errors.room = availabilityIssue || "Choose a room.";
    if (form.totalAmount === "" || !Number.isFinite(Number(form.totalAmount)) || Number(form.totalAmount) < 0) errors.totalAmount = "Enter a total of zero or more.";
    if (!Number.isFinite(Number(form.deposit)) || Number(form.deposit) < 0 || Number(form.deposit) > Number(form.totalAmount)) errors.deposit = "Deposit must be between zero and the booking total.";

    setFieldErrors(errors);
    setError("");
    if (Object.keys(errors).length) {
      document.getElementById("booking-" + Object.keys(errors)[0])?.focus();
      return;
    }

    setPending(true);
    try {
      const payload = {
        ...Object.fromEntries(Object.keys(defaults).map((field) => [field, form[field]])),
        guestName: form.guestName.trim(),
        adults: Number(form.adults), kids: Number(form.kids),
        totalAmount: Number(form.totalAmount), deposit: Number(form.deposit),
        price: Number((Number(form.totalAmount) / nights).toFixed(2)),
      };
      const { data: saved } = booking ? await axios.put(URL + "/" + booking.id, payload) : await axios.post(URL, payload);
      onSave(saved, booking ? "Booking updated." : "Booking created.");
    } catch (failure) {
      setError(errorMessage(failure, "The booking could not be saved. Try again."));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (pending || readOnly) return;
    setPending(true);
    setError("");
    try {
      await axios.delete(URL + "/" + booking.id);
      onDelete(booking.id);
    } catch (failure) {
      setError(errorMessage(failure, "The booking could not be deleted. Try again."));
      setConfirmation("");
    } finally {
      setPending(false);
    }
  }

  function field(name, label, type = "text", attributes = {}) {
    return <label className="workspace-field">{label}
      <input id={"booking-" + name} className="workspace-input" type={type} value={form[name] ?? ""} onChange={(event) => change(name, event.target.value)} {...attributes}
        aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? "error-" + name : undefined} />
      {fieldErrors[name] && <span className="workspace-field-error" id={"error-" + name}>{fieldErrors[name]}</span>}
    </label>;
  }

  return (
    <WorkspaceDialog wide title={booking ? booking.guestName : "New booking"} onClose={close}>
      <form noValidate className="booking-editor" onSubmit={submit}>
        <div className="workspace-dialog-body">
          {inactive && <p className="workspace-badge workspace-badge-warn mb-4">{booking.status === "no-show" ? "No-show" : "Inactive"} · Reservation history</p>}
          <fieldset disabled={pending || Boolean(inactive) || readOnly} className="space-y-5">
            <div className="workspace-form-grid">
              {field("guestName", "Guest name")}
              <label className="workspace-field">Booking channel
                <select className="workspace-input" value={form.channel} onChange={(event) => change("channel", event.target.value)}>
                  {[...new Set(["Direct", "Booking.com", "Expedia", "Airbnb", "Travel agent", "Other", form.channel].filter(Boolean))].map((channel) => <option key={channel}>{channel}</option>)}
                </select>
              </label>
              {field("checkIn", "Check-in", "date")}
              {field("checkOut", "Check-out", "date", { min: form.checkIn || undefined })}
              {field("adults", "Adults", "number", { min: 1, step: 1 })}
              {field("kids", "Children", "number", { min: 0, step: 1 })}
            </div>
            <label className="workspace-field"><span>Room {nights > 0 && <span className="workspace-muted">· {nights} {nights === 1 ? "night" : "nights"}</span>}</span>
              <select id="booking-room" className="workspace-input" value={form.room} onChange={(event) => change("room", event.target.value)} aria-invalid={Boolean(fieldErrors.room || availabilityIssue)} aria-describedby={fieldErrors.room || availabilityIssue ? "error-room" : undefined}>
                <option value="">Select a room</option>
                {form.room && !selectedRoom && <option value={form.room}>{form.room}</option>}
                {rooms.map((room) => {
                  const issue = roomIssue(room);
                  return <option key={room.id} value={room.name} disabled={Boolean(issue) && room.name !== form.room}>{room.name} · {room.type} · Sleeps {room.capacity}{issue ? " · " + issue : ""}</option>;
                })}
              </select>
              {(fieldErrors.room || availabilityIssue) && <span className="workspace-field-error" id="error-room">{availabilityIssue || fieldErrors.room}</span>}
            </label>
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold">Payment</h3>
              <div className="workspace-form-grid">{field("totalAmount", "Stay total (€)", "number", { min: 0, step: "0.01" })}{field("deposit", "Deposit received (€)", "number", { min: 0, step: "0.01" })}</div>
              <div className="workspace-actions justify-between">
                <label className="workspace-field !flex-row items-center"><input type="checkbox" checked={Boolean(form.paid)} onChange={(event) => change("paid", event.target.checked)} /> Paid in full</label>
                <span className={"workspace-badge" + (form.paid ? " workspace-badge-ready" : "")}>{form.paid ? "Paid" : formatMoney(balanceDue(form)) + " remaining"}</span>
                {nights > 0 && <span className="workspace-muted">{formatMoney(Number(form.totalAmount) / nights)} per night</span>}
              </div>
            </div>
            <label className="workspace-field">Notes<textarea className="workspace-input min-h-[84px]" value={form.notes || ""} onChange={(event) => change("notes", event.target.value)} /></label>
          </fieldset>
          {error && <p className="workspace-alert mt-4" role="alert">{error}</p>}
        </div>
        <div className="workspace-dialog-footer">
          {confirmation === "discard" ? <><span className="mr-auto text-sm font-semibold" role="status">Discard unsaved changes?</span><button type="button" className="workspace-button" onClick={() => setConfirmation("")}>Keep editing</button><button type="button" className="workspace-button workspace-danger" onClick={onClose}>Discard changes</button></> :
            confirmation === "delete" ? <><span className="mr-auto text-sm font-semibold" role="status">Permanently delete this booking?</span><button type="button" className="workspace-button" disabled={pending} onClick={() => setConfirmation("")}>Cancel</button><button type="button" className="workspace-button workspace-danger" disabled={pending || readOnly} onClick={remove}>{pending ? "Deleting…" : "Delete booking"}</button></> :
            <>
              {booking && <button type="button" className="workspace-button workspace-danger mr-auto" disabled={pending || readOnly} onClick={() => setConfirmation("delete")}>Delete booking</button>}
              {booking && !dirty && !inactive && !readOnly && <Link className="workspace-button" to={"/invoices/new?booking=" + encodeURIComponent(booking.id)}>Create invoice</Link>}
              <button type="button" className="workspace-button" disabled={pending} onClick={close}>{inactive ? "Close" : "Cancel"}</button>
              {!inactive && <button type="submit" className="workspace-button workspace-primary" disabled={pending || readOnly}>{pending ? "Saving…" : booking ? "Save changes" : "Create booking"}</button>}
            </>}
        </div>
      </form>
    </WorkspaceDialog>
  );
}

