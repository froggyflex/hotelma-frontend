import { useLayoutEffect, useRef } from "react";
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, parseISO } from "date-fns";
import { overlapsStay, todayAtHotel } from "../utils/operations";

const dateKey = (date) => format(date, "yyyy-MM-dd");

export default function BookingCalendar({ start, end, focusDate, todayJump, rooms, bookings, onOpen, onCreate, onMove }) {
  const today = todayAtHotel();
  const drag = useRef(null);
  const scroller = useRef(null);
  const days = eachDayOfInterval({ start, end: addDays(end, -1) });
  const startKey = dateKey(start);
  const endKey = dateKey(end);

  useLayoutEffect(() => {
    const container = scroller.current;
    const header = container.querySelector('[data-date="' + focusDate + '"]');
    if (!header) return;
    const roomColumn = container.querySelector(".booking-calendar-corner").offsetWidth;
    container.scrollLeft = Math.max(0, header.offsetLeft - roomColumn - header.offsetWidth * 4);
  }, [startKey, endKey, focusDate, todayJump]);

  function dropOn(event, room, day) {
    event.preventDefault();
    const booking = drag.current;
    drag.current = null;
    if (!booking || !day || room.status === "maintenance") return;

    const checkIn = dateKey(day);
    if (booking.room === room.name && booking.checkIn === checkIn) return;
    const nights = differenceInCalendarDays(parseISO(booking.checkOut), parseISO(booking.checkIn));
    onMove({ booking, room: room.name, checkIn, checkOut: dateKey(addDays(day, nights)) });
  }

  return (
    <div ref={scroller} className="booking-calendar" role="region" aria-label="Room calendar" tabIndex={0}>
      <div className="booking-calendar-grid" style={{ "--booking-days": days.length }}>
        <div className="booking-calendar-corner">Rooms</div>
        {days.map((day) => (
          <div key={dateKey(day)} data-date={dateKey(day)} className={"booking-calendar-day" + (dateKey(day) === today ? " booking-calendar-today" : "")}>
            <span>{format(day, "EEE")}</span><strong>{format(day, "d")}</strong>
          </div>
        ))}
        {rooms.map((room) => {
          const roomBookings = bookings.filter((booking) => booking.room === room.name);
          const laneEnds = [];
          const bars = roomBookings.map((booking) => {
            const first = Math.max(0, differenceInCalendarDays(parseISO(booking.checkIn), start));
            const last = Math.min(days.length, differenceInCalendarDays(parseISO(booking.checkOut), start));
            const freeLane = laneEnds.findIndex((laneEnd) => laneEnd <= first);
            const lane = freeLane < 0 ? laneEnds.length : freeLane;
            laneEnds[lane] = last;
            const conflict = roomBookings.some((other) => other.id !== booking.id && overlapsStay(other, booking.checkIn, booking.checkOut));
            return { booking, first, last, lane, conflict };
          });

          return (
            <div key={room.id} className="booking-calendar-room-row" style={{ minHeight: Math.max(1, laneEnds.length) * 39 + 10 }}>
              <div className="booking-calendar-room"><strong>{room.name}</strong><small>{room.status === "maintenance" ? "Maintenance" : room.type}</small></div>
              {days.map((day) => {
                const key = dateKey(day);
                const reserved = roomBookings.some((booking) => booking.checkIn <= key && key < booking.checkOut);
                return <div key={key}
                  className={"booking-calendar-cell" + ([0, 6].includes(day.getDay()) ? " booking-calendar-weekend" : "") + (key === today ? " booking-calendar-today" : "")}
                  onDragOver={(event) => { if (drag.current && room.status !== "maintenance") event.preventDefault(); }}
                  onDrop={(event) => dropOn(event, room, day)}
                >
                  {!reserved && room.status !== "maintenance" && <button type="button" tabIndex={-1}
                    aria-label={"New booking in room " + room.name + " on " + key}
                    onClick={() => onCreate({ room: room.name, checkIn: key, checkOut: dateKey(addDays(day, 1)) })} />}
                </div>;
              })}
              <div className="booking-calendar-bars">
                {bars.map(({ booking, first, last, lane, conflict }) => (
                  <button key={booking.id} type="button" draggable
                    onDragStart={(event) => {
                      drag.current = booking;
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(booking.id));
                    }}
                    onDragEnd={() => { drag.current = null; }}
                    onClick={() => onOpen(booking)}
                    title={booking.guestName + " · " + booking.checkIn + " – " + booking.checkOut}
                    className={"booking-calendar-bar" + (conflict ? " booking-calendar-conflict" : "")}
                    onDragOver={(event) => { if (drag.current && room.status !== "maintenance") event.preventDefault(); }}
                    onDrop={(event) => {
                      const target = event.currentTarget;
                      const offset = Math.floor((event.clientX - target.getBoundingClientRect().left) / target.offsetWidth * (last - first));
                      const day = days[first + Math.max(0, Math.min(offset, last - first - 1))];
                      dropOn(event, room, day);
                    }}
                    style={{ gridColumn: (first + 1) + " / " + (last + 1), gridRow: lane + 1 }}>
                    {conflict && <span aria-label="Booking conflict">! </span>}
                    {booking.checkIn < startKey && "‹ "}{booking.guestName}{booking.checkOut > endKey && " ›"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

