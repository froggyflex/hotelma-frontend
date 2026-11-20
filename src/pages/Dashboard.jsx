import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { AlertTriangle, BedDouble, ChevronRight, ClipboardList, LogIn, LogOut, Plus, Wallet } from "lucide-react";
import { DataFeedback, useWorkspaceData, WorkspaceDialog } from "../components/Workspace";
import { API, balanceDue, errorMessage, formatMoney, guestCount, isActiveBooking, overlapsStay, todayAtHotel } from "../utils/operations";
import loadStays from "../utils/loadStays";
import { getFcmToken } from "../firebaseMessaging";

const bookingLink = (booking) => "/bookings?booking=" + encodeURIComponent(booking.id);

function arrivalFlags(notes) {
  const flags = [];
  if (/\blate\b|\b(?:22|23):[0-5]\d\b/i.test(notes)) flags.push("Late arrival");
  if (/\btransfer\b/i.test(notes)) flags.push("Transfer");
  if (/\b(?:cot|baby)\b/i.test(notes)) flags.push("Cot / baby");
  if (/\b(?:vip|allergy|birthday|anniversary)\b/i.test(notes)) flags.push("Special request");
  return flags;
}

function StayList({ id, title, icon: Icon, bookings, onNoShow }) {
  return <section className="workspace-panel workspace-scroll-align" id={id}>
    <header className="workspace-panel-header">
      <h2 className="flex gap-2 items-center"><Icon size={19} aria-hidden="true" /> {title}</h2>
      <span className="workspace-badge">{bookings.length}</span>
    </header>
    {bookings.length === 0 && <p className="workspace-empty">No {title.toLowerCase()}.</p>}
    {bookings.map((booking) => {
      const due = balanceDue(booking);
      const flight = booking.notes?.match(/\b[A-Z]{2,3}\d{3,4}\b/)?.[0];
      const flags = onNoShow ? arrivalFlags(booking.notes || "") : [];
      return <div className="workspace-row" key={booking.id}>
        <div className="min-w-0 flex-1">
          <Link to={bookingLink(booking)} className="font-semibold hover:underline flex gap-1 items-center w-fit">{booking.guestName} <ChevronRight size={16} aria-hidden="true" /></Link>
          <p className="workspace-muted">Room {booking.room} · {guestCount(booking)} guests · {booking.channel || "Direct"}</p>
          {booking.notes && <p className="workspace-muted whitespace-pre-wrap break-words mt-1">{booking.notes}</p>}
          {(flags.length > 0 || flight) && <div className="workspace-actions mt-2">
            {flags.map((flag) => <span key={flag} className="workspace-badge workspace-badge-warn">{flag}</span>)}
            {flight && <a className="workspace-badge underline" href={"https://www.flightradar24.com/" + flight} target="_blank" rel="noreferrer">Track {flight}</a>}
          </div>}
        </div>
        <div className="workspace-actions">
          {due > 0 && <span className="workspace-badge workspace-badge-warn">{formatMoney(due)} due</span>}
          {onNoShow && <button type="button" className="workspace-button" aria-label={"Mark " + booking.guestName + " as no-show"} onClick={() => onNoShow(booking)}>No-show</button>}
        </div>
      </div>;
    })}
  </section>;
}

