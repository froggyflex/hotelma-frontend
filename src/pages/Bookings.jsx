import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  add,
  eachDayOfInterval,
  format,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  endOfMonth,
  isBefore,
  addDays,
  addMonths,
  isAfter,
  differenceInDays,

  differenceInCalendarDays,   // ⬅️ add this
} from "date-fns";

import {
  DndContext,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay
} from "@dnd-kit/core";

import {
  restrictToParentElement,
  restrictToWindowEdges,
} from "@dnd-kit/modifiers";
 import { CSS } from "@dnd-kit/utilities";

 
const API = import.meta.env.VITE_API_URL;
const URL = `${API}/bookings`;
const URLR = `${API}/rooms`;


function DraggableBooking({
  booking,
  roomIndex,
  children
}) {
  const {
    setNodeRef,
    listeners,
    attributes,
    transform
  } = useDraggable({
    id: booking.id,
    data: { booking, roomIndex }
  });

  return children({
    setNodeRef,
    listeners,
    attributes,
    transform
  });
}
 
 /* ------------------ WEEKLY CALENDAR ------------------ */

const ROOM_LABEL_WIDTH = 80;
const ROW_HEIGHT = 58;

function WeeklyCalendar({
  rooms,
  bookings,
  weekStart,
  weekEnd,
  onPrevWeek,
  onNextWeek,
  onToday,
  onEditBooking,
  onMoveBooking
}) {
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const containerRef = useRef(null);
  const [dayWidth, setDayWidth] = useState(140);

  useEffect(() => {
  if (!containerRef.current) return;

  const resize = () => {
    const total = containerRef.current.offsetWidth;
    const available = total - ROOM_LABEL_WIDTH;
    setDayWidth(Math.max(80, available / 7)); // min size 80px
  };

  resize(); // initial measure

  const observer = new ResizeObserver(resize);
  observer.observe(containerRef.current);

  return () => observer.disconnect();
}, []);

  /* Sensors */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } })
  );

  /* Drag state */
  const [activeBooking, setActiveBooking] = useState(null);
  const [activeData, setActiveData] = useState(null);

  /* Helpers */
  function getStartIndex(booking, weekStart, weekEnd) {
    const rawStart = new Date(booking.checkIn);
    const rawEnd   = new Date(booking.checkOut);

    // Inclusive end → convert
    const inclusiveEnd = addDays(rawEnd, -1);

    // No overlap → tell renderer to skip
    if (inclusiveEnd < weekStart || rawStart > weekEnd) return null;

    // Clip start
    const visibleStart = rawStart < weekStart ? weekStart : rawStart;

    return differenceInCalendarDays(visibleStart, weekStart);
  }


  function getSpan(booking, weekStart, weekEnd) {

    const rawStart = new Date(booking.checkIn);
    const rawEnd   = new Date(booking.checkOut);

    const inclusiveEnd = addDays(rawEnd, -1);

    const visibleStart = rawStart < weekStart ? weekStart : rawStart;
    const visibleEnd   = inclusiveEnd > weekEnd ? weekEnd : inclusiveEnd;

    const startIdx = differenceInCalendarDays(visibleStart, weekStart);
    const endIdx   = differenceInCalendarDays(visibleEnd,   weekStart);

    return differenceInCalendarDays(visibleEnd, visibleStart) + 1;

  }


  const isOverlap = (booking, roomName) => {
    const start = parseISO(booking.checkIn);
    const end = add(parseISO(booking.checkOut), { days: -1 });

    return bookings.some((other) => {
      if (other.id === booking.id) return false;
      if (other.room !== roomName) return false;

      const oStart = parseISO(other.checkIn);
      const oEnd = add(parseISO(other.checkOut), { days: -1 });

      return (
        isWithinInterval(start, { start: oStart, end: oEnd }) ||
        isWithinInterval(end, { start: oStart, end: oEnd }) ||
        isWithinInterval(oStart, { start, end }) ||
        isWithinInterval(oEnd, { start, end })
      );
    });
  };

  /* ------------------ DRAG START ------------------ */
  const handleDragStart = (event) => {
    const booking = bookings.find((b) => b.id === event.active.id);
    if (!booking) return;

    setActiveBooking(booking);
    setActiveData(event.active.data.current);
  };

  /* ------------------ DRAG END ------------------ */
  const handleDragEnd = (event) => {
    const { delta } = event;
    if (!activeBooking) return;

    const booking = activeBooking;
    const sourceRoomIndex = activeData.roomIndex;

    const dayShift = Math.round(delta.x / dayWidth );
    const roomShift = Math.round(delta.y / ROW_HEIGHT);

    const newRoomIndex = Math.max(
      0,
      Math.min(sourceRoomIndex + roomShift, rooms.length - 1)
    );

    const newRoom = rooms[newRoomIndex];

    const newCheckIn = add(parseISO(booking.checkIn), { days: dayShift });
    const duration = differenceInCalendarDays(
      parseISO(booking.checkOut),
      parseISO(booking.checkIn)
    );

    const newCheckOut = add(newCheckIn, { days: duration });

    onMoveBooking({
      ...booking,
      room: newRoom.name,
      checkIn: format(newCheckIn, "yyyy-MM-dd"),
      checkOut: format(newCheckOut, "yyyy-MM-dd")
    });

    setActiveBooking(null);
    setActiveData(null);
  };

  /* ------------------ RENDER ------------------ */
  return (
    <div ref={containerRef} className="space-y-6 select-none bg-slate-50 p-4 rounded-xl shadow-inner">

      {/* Navigation */}
      <div className="flex justify-between items-center mb-2">
        <button onClick={onPrevWeek} className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded">
          ◀
        </button>

        <div className="font-semibold text-lg">
          {format(weekStart, "d MMM")} — {format(weekEnd, "d MMM yyyy")}
        </div>

        <button onClick={onNextWeek} className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded">
          ▶
        </button>
      </div>

      {/* Today Button */}
      <div className="flex justify-center">
        <button
          onClick={onToday}
          className="px-3 py-1 bg-blue-200 hover:bg-blue-300 rounded"
        >
          Today
        </button>
      </div>

      {/* Week header */}
      <div className="flex ml-[140px]">
        {weekDays.map((day, idx) => (
          <div
            key={idx}
            className="text-center font-semibold border-r bg-white py-1 shadow-sm"
            style={{ width: dayWidth }}
          >
            {format(day, "EEE dd")}
          </div>
        ))}
      </div>

      {/* Grid + Draggables */}
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToWindowEdges]}
      >
        {rooms.map((room, roomIndex) => {
          const roomBookings = bookings.filter((b) => b.room === room.name);

          return (
            <div key={room.id} className="relative h-[58px]">

              {/* Room label */}
              <div
                className="absolute left-0 top-0 h-full flex items-center justify-center
                           bg-slate-200 border-r font-medium text-slate-700 shadow-inner"
                style={{ width: 140 }}
              >
                {room.name}
              </div>

              {/* Day grid */}
              <div className="flex ml-[140px]">
                {weekDays.map((_, i) => (
                  <div
                    key={i}
                    className="border-r h-[58px] bg-white"
                    style={{ width: dayWidth }}
                  />
                ))}
              </div>

              {/* Booking layer */}
              <div className="absolute top-0 left-[140px] w-full h-full">
                {roomBookings.map((booking) => {
                  const startIdx = getStartIndex(booking, weekStart, weekEnd);


                  if (startIdx < 0 || startIdx >= 7) return null;

                  const span = getSpan(booking, weekStart, weekEnd);
                  const x = startIdx * dayWidth ;
                  const width = span * dayWidth - 6;

                  return (
                    <DraggableBooking
                      key={booking.id}
                      booking={booking}
                      roomIndex={roomIndex}
                    >
                      {({ setNodeRef, listeners, attributes, transform }) => (
                        <BookingCard
                          booking={booking}
                          x={x}
                          width={width}
                          roomIndex={roomIndex}
                          isOverbooked={isOverlap(booking, room.name)}
                          setNodeRef={setNodeRef}
                          listeners={listeners}
                          attributes={attributes}
                          transform={transform}
                          onClick={onEditBooking}
                        />
                      )}
                    </DraggableBooking>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Ghost */}
        <DragOverlay>
          {activeBooking ? (
            <div className="opacity-80">
              <BookingCard
                booking={activeBooking}
                x={0}
                width={dayWidth }
                fromOverlay={true}
                roomIndex={0}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
/*******************************
 * RESPONSIVE MONTHLY CALENDAR
 *******************************/
function MonthlyCalendar({
  monthDate,
  rooms,
  bookings,
  onPrevMonth,
  onNextMonth,
  onMoveBooking,
  onEditBooking

}) {
  const ROW_HEIGHT = 60;
  const ROOM_LABEL_WIDTH = 80;

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthEndExclusive = addDays(monthEnd, 1);

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Responsive day width
  const gridRef = useRef(null);
  const [dayWidth, setDayWidth] = useState(80); // fallback initial

  useEffect(() => {
    if (!gridRef.current) return;

    const ro = new ResizeObserver(() => {
      const fullWidth = gridRef.current.clientWidth - ROOM_LABEL_WIDTH;
      setDayWidth(fullWidth / days.length);
    });

    ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, [days.length]);

  const [dragging, setDragging] = useState(null);

  const getDayIndex = (date) => differenceInCalendarDays(date, monthStart);
  const getDateFromIndex = (index) => addDays(monthStart, index);

  const onDragStart = (e, booking) => {
    setDragging({ booking });
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e) => e.preventDefault();

  const onDrop = (e, room) => {
    if (!dragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    let index = Math.floor(x / dayWidth);
    if (index < 0) index = 0;
    if (index > days.length - 1) index = days.length - 1;

    const newCheckIn = getDateFromIndex(index);

    const oldCI = parseISO(dragging.booking.checkIn);
    const oldCO = parseISO(dragging.booking.checkOut);
    const duration = differenceInCalendarDays(oldCO, oldCI);

    const newCO = addDays(newCheckIn, duration);

    onMoveBooking({
      id: dragging.booking.id,
      room: room.name,
      checkIn: format(newCheckIn, "yyyy-MM-dd"),
      checkOut: format(newCO, "yyyy-MM-dd"),
    });

    setDragging(null);
  };

  // Build row-based booking positions
  const rows = rooms.map((room) => {
    // Filter only bookings overlapping with the visible month
    const list = bookings
      .filter(b => b.room === room.name)
      .filter(b => {
        const ci = parseISO(b.checkIn);
        const co = parseISO(b.checkOut);
        // overlap condition
        return !(co <= monthStart || ci >= monthEndExclusive);
      });

    return list.map((b, i) => {
      const rawCI = parseISO(b.checkIn);
      const rawCO = parseISO(b.checkOut);

      // Clip to visible month
      const visibleStart = rawCI < monthStart ? monthStart : rawCI;
      const visibleEnd = rawCO > monthEndExclusive ? monthEndExclusive : rawCO;

      let startIndex = getDayIndex(visibleStart);
      let endIndex = getDayIndex(visibleEnd) - 1; // check-out exclusive

      if (endIndex < startIndex) endIndex = startIndex;

      const span = endIndex - startIndex + 1;

      return {
        ...b,
        startIndex,
        width: span * dayWidth - 4,
        left: startIndex * dayWidth,
        continuedLeft: rawCI < monthStart,
        continuedRight: rawCO > monthEndExclusive,
        colorIndex: i % 2,
      };
    });
  });

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 px-1">
        <button
          onClick={onPrevMonth}
          className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
        >
          ◀ Prev
        </button>

        <h2 className="font-semibold text-lg">
          {format(monthDate, "MMMM yyyy")}
        </h2>

        <button
          onClick={onNextMonth}
          className="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
        >
          Next ▶
        </button>
      </div>

      {/* Grid wrapper (resize observed) */}
      <div
        ref={gridRef}
        className="border border-slate-300 rounded overflow-hidden w-full"
      >
        {/* Header days */}
        <div className="flex border-b bg-slate-100 text-center">
          <div
            style={{ width: ROOM_LABEL_WIDTH }}
            className="border-r p-2 font-medium"
          >
            Rooms
          </div>

          {days.map((d) => (
            <div
              key={d.toISOString()}
              style={{ width: dayWidth }}
              className="p-2 text-sm border-r"
            >
              {format(d, "d")}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rooms.map((room, rowIndex) => (
          <div key={room.id} className="flex border-b">
            {/* Room label */}
            <div
              style={{ width: ROOM_LABEL_WIDTH }}
              className="border-r p-2 font-medium"
            >
              {room.name}
            </div>

            {/* Row grid */}
            <div
              className="relative"
              style={{ height: ROW_HEIGHT, width: dayWidth * days.length }}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, room)}
              
            >
              {/* background grid */}
              <div className="absolute inset-0 flex h-full">
                {days.map((d) => (
                  <div
                    key={d.toISOString()}
                    style={{ width: dayWidth }}
                    className="border-r border-slate-200 h-full"
                  />
                ))}
              </div>

              {/* BOOKING CARDS */}
              {rows[rowIndex].map((b) => (
                <div
                  key={b.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, b)}
                  onClick={() => onEditBooking(b)}
                  className={`absolute top-1 h-[42px] rounded px-2 py-1 shadow flex items-center cursor-pointer ${
                    b.colorIndex === 0
                      ? "bg-blue-200 border border-blue-500"
                      : "bg-blue-300 border border-blue-600"
                  }`}
                  style={{
                    width: b.width,
                    left: b.left,
                  }}
                   
                >
                  {b.continuedLeft && (
                    <span className="mr-1 text-xs font-bold text-slate-700">
                      ◀
                    </span>
                  )}

                  <div className="flex-1">
                    <div className="font-semibold truncate">{b.guestName}</div>
                    <div className="text-xs opacity-80 truncate">
                      {b.channel} • €{b.price}/night
                    </div>
                  </div>

                  {b.continuedRight && (
                    <span className="ml-1 text-xs font-bold text-slate-700">
                      ▶
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

}
/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */
export default function Bookings() {


 

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [requestResults, setRequestResults] = useState(null);
  

  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  /* ------------------------- TABS -------------------------- */
  const [tab, setTab] = useState("month");

  /* ------------------------- DATA -------------------------- */
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);

  /* ------------------------ MODALS ------------------------- */
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  /* ------------------ AVAILABILITY CHECKER ----------------- */
  const [checkInReq, setCheckInReq] = useState("");
  const [checkOutReq, setCheckOutReq] = useState("");
  const [guestCountReq, setGuestCountReq] = useState(2);
  const [checkerResult, setCheckerResult] = useState(null);

  /* ---------------------- CALENDAR WEEK --------------------- */
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  
  const [activeBooking, setActiveBooking] = React.useState(null);

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart]
  );

 
function deleteBooking(id) {
  if (!window.confirm("Are you sure you want to delete this booking?")) return;

  setBookings((prev) => prev.filter((b) => b.id !== id));
  setEditingBooking(null); // close modal

}
    
    const bookingsByMonth = React.useMemo(() => {
      const map = {};

      bookings.forEach((b) => {
        const month = format(parseISO(b.checkIn), "MMMM yyyy");
        
        map[month] = (map[month] || 0) + 1;
      });

      return Object.entries(map); // [["November 2025", 12], ["December 2025", 8]...]
    }, [bookings]);


    const handleSearch = (text) => {
      setSearchTerm(text);

      if (!text.trim()) {
        setSearchResults([]);
        return;
      }

      const lower = text.toLowerCase();

      const results = bookings.filter((b) =>
        b.guestName.toLowerCase().includes(lower) ||
        b.room.toLowerCase().includes(lower) ||
        b.channel.toLowerCase().includes(lower) ||
        b.notes.toLowerCase().includes(lower) ||
        b.checkIn.includes(lower) ||
        b.checkOut.includes(lower) ||
        String(b.price).includes(lower)
      );

      setSearchResults(results);
    };
  /* ------------------------ LOAD DATA ------------------------ */
  useEffect(() => {
    axios.get(URL).then((res) => setBookings(res.data || []));
    fetch(URLR)
      .then((res) => res.json())
      .then((data) => setRooms(data || []));
  }, []);

  /* --------------------- DATE OVERLAP LOGIC ------------------ */
  const overlaps = (booking, day) => {
    const ci = parseISO(booking.checkIn);
    const co = parseISO(booking.checkOut);
    return isWithinInterval(day, { start: ci, end: add(co, { days: -1 }) });
  };

  /* --------------------- OCCUPANCY PER DAY ------------------- */
  const occupancy = useMemo(() => {
    return weekDays.map((day) => {
      const occupied = bookings.filter((b) => overlaps(b, day)).length;
      return { date: day, occupied, total: rooms.length };
    });
  }, [weekDays, bookings, rooms]);


  const handleMoveBooking = async (updated) => {
  await axios.put(`${API}/bookings/${updated.id}`, updated);
  // reload bookings
  const fresh = await axios.get(`${API}/bookings`);
  setBookings(fresh.data || []);
};

  /* -------------------------------------------------------
     BOOKING REQUEST CHECKER
  --------------------------------------------------------- */
    const roomIsFreeForBooking = (roomName, booking, allBookings) => {
    const start = parseISO(booking.checkIn);
    const end = add(parseISO(booking.checkOut), { days: -1 });

    return !allBookings.some(b => {
      if (b.room !== roomName || b.id === booking.id) return false;

      const bStart = parseISO(b.checkIn);
      const bEnd = add(parseISO(b.checkOut), { days: -1 });

      return (
        isWithinInterval(bStart, { start, end }) ||
        isWithinInterval(bEnd, { start, end }) ||
        isWithinInterval(start, { start: bStart, end: bEnd })
      );
    });
  };

  const findValidSwaps = (checkInReq, checkOutReq, rooms, bookings) => {
  const requestBooking = { checkIn: checkInReq, checkOut: checkOutReq };

  const swaps = [];

  for (const room of rooms) {
    const roomBookings = bookings.filter(b => b.room === room.name);

    // If room is already free for the requested dates → no need for a swap
    if (roomIsFreeForBooking(room.name, requestBooking, bookings))
      continue;

    // Try moving each booking out of this room
    for (const existingBooking of roomBookings) {
      const guestCount = existingBooking.adults + existingBooking.kids;

      for (const targetRoom of rooms) {
        if (targetRoom.name === room.name) continue;
        if (targetRoom.capacity < guestCount) continue;

        // Check if moved booking fits in target room
        if (
          roomIsFreeForBooking(
            targetRoom.name,
            existingBooking,
            bookings
          )
        ) {
          // Check if this frees up the original room
          const hypothetical = bookings
            .filter(b => b.id !== existingBooking.id)
            .concat({ ...existingBooking, room: targetRoom.name }); // moved booking

          if (roomIsFreeForBooking(room.name, requestBooking, hypothetical)) {
            swaps.push({
              moveBooking: existingBooking,
              from: room.name,
              to: targetRoom.name
            });
          }
        }
      }
    }
  }

  return swaps;
};

  const findFreeRoomsForRange = (checkIn, checkOut, rooms, bookings) => {
    const dummyBooking = { checkIn, checkOut };
    return rooms.filter(room =>
      roomIsFreeForBooking(room.name, dummyBooking, bookings)
    );
  };
  const checkAvailability = () => {
  if (!checkInReq || !checkOutReq) return;

  const start = parseISO(checkInReq);
  const end = parseISO(checkOutReq);
  const reqRange = eachDayOfInterval({ start, end: add(end, { days: -1 }) });

  // Rooms free without swap
  const freeRooms = rooms.filter((room) => {
    const roomBookings = bookings.filter((b) => b.room === room.name);

    return !roomBookings.some((b) => {
      const bStart = parseISO(b.checkIn);
      const bEnd = add(parseISO(b.checkOut), { days: -1 });

      return reqRange.some((day) =>
        isWithinInterval(day, { start: bStart, end: bEnd })
      );
    });
  }); 

  // Rooms possible WITH swap (capacity-based)
    const validSwaps = findValidSwaps(
      checkInReq,
      checkOutReq,
      rooms,
      bookings
    );

    setRequestResults({
      freeRooms,
      validSwaps
    });
};

  /* -------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    
      <div className="w-full px-4 py-4">
      <div className="max-w-6xl mx-auto space-y-4">
      <div className="">
        <input
          type="text"
          placeholder="Search bookings…"
          className="w-full p-2 border rounded shadow-sm focus:ring focus:ring-blue-200"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}                  
        />
        <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl shadow-md">
          <h3 className="font-semibold mb-2">📅 Monthly Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {bookingsByMonth.map(([month, count]) => (
              <div key={month} className="p-2 bg-slate-50 rounded border">
                <div className="font-medium">{month}</div>
                <div className="text-sm text-slate-600">{count} bookings</div>
              </div>
            ))}
          </div>
        </div>

        </div>    


        {/* Results Dropdown */}
        {searchResults.length > 0 && (

          
          <div style={{margin: '0 auto',width:'50%',top:'50'}} className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-64 overflow-y-auto z-50">
            {searchResults.map((b) => (
              <button
                key={b.id}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b"
                onClick={() => {
                  setSearchTerm("");
                  setSearchResults([]);
                  setEditingBooking(b);  // opens the edit modal
                }}
              >
                <div className="font-semibold">{b.guestName}</div>
                <div className="text-xs text-slate-500">
                  Room {b.room} • {b.checkIn} → {b.checkOut}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      

      {/* ---------------------- TABS ---------------------- */}
      <div className="flex space-x-3 border-b pb-2">
        <button
            onClick={() => {
            setTab("calendar");
            setActiveBooking(null);
          }}
          className={`pb-1 ${
            tab === "calendar"
              ? "border-b-2 border-blue-500 font-semibold"
              : "text-gray-500"
          }`}
        >
          Calendar View
        </button>

        {/* <button
            onClick={() => {
              setTab("list");
              setActiveBooking(null);    
            }}
          className={`pb-1 ${
            tab === "list"
              ? "border-b-2 border-blue-500 font-semibold"
              : "text-gray-500"
          }`}
        >
          List View
        </button> */}
      </div>
      {/* ------------------ CALENDAR VIEW ------------------ */}
      {tab === "calendar" && rooms.length > 0 && bookings.length > 0 && (
        <div className="space-y-4">

          {/* TOP-LEVEL SWITCH TO MONTH VIEW */}
          <br></br>
          <div className="flex justify-start">
            <button
              onClick={() => setTab("month")}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded"
            >
              📅 Month View
            </button>
          </div>

          {/* WEEKLY CALENDAR COMPONENT */}
          {/* <WeeklyCalendar
            rooms={rooms}
            bookings={bookings}
            weekStart={weekStart}
            weekEnd={weekEnd}
            onPrevWeek={() => setWeekStart(add(weekStart, { weeks: -1 }))}
            onNextWeek={() => setWeekStart(add(weekStart, { weeks: 1 }))}
            onToday={() =>
              setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
            }
            onEditBooking={(b) => setEditingBooking(b)}
            onMoveBooking={handleMoveBooking}
          /> */}

        </div>

        
      )}
      {/* ------------------ MONTH VIEW ------------------ */}
        {tab === "month" && (
          <div className="space-y-4">

            {/* Switch back to Week View */}
            <div className="flex justify-between items-center">
              {/* <button
                onClick={() => setTab("calendar")}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded"
              >
                📆 Week View
              </button> */}

            </div>
                        <br></br>
          <button
            className="mb-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setNewBookingOpen(true)}
          >
            + Add Booking
          </button>
            <MonthlyCalendar
              rooms={rooms}
              bookings={bookings}
              monthDate={monthDate}
              setMonthDate={setMonthDate}
              onMoveBooking={handleMoveBooking}
              onPrevMonth={() =>
                setMonthDate(
                  new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)
                )
              }
              
              onNextMonth={() =>
                setMonthDate(
                  new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
                )
              }
              onToday={() => setMonthDate(new Date())}
              onEditBooking={(b) => setEditingBooking(b)}
             
              windowStart={weekStart}
            />
          </div>
        )}

          <br></br>
          <div className="mt-6 p-4 bg-white border rounded shadow-sm">
          <h3 className="font-semibold mb-3">🔎 Booking Request Checker</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Check-in</label>
              <input
                type="date"
                className="w-full p-2 border rounded mt-1"
                value={checkInReq}
                onChange={(e) => setCheckInReq(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Check-out</label>
              <input
                type="date"
                className="w-full p-2 border rounded mt-1"
                value={checkOutReq}
                onChange={(e) => setCheckOutReq(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={checkAvailability}
                className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Check
              </button>
            </div>
          </div>
          </div>
          <br></br>

          {requestResults && (
            <div className="mt-4">
              <h4 className="font-semibold">Available Rooms</h4>

              {requestResults.freeRooms.length === 0 && (
                <div className="text-sm text-red-600">No rooms available</div>
              )}

              {requestResults.freeRooms.map((room) => (
                <div
                  key={room.id}
                  className="p-2 mt-1 bg-green-50 border border-green-300 rounded"
                >
                  Room {room.name} (capacity {room.capacity})
                </div>
              ))}

              {requestResults.freeRooms.length > 0 && <hr className="my-3" />}

              <h4 className="font-semibold">Possible Swaps</h4>

              {requestResults.validSwaps.length === 0 && (
                <div className="text-sm text-slate-500">No valid swaps available</div>
              )}

              {requestResults.validSwaps.map((s, i) => (
                <div
                  key={i}
                  className="p-2 mt-1 bg-yellow-50 border border-yellow-300 rounded text-sm"
                >
                  Move <b>{s.moveBooking.guestName} </b>  
                  from <b>Room {s.from} </b> to <b>Room {s.to} </b>  
                  to free a spot.
                </div>
              ))}
            </div>
          )}






      {/* ------------------ LIST VIEW ------------------ */}
      {tab === "list" && (
        <div>
          {/* <br></br>
          <button
            className="mb-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setNewBookingOpen(true)}
          >
            + Add Booking
          </button> */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.map((b) => (
              <BookingCardList
                key={b.id}
                booking={b}
                onEdit={() => setEditingBooking(b)}
                refresh={() =>
                  axios.get(URL).then((res) => setBookings(res.data))
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ------------------ NEW BOOKING MODAL ------------------ */}
      {newBookingOpen && (
        <Modal onClose={() => setNewBookingOpen(false)}>
          <BookingForm
            onSave={() => {
              setNewBookingOpen(false);
              axios.get(URL).then((res) => setBookings(res.data));
            }}
            onDelete={() => {
              setNewBookingOpen(false);
              axios.get(URL).then((res) => setBookings(res.data));
            }}
          />
        </Modal>
      )}

      {/* ------------------ EDIT BOOKING MODAL ------------------ */}
      {editingBooking && (
        <Modal onClose={() => setEditingBooking(null)}>
          <BookingEditor
            booking={editingBooking}
            onDelete={deleteBooking} 
            onSave={() => {
              setEditingBooking(null);
              axios.get(URL).then((res) => setBookings(res.data));
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/* -------------------------------------------------------
   MODAL COMPONENT
------------------------------------------------------- */
function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-xl shadow-xl relative w-full max-w-lg">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-slate-600 hover:text-slate-800"
        >
          ✖
        </button>
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   BOOKING CARD (kept from your original UI)
------------------------------------------------------- */
/* ------------------ DRAGGABLE BOOKING CARD ------------------ */
function BookingCard({
  booking,
  x,
  width,
  roomIndex,
  isOverbooked,
  setNodeRef,
  listeners,
  attributes,
  transform,
  onClick,
  fromOverlay = false
}) {
 

  const translateX = transform?.x ?? 0;
  const translateY = transform?.y ?? 0;

  const [dragging, setDragging] = React.useState(false);

  // When transform is applied → dragging
  React.useEffect(() => {
    if (transform && (transform.x !== 0 || transform.y !== 0)) {
      setDragging(true);
    }
  }, [transform]);

  // Reset after drag ends
  React.useEffect(() => {
    if (!transform) setDragging(false);
  }, [transform]);
  return (
    <div
      onClickCapture={(e) => {
        if (!dragging && onClick) {
          e.stopPropagation();
          onClick(booking);
        }
      }}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        absolute rounded border p-1 text-xs cursor-grab shadow-md
        transition-all duration-150
        ${isOverbooked ? "bg-red-300 border-red-600" : "bg-blue-200 border-blue-500"}
        ${fromOverlay ? "opacity-80 scale-[1.03]" : ""}
      `}
      style={{
        left: x + translateX,
        top: translateY,
        width,
        height: ROW_HEIGHT - 6,
        zIndex: fromOverlay ? 9999 : 10
      }}
    >
      <div className="font-semibold truncate">{booking.guestName}</div>
      <div className="text-[10px] opacity-70">
        {booking.channel} • €{booking.price}/night
      </div>

      {isOverbooked && (
        <div className="absolute right-1 top-1 text-[10px] font-bold text-red-800 bg-red-200 rounded px-1">
          !
        </div>
      )}
    </div>
  );
}

function BookingCardList({ booking, onEdit }) {
  return (
    <div
      className="p-3 mb-2 bg-white rounded border shadow-sm flex justify-between items-center hover:bg-slate-50 cursor-pointer"
      onClick={() => onEdit(booking)}
    >
      <div>
        <div className="font-semibold">{booking.guestName}</div>
        <div className="text-xs opacity-70">
          {booking.room} • {booking.channel} • €{booking.price}/night
        </div>
      </div>

      <div className="text-xs text-slate-500">
        {booking.checkIn} → {booking.checkOut}
      </div>
    </div>
  );
}
/* -------------------------------------------------------
   BOOKING FORM
------------------------------------------------------- */
function BookingForm({ booking, onSave }) {
  const [form, setForm] = useState(
    booking || {
      guestName: "",
      room: "",
      checkIn: "",
      checkOut: "",
      adults: 2,
      kids: 0,
      channel: "Direct",
      price: 0,
      notes: "",
    }
  );

  const update = (field) => (e) =>
    setForm({
      ...form,
      [field]:
        field === "price" || field === "adults" || field === "kids"
          ? Number(e.target.value || 0)
          : e.target.value,
    });

  const submit = async () => {
    if (
      !form.guestName ||
      !form.room ||
      !form.checkIn ||
      !form.checkOut
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    if (booking) {
      await axios.put(`${URL}/${booking.id}`, form);
    } else {
      await axios.post(URL, form);
    }

    onSave();
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">
        {booking ? "Edit Booking" : "New Booking"}
      </h3>

      <input
        type="text"
        placeholder="Guest name"
        className="w-full px-3 py-2 border rounded"
        value={form.guestName}
        onChange={update("guestName")}
      />

      <input
        type="text"
        placeholder="Room"
        className="w-full px-3 py-2 border rounded"
        value={form.room}
        onChange={update("room")}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label>Check-in</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={form.checkIn}
            onChange={update("checkIn")}
          />
        </div>

        <div>
          <label>Check-out</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={form.checkOut}
            onChange={update("checkOut")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label>Adults</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={form.adults}
            onChange={update("adults")}
          />
        </div>
        <div>
          <label>KIDS</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={form.kids}
            onChange={update("kids")}
          />
        </div>
      </div>
       <div>
      <label>Channel</label>
      <input
        type="text"
        placeholder="Channel"
        className="w-full px-3 py-2 border rounded"
        value={form.channel}
        onChange={update("channel")}
      />
      </div>
      <div>
      <label>Price per day</label>
      <input
        type="number"
        placeholder="Price"
        className="w-full px-3 py-2 border rounded"
        value={form.price}
        onChange={update("price")}
      />
      </div>

      <div>
        <label>Notes</label>
      <textarea
        placeholder="Notes"
        className="w-full px-3 py-2 border rounded"
        value={form.notes}
        onChange={update("notes")}
      />
        </div>
      <button
        onClick={submit}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {booking ? "Save changes" : "Create booking"}
      </button>
    </div>
  );
}

/* -------------------------------------------------------
   BOOKING EDITOR
------------------------------------------------------- */
function BookingEditor({ booking, onSave, onDelete }) {
  
  const handleSave = async (form) => {
    await axios.put(`${URL}/${booking.id}`, form);
    onSave();
  };

const handleDelete = async () => {
  if (!window.confirm("Are you sure you want to delete this booking?")) return;

  try {
    await axios.delete(`${URL}/${booking.id}`);
    onDelete(); // parent closes modal + refreshes or updates state
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Could not delete booking. Please try again.");
  }
};
    

  return (
    <div className="w-full">
      <BookingForm booking={booking} onSave={() => onSave()} />
      {/* Delete button */}
      <button
        className="mt-4 w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        onClick={handleDelete}
      >
        Delete Booking
      </button>
    </div>
  );
}
