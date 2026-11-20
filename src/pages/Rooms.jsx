import { useState } from "react";
import axios from "axios";
import { Plus } from "lucide-react";
import { DataFeedback, useWorkspaceData, WorkspaceDialog } from "../components/Workspace";
import { API, errorMessage } from "../utils/operations";

const URL = API + "/rooms";
const defaultRoom = { name: "", type: "Double", capacity: 2, status: "clean" };
const roomTypes = ["Single", "Double", "Family", "Suite", "Studio", "Studios", "Apartment"];
const statusLabels = { clean: "Ready", dirty: "Needs cleaning", "in-progress": "In progress", occupied: "Occupied", maintenance: "Maintenance", free: "Status unset" };

async function loadRooms(signal) {
  const { data } = await axios.get(URL, { signal });
  if (!Array.isArray(data)) throw new Error("Invalid response");
  return data;
}

export default function Rooms() {
  const resource = useWorkspaceData(loadRooms);
  const { data, setData, loading, error } = resource;
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");

  return <div className="workspace">
    <header className="workspace-heading"><h1>Rooms</h1><button className="workspace-button workspace-primary" onClick={() => setEditing(defaultRoom)} disabled={!data || loading || Boolean(error)}><Plus size={17} /> Add room</button></header>
    {notice && <p className="workspace-badge workspace-badge-ready justify-self-start" role="status">{notice}</p>}
    {(!data || loading || error) && <DataFeedback {...resource} />}
    {data && <section className="workspace-panel">
      <div className="workspace-panel-header"><h2>Room inventory</h2><span className="workspace-badge">{data.length} rooms</span></div>
      {data.length === 0 ? <p className="workspace-empty">No rooms have been set up.</p> :
        [...data].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { numeric: true })).map((room) =>
          <div className="workspace-row" key={room.id}>
            <div><strong>Room {room.name}</strong><p className="workspace-muted">{room.type} · Sleeps {room.capacity}</p></div>
            <div className="workspace-actions">
              <span className={"workspace-badge" + (room.status === "clean" ? " workspace-badge-ready" : room.status === "dirty" ? " workspace-badge-warn" : "")}>{statusLabels[room.status] || "Status unset"}</span>
              <button className="workspace-button" disabled={loading || Boolean(error)} aria-label={"Edit room " + room.name} onClick={() => setEditing(room)}>Edit</button>
            </div>
          </div>)}
    </section>}
    {data && !loading && !error && <DataFeedback {...resource} />}
    {editing && <RoomEditor room={editing} onClose={() => setEditing(null)} onSaved={(saved) => {
      setData((current) => editing.id ? current.map((room) => room.id === editing.id ? saved : room) : [...current, saved]);
      setNotice("Room " + saved.name + " saved.");
      setEditing(null);
    }} onDeleted={() => {
      setData((current) => current.filter((room) => room.id !== editing.id));
      setNotice("Room " + editing.name + " deleted.");
      setEditing(null);
    }} />}
  </div>;
}

function RoomEditor({ room, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState(room);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    if (pending || confirmDelete) return;
    const { name, type, status } = form;
    const fields = { name: name?.trim(), type, status, capacity: Number(form.capacity) };
    if (!fields.name || !Number.isInteger(fields.capacity) || fields.capacity < 1) {
      setError("Enter a room number and a capacity of at least one.");
      return;
    }
    setPending(true);
    setError("");
    try {
      if (room.id) {
        const changes = Object.fromEntries(Object.entries(fields).filter(([key, value]) => value !== room[key]));
        const { data } = await axios.put(URL + "/" + room.id, changes);
        onSaved(data.id ? data : { ...room, ...changes });
      } else {
        const { data } = await axios.post(URL, fields);
        onSaved(data);
      }
    } catch (failure) {
      setError(errorMessage(failure, "Could not save the room. Try again."));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await axios.delete(URL + "/" + room.id);
      onDeleted();
    } catch (failure) {
      setError(errorMessage(failure, "Could not delete the room. Try again."));
      setConfirmDelete(false);
    } finally {
      setPending(false);
    }
  }

  return <WorkspaceDialog title={room.id ? "Edit room " + room.name : "Add room"} onClose={() => { if (!pending) onClose(); }}>
    <form className="booking-editor" onSubmit={save}>
      <div className="workspace-dialog-body space-y-3">
        <fieldset className="workspace-form-grid" disabled={pending || confirmDelete}>
          <label className="workspace-field">Room number<input className="workspace-input" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="workspace-field">Room type<select className="workspace-input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            {[...new Set([...roomTypes, form.type].filter(Boolean))].map((type) => <option key={type}>{type}</option>)}
          </select></label>
          <label className="workspace-field">Capacity<input className="workspace-input" type="number" min="1" required value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></label>
          <label className="workspace-field">Status<select className="workspace-input" value={form.status || ""} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            {!statusLabels[form.status] && <option value={form.status || ""}>Status unset</option>}
            {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select></label>
        </fieldset>
        {error && <p className="workspace-alert" role="alert">{error}</p>}
      </div>
      <div className="workspace-dialog-footer">
        {confirmDelete ? <><span className="mr-auto text-sm font-semibold">Delete this room from the inventory?</span><button type="button" className="workspace-button" disabled={pending} onClick={() => setConfirmDelete(false)}>Cancel</button><button type="button" className="workspace-button workspace-danger" disabled={pending} onClick={remove}>Delete room</button></> :
          <>
            {room.id && <button type="button" className="workspace-button workspace-danger mr-auto" disabled={pending} onClick={() => setConfirmDelete(true)}>Delete room</button>}
            <button type="button" className="workspace-button" disabled={pending} onClick={onClose}>Cancel</button>
            <button className="workspace-button workspace-primary" disabled={pending}>{pending ? "Saving…" : "Save room"}</button>
          </>}
      </div>
    </form>
  </WorkspaceDialog>;
}