export default function Dashboard() {
  const resource = useWorkspaceData(loadStays);
  const { data, setData } = resource;
  const [noShow, setNoShow] = useState(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const today = todayAtHotel();

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const authToken = localStorage.getItem("user");
    getFcmToken().then((token) => token && axios.post(API + "/register-token", { token }, {
      headers: { Authorization: "Bearer " + authToken },
    })).catch((error) => console.warn("Could not register notifications:", error.message));
  }, []);

  const { bookings = [], rooms = [] } = data || {};
  const active = bookings.filter(isActiveBooking);
  const arrivals = active.filter((booking) => booking.checkIn === today)
    .sort((a, b) => arrivalFlags(b.notes || "").length - arrivalFlags(a.notes || "").length);
  const departures = active.filter((booking) => booking.checkOut === today);
  const inHouse = active.filter((booking) => booking.checkIn < today && booking.checkOut > today);
  const staysToday = [...arrivals, ...inHouse];
  const occupied = new Set(staysToday.map((booking) => booking.room));
  const sellableRooms = rooms.filter((room) => room.status !== "maintenance");
  const occupiedRooms = sellableRooms.filter((room) => occupied.has(room.name)).length;
  const conflicts = staysToday.filter((booking) => !rooms.some((room) => room.name === booking.room) ||
    staysToday.some((other) => other.id !== booking.id && other.room === booking.room && overlapsStay(other, booking.checkIn, booking.checkOut)));
  const due = arrivals.reduce((sum, booking) => sum + balanceDue(booking), 0);
  const readiness = rooms.filter((room) => ["dirty", "in-progress"].includes(room.status));
  const monthlyBookingValue = active.filter((booking) => booking.checkIn?.slice(0, 7) === today.slice(0, 7))
    .reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);
  const bookingValueByYear = new Map();
  for (const booking of active) {
    const year = booking.checkIn?.slice(0, 4);
    if (year) bookingValueByYear.set(year, (bookingValueByYear.get(year) || 0) + Number(booking.totalAmount || 0));
  }
  const yearlyTotals = Array.from(bookingValueByYear).sort(([first], [second]) => second.localeCompare(first));

  async function markNoShow() {
    if (pending || !noShow) return;
    setPending(true);
    setActionError("");
    try {
      const { data: saved } = await axios.patch(API + "/bookings/" + noShow.id + "/no-show");
      if (saved.status !== "no-show" || saved.id !== noShow.id) throw new Error("No-show not confirmed");
      setData((current) => ({ ...current, bookings: current.bookings.map((booking) => booking.id === saved.id ? saved : booking) }));
      setNotice(noShow.guestName + " was marked as a no-show. The booking is in reservation history.");
      setNoShow(null);
    } catch (error) {
      setActionError(errorMessage(error, "Could not mark this booking as a no-show. Try again."));
    } finally {
      setPending(false);
    }
  }

  function goTo(id) {
    document.getElementById(id)?.scrollIntoView({ block: "start" });
    document.getElementById(id)?.querySelector("a, button")?.focus({ preventScroll: true });
  }

  return (
    <div className="workspace">
      <header className="workspace-heading">
        <div><h1>Dashboard</h1><p className="mt-1">{new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "Europe/Athens" }).format(new Date())}</p></div>
        <Link className="workspace-button workspace-primary" to="/bookings?new=1"><Plus size={17} /> New booking</Link>
      </header>
      {notice && <p className="workspace-badge workspace-badge-ready justify-self-start" role="status">{notice}</p>}
      {(!data || resource.loading || resource.error) && <DataFeedback {...resource} />}
      {data && <>
        <div className="dashboard-metrics">
          <button className="workspace-panel dashboard-metric" onClick={() => goTo("today-arrivals")}><LogIn size={18} /><span>Arrivals</span><strong>{arrivals.length}</strong></button>
          <button className="workspace-panel dashboard-metric" onClick={() => goTo("today-departures")}><LogOut size={18} /><span>Departures</span><strong>{departures.length}</strong></button>
          <button className="workspace-panel dashboard-metric" onClick={() => goTo("today-in-house")}><BedDouble size={18} /><span>In-house stays</span><strong>{inHouse.length}</strong></button>
          <Link to="/housekeeping" className="workspace-panel dashboard-metric"><ClipboardList size={18} /><span>Rooms to clean</span><strong>{readiness.length}</strong></Link>
          <button className="workspace-panel dashboard-metric" onClick={() => goTo("today-arrivals")}><Wallet size={18} /><span>Due from arrivals</span><strong>{formatMoney(due)}</strong></button>
        </div>
        {conflicts.length > 0 && <section className="workspace-panel dashboard-conflicts">
          <header className="workspace-panel-header"><h2 className="flex items-center gap-2"><AlertTriangle size={19} /> Room assignments to review</h2><span className="workspace-badge workspace-badge-warn">{conflicts.length} bookings</span></header>
          {conflicts.map((booking) => <div className="workspace-row" key={booking.id}><Link className="font-semibold underline" to={bookingLink(booking)}>{booking.guestName}</Link><span className="workspace-muted">Room {booking.room || "unassigned"} · {booking.checkIn} – {booking.checkOut}</span></div>)}
        </section>}
        <div className="dashboard-stays">
          <StayList id="today-arrivals" title="Arrivals today" icon={LogIn} bookings={arrivals} onNoShow={resource.error || resource.loading ? null : (booking) => { setActionError(""); setNoShow(booking); }} />
          <StayList id="today-departures" title="Departures today" icon={LogOut} bookings={departures} />
        </div>
        <StayList id="today-in-house" title="In-house stays" icon={BedDouble} bookings={inHouse} />
        <section className="workspace-panel" aria-labelledby="yearly-booking-value">
          <header className="workspace-panel-header">
            <h2 id="yearly-booking-value">Booking value by year</h2>
            <p className="workspace-muted">Active bookings by check-in year</p>
          </header>
          {yearlyTotals.length ? (
            <dl className="dashboard-year-totals">
              {yearlyTotals.map(([year, total]) => (
                <div className="dashboard-year-total" key={year}>
                  <dt>{year}</dt>
                  <dd>{formatMoney(total)}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="workspace-empty">No active bookings to total.</p>}
        </section>
        <div className="workspace-grid">
          <section className="workspace-panel workspace-panel-body space-y-2">
            <h2>Rooms tonight</h2>
            {sellableRooms.length ? <>
              <p className="text-2xl font-semibold">{occupiedRooms} / {sellableRooms.length} reserved</p>
              <p className="workspace-muted">{sellableRooms.length - occupiedRooms} available · {Math.round(occupiedRooms / sellableRooms.length * 100)}% booked</p>
            </> : <p className="workspace-muted">No sellable rooms are configured.</p>}
            <Link className="workspace-button" to="/housekeeping">Room readiness</Link>
          </section>
          <section className="workspace-panel workspace-panel-body space-y-2">
            <h2>Booking value</h2>
            <p className="text-2xl font-semibold">{formatMoney(monthlyBookingValue)}</p>
            <p className="workspace-muted">Stays arriving this month</p>
            <details><summary className="cursor-pointer text-sm font-semibold">Payment totals</summary>
              <div className="space-y-1 mt-2 text-sm">
                <p>Deposits recorded · {formatMoney(bookings.reduce((sum, booking) => sum + Number(booking.deposit || 0), 0))}</p>
                <p>Fully paid stays · {formatMoney(bookings.filter((booking) => booking.paid).reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0))}</p>
              </div>
            </details>
          </section>
        </div>
        {!resource.loading && !resource.error && <DataFeedback {...resource} />}
      </>}
      {noShow && <WorkspaceDialog title="Mark no-show" onClose={() => { if (!pending) setNoShow(null); }}>
        <div className="workspace-dialog-body space-y-3">
          <p>Mark <strong>{noShow.guestName}</strong> as a no-show? Room {noShow.room} will be available again for the affected dates. The reservation stays in booking history.</p>
          {actionError && <p className="workspace-alert" role="alert">{actionError}</p>}
        </div>
        <div className="workspace-dialog-footer"><button className="workspace-button" disabled={pending} onClick={() => setNoShow(null)}>Cancel</button><button className="workspace-button workspace-primary" disabled={pending} onClick={markNoShow}>{pending ? "Saving…" : "Mark no-show"}</button></div>
      </WorkspaceDialog>}
    </div>
  );
}
