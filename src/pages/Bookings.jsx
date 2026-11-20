import "../styles/booking-workspace.css";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { addDays, addMonths, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, List, Maximize2, Minimize2, Plus, Search } from "lucide-react";
import { DataFeedback, useWorkspaceData, WorkspaceDialog } from "../components/Workspace";
import BookingAvailability from "../components/BookingAvailability";
import BookingCalendar from "../components/BookingCalendar";
import BookingEditor from "../components/BookingEditor";
import loadStays from "../utils/loadStays";
import { API, balanceDue, errorMessage, formatMoney, isActiveBooking, overlapsStay, todayAtHotel } from "../utils/operations";

const URL = API + "/bookings";
const toDate = (date) => format(date, "yyyy-MM-dd");
const humanDate = (date) => format(parseISO(date), "d MMM yyyy");
const months = Array.from({ length: 12 }, (_, month) => {
  const date = new Date(2000, month, 1);
  return { short: format(date, "MMM"), full: format(date, "MMMM") };
});

function BookingTimeline({ date, years, counts, onSelectYear, onSelectMonth }) {
  const year = date.getFullYear();
  const peak = Math.max(0, ...(counts ?? []));

  return (
    <div className="booking-timeline">
      <div className="booking-timeline-heading">
        <div className="booking-years" role="group" aria-label="Booking year">
          {years.map((option) => (
            <button
              key={option}
              type="button"
              className="workspace-button booking-year"
              aria-pressed={option === year}
              onClick={() => onSelectYear(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="booking-timeline-key">
          <span className="workspace-muted booking-timeline-label">Bookings by check-in month</span>
          {peak > 0 && (
            <span className="booking-heat-legend" role="img" aria-label={"Booking heatmap for " + year + ", 0 to " + peak + " bookings per month"}>
              <span aria-hidden="true">0</span>
              <span className="booking-heat-ramp" aria-hidden="true" />
              <span aria-hidden="true">{peak}</span>
            </span>
          )}
        </div>
      </div>
      <div className="booking-months" role="group" aria-label={year + " booking months"}>
        {months.map(({ short, full }, month) => {
          const count = counts?.[month] ?? 0;
          const heat = count > 0 ? Math.round(18 + 82 * (count / peak)) : 0;
          const label = full + " " + year + ", " + count + (count === 1 ? " booking" : " bookings");
          return (
            <button
              key={full}
              type="button"
              className="booking-month"
              aria-pressed={month === date.getMonth()}
              aria-label={label}
              title={label}
              style={{ "--booking-month-heat": heat + "%" }}
              onClick={() => onSelectMonth(month)}
            >
              <span>{short}</span>
              <span className="booking-month-count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function useMobileAgenda() {
  const query = "(max-width: 740px)";
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const change = () => setMobile(media.matches);
    media.addEventListener("change", change);
    change();
    return () => media.removeEventListener("change", change);
  }, []);
  return mobile;
}

function BookingList({ bookings, onOpen, searching }) {
  if (!bookings.length) return <p className="workspace-empty">{searching ? "No bookings match your search." : "No bookings for this period."}</p>;

  return <div>
    {bookings.map((booking) => (
      <button key={booking.id} type="button" className="workspace-row booking-list-row" onClick={() => onOpen(booking)}>
        <span><strong>{booking.guestName}</strong><span className="workspace-muted block">Room {booking.room} · {booking.channel || "Direct"}</span></span>
        <span className="workspace-muted">{humanDate(booking.checkIn)} – {humanDate(booking.checkOut)}</span>
        {!isActiveBooking(booking) ? <span className="workspace-badge workspace-badge-warn">{booking.status === "no-show" ? "No-show" : "Inactive"}</span> :
          <span className={"workspace-badge" + (booking.paid ? " workspace-badge-ready" : "")}>{booking.paid ? "Paid" : formatMoney(balanceDue(booking)) + " due"}</span>}
      </button>
    ))}
  </div>;
}

function MatchingBookingRecords({ records, onOpen, onClose }) {
  const [first] = records;
  return (
    <WorkspaceDialog title="Matching booking records" wide onClose={onClose}>
      <div className="workspace-dialog-body space-y-3">
        <div>
          <p className="font-semibold">{first.guestName} · Room {first.room}</p>
          <p className="workspace-muted">{humanDate(first.checkIn)} – {humanDate(first.checkOut)}</p>
        </div>
        <p className="workspace-muted">These records have the same guest, room and stay dates. Open each record to compare its details.</p>
        <div className="workspace-panel">
          {records.map((record) => {
            const created = new Date(record.createdAt);
            return (
              <div className="workspace-row" key={record.id}>
                <div className="space-y-1">
                  <p className="font-semibold">Record {String(record.id).slice(-8)} · {record.channel || "Direct"}</p>
                  <p className="workspace-muted">Total {formatMoney(record.totalAmount)} · Deposit {formatMoney(record.deposit)}{record.paid && " · Paid in full"}</p>
                  {record.createdAt && !Number.isNaN(created.getTime()) && (
                    <p className="workspace-muted">Created {created.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "medium", timeZone: "Europe/Athens" })}</p>
                  )}
                </div>
                <button className="workspace-button" onClick={() => onOpen(record)}>Open record {String(record.id).slice(-8)}</button>
              </div>
            );
          })}
        </div>
      </div>
    </WorkspaceDialog>
  );
}

export default function Bookings() {
  const [params, setParams] = useSearchParams();
  const bookingId = params.get("booking");
  const wantsNew = params.get("new") === "1";
  const [date, setDate] = useState(() => parseISO(todayAtHotel()));
  const [todayJump, setTodayJump] = useState(0);
  const [scale, setScale] = useState("month");
  const [view, setView] = useState("calendar");
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState(false);
  const [formSeed, setFormSeed] = useState(null);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [matchingRecords, setMatchingRecords] = useState(null);
  const [move, setMove] = useState(null);
  const [moving, setMoving] = useState(false);
  const [movementError, setMovementError] = useState("");
  const [notice, setNotice] = useState("");

  const mobile = useMobileAgenda();
  const resource = useWorkspaceData(loadStays);
  const { data, setData } = resource;
  const bookings = data?.bookings;
  const active = useMemo(() => (bookings || []).filter(isActiveBooking), [bookings]);
  const timelineBookings = history ? bookings : active;
  const monthlyCounts = useMemo(() => {
    const counts = new Map();
    for (const booking of timelineBookings || []) {
      const checkIn = parseISO(booking.checkIn?.slice(0, 10) || "");
      if (!Number.isFinite(checkIn.getTime())) continue;
      const year = checkIn.getFullYear();
      if (!counts.has(year)) counts.set(year, Array(12).fill(0));
      counts.get(year)[checkIn.getMonth()] += 1;
    }
    return counts;
  }, [timelineBookings]);
  const start = scale === "week" ? startOfWeek(date, { weekStartsOn: 1 }) : startOfMonth(date);
  const end = scale === "week" ? addDays(start, 7) : addMonths(start, 1);
  const searching = search.trim().toLowerCase();
  const listView = mobile || view === "list" || Boolean(searching) || history;
  const visible = (searching || history ? bookings || [] : active)
    .filter((booking) => searching ?
      [booking.guestName, booking.room, booking.channel, booking.notes, booking.checkIn, booking.checkOut, booking.id, booking.status]
        .some((value) => String(value ?? "").toLowerCase().includes(searching)) :
      overlapsStay(booking, toDate(start), toDate(end)))
    .sort((a, b) => String(a.checkIn).localeCompare(String(b.checkIn)));
  const editing = bookings?.find((booking) => String(booking.id) === bookingId);
  const currentYear = parseISO(todayAtHotel()).getFullYear();
  const years = [...new Set([
    ...Array.from({ length: 5 }, (_, index) => currentYear - 1 + index),
    date.getFullYear(),
    ...(bookings || []).map((booking) => Number(booking.checkIn?.slice(0, 4))).filter((year) => year >= 1900),
  ])].sort((a, b) => a - b);
  const unavailable = !data || resource.loading || Boolean(resource.error);
  const periodLabel = scale === "week"
    ? humanDate(toDate(start)) + " – " + humanDate(toDate(addDays(end, -1)))
    : format(date, "MMMM yyyy");

  function closeEditor() {
    setParams({}, { replace: true });
    setFormSeed(null);
  }

  function newBooking(seed = {}) {
    setFormSeed(seed);
    setAvailabilityOpen(false);
    setParams({ new: "1" });
  }

  function saveBooking(saved, message, close = true) {
    setData((current) => ({
      ...current,
      bookings: current.bookings.some((booking) => booking.id === saved.id)
        ? current.bookings.map((booking) => booking.id === saved.id ? saved : booking)
        : [...current.bookings, saved],
    }));
    if (close) closeEditor();
    setDate(parseISO(saved.checkIn));
    setNotice(message);
  }

  function deleteBooking(id) {
    setData((current) => ({ ...current, bookings: current.bookings.filter((booking) => booking.id !== id) }));
    closeEditor();
    setNotice("Booking deleted.");
  }

  async function confirmMove() {
    if (moving) return;
    setMoving(true);
    setMovementError("");
    try {
      const { data: saved } = await axios.put(URL + "/" + move.booking.id, {
        room: move.room, checkIn: move.checkIn, checkOut: move.checkOut,
      });
      saveBooking(saved, "Booking moved.", false);
      setMove(null);
    } catch (error) {
      setMovementError(errorMessage(error, "The booking could not be moved. Try again."));
    } finally {
      setMoving(false);
    }
  }

  function shiftPeriod(amount) {
    setDate((current) => scale === "week" ? addDays(current, 7 * amount) : addMonths(startOfMonth(current), amount));
  }

  function selectMonth(year, month) {
    setDate(new Date(year, month, 1));
    setScale("month");
    setSearch("");
  }

  return (
    <div className={"workspace bookings-workspace" + (expanded ? " bookings-workspace-expanded" : "")}>
      <header className="workspace-heading">
        <h1>Bookings</h1>
        <div className="workspace-actions">
          <button type="button" className="workspace-button" disabled={unavailable} onClick={() => setAvailabilityOpen(true)}>Check availability</button>
          <button type="button" className="workspace-button workspace-primary" disabled={unavailable} onClick={() => newBooking()}><Plus size={17} /> New booking</button>
        </div>
      </header>
      {notice && <p className="workspace-badge workspace-badge-ready justify-self-start" role="status">{notice}</p>}
      {(!data || resource.error || resource.loading) && <DataFeedback {...resource} />}
      {bookingId && data && !editing && <p className="workspace-alert" role="alert">This booking could not be found. <button className="workspace-button" onClick={closeEditor}>Back to bookings</button></p>}

      {data && (
        <section className="workspace-panel">
          <div className="workspace-toolbar booking-toolbar">
            <label className="booking-search"><Search size={17} aria-hidden="true" />
              <input className="workspace-input" aria-label="Search all bookings" placeholder="Search all bookings" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <div className="workspace-actions">
              <button className="workspace-button" onClick={() => { setDate(parseISO(todayAtHotel())); setTodayJump((current) => current + 1); setSearch(""); }}>Today</button>
              <select className="workspace-input" aria-label="Calendar range" value={scale} onChange={(event) => setScale(event.target.value)}><option value="month">Month</option><option value="week">Week</option></select>
              {!mobile && <>
                <button className="workspace-icon" title="Calendar view" aria-label="Calendar view" aria-pressed={!listView} onClick={() => { setView("calendar"); setHistory(false); setSearch(""); }}><CalendarDays size={18} /></button>
                <button className="workspace-icon" title="List view" aria-label="List view" aria-pressed={listView} onClick={() => setView("list")}><List size={18} /></button>
                {(!listView || expanded) && (
                  <button type="button" className="workspace-icon booking-expand" title={expanded ? "Restore sidebar" : "Expand calendar"} aria-label={expanded ? "Restore sidebar" : "Expand calendar"} onClick={() => setExpanded((current) => !current)}>
                    {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                )}
              </>}
            </div>
          </div>
          <BookingTimeline
            date={date}
            years={years}
            counts={monthlyCounts.get(date.getFullYear())}
            onSelectYear={(year) => selectMonth(year, date.getMonth())}
            onSelectMonth={(month) => selectMonth(date.getFullYear(), month)}
          />
          <div className="workspace-panel-header booking-period">
            {searching ? <h2>{visible.length} matching bookings</h2> : (
              <div className="booking-period-navigation" role="group" aria-label="Calendar navigation">
                <button className="workspace-icon" aria-label={"Previous " + scale} title={"Previous " + scale} onClick={() => shiftPeriod(-1)}><ChevronLeft size={20} /></button>
                <h2 aria-live="polite">{periodLabel}</h2>
                <button className="workspace-icon" aria-label={"Next " + scale} title={"Next " + scale} onClick={() => shiftPeriod(1)}><ChevronRight size={20} /></button>
              </div>
            )}
            {!searching && <label className="workspace-muted flex items-center gap-2"><input type="checkbox" checked={history} onChange={(event) => setHistory(event.target.checked)} /> Include no-shows</label>}
          </div>
          {listView ? <BookingList bookings={visible} onOpen={(booking) => setParams({ booking: booking.id })} searching={searching} /> :
            data.rooms.length ? <BookingCalendar start={start} end={end} focusDate={toDate(date)} todayJump={todayJump} rooms={data.rooms} bookings={visible} onOpen={(booking) => setParams({ booking: booking.id })}
              onReviewMatching={setMatchingRecords}
              onCreate={(seed) => { if (!unavailable) newBooking(seed); }}
              onMove={(proposed) => { if (!unavailable) { setMovementError(""); setMove(proposed); } }} /> :
              <p className="workspace-empty">No rooms have been set up. <Link className="underline" to="/rooms">Add a room</Link></p>}
        </section>
      )}
      {data && !resource.loading && !resource.error && <DataFeedback {...resource} />}
      {matchingRecords && <MatchingBookingRecords records={matchingRecords} onClose={() => setMatchingRecords(null)} onOpen={(record) => {
        setMatchingRecords(null);
        setParams({ booking: record.id });
      }} />}
      {availabilityOpen && data && <BookingAvailability rooms={data.rooms} bookings={active} onClose={() => setAvailabilityOpen(false)} onSelect={newBooking} />}
      {data && (editing || wantsNew) && <BookingEditor key={editing?.id || "new"} booking={editing} seed={formSeed} rooms={data.rooms} bookings={active}
        onClose={closeEditor} onSave={saveBooking} onDelete={deleteBooking} readOnly={unavailable} />}
      {move && <WorkspaceDialog title="Review booking move" onClose={() => { if (!moving) setMove(null); }}>
        <div className="workspace-dialog-body space-y-2">
          <p className="font-semibold">{move.booking.guestName}</p>
          <p className="workspace-muted">Current · Room {move.booking.room}, {humanDate(move.booking.checkIn)} – {humanDate(move.booking.checkOut)}</p>
          <p>Proposed · Room {move.room}, {humanDate(move.checkIn)} – {humanDate(move.checkOut)}</p>
          {movementError && <p className="workspace-alert" role="alert">{movementError}</p>}
        </div>
        <div className="workspace-dialog-footer"><button className="workspace-button" disabled={moving} onClick={() => setMove(null)}>Cancel</button><button className="workspace-button workspace-primary" disabled={moving} onClick={confirmMove}>{moving ? "Moving…" : "Confirm move"}</button></div>
      </WorkspaceDialog>}
    </div>
  );
}
