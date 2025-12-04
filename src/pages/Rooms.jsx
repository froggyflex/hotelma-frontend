import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL;
const URL  = `${API}/bookings`;
const URLR = `${API}/rooms`;

const emptyRoom = { name: '', type: 'Double', capacity: 2, status: 'clean' }

function RoomEditor({ room, onSave }) {
  const [form, setForm] = useState(room);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  function handleCancel() {
    if (onCancel) onCancel(); // safe even if onCancel is undefined
  }

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
        Edit Room: {room.name}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Room Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Room Number
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={form.type}
            onChange={(e) => handleChange("type", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option>Double</option>
            <option>Single</option>
            <option>Family</option>
            <option>Studio</option>
            <option>Apartment</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="clean">Clean</option>
            <option value="dirty">Dirty</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          {/* <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 
                       hover:bg-gray-300 transition"
          >
            Cancel
          </button> */}

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-sky-500 text-white 
                       hover:bg-sky-600 transition shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Rooms() {
  const [rooms, setRooms] = useState([])
  const [form, setForm] = useState(emptyRoom)
  const [editingRoom, setEditingRoom] = useState(null); 

  const load = () => axios.get(URLR).then((res) => setRooms(res.data))
  useEffect(() => {
    load()
  }, [])

   
  const handleCreate = () => {
    if(form.name == ""){
      alert("Please assign a room number")
      return;
    }
    axios.post(URLR, form).then(() => {
      setForm(emptyRoom)
      load()
    })
  }
    
  function startEditRoom(room) {
    setEditingRoom(room);
  }


  return (
    
    <div>
      <h2 className="text-2xl font-bold mb-4">Rooms</h2>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-semibold mb-2">Add room</h3>
        <div className="grid gap-2 md:grid-cols-4 text-sm">
          <input
            className="border rounded px-2 py-1"
            placeholder="Room number/name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="border rounded px-2 py-1"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option>Single</option>
            <option>Double</option>
            <option>Family</option>
            <option>Suite</option>
            <option>Studios</option>
          </select>
          <label className="flex flex-col">
            <span className="text-xs text-slate-500 mb-0.5">Capacity</span>
            <input
              type="number"
              min="1"
              className="border rounded px-2 py-1"
              value={form.capacity}
              onChange={(e) =>
                setForm({ ...form, capacity: Number(e.target.value || 1) })
              }
            />
          </label>
          {/* <select
            className="border rounded px-2 py-1"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="clean">Clean</option>
            <option value="dirty">Dirty</option>
            <option value="in-progress">In progress</option>
          </select> */}
        </div>
        <div className="flex justify-end mt-3">
          <button
            type="button"
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm"
            onClick={handleCreate}
          >
            Save room
          </button>
        </div>
      </div>
       {editingRoom && (
      <Modal onClose={() => setEditingRoom(null)} >
        <RoomEditor 
          room={editingRoom}
          onSave={updateRoom}
          onCancel={() => setEditingRoom(null)}
        />
      </Modal>
    )}
      <div className="bg-white rounded-xl shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left px-3 py-2">Room</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Capacity</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-slate-600">{r.type}</td>
                <td className="px-3 py-2 text-slate-600">{r.capacity}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </td>
                  <td className="px-3 py-2">
                    <button className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm" onClick={() => startEditRoom(r)}>Edit</button> &nbsp;&nbsp;&nbsp;
                    <button className="bg-red-600 text-white px-4 py-1.5 rounded text-sm" onClick={() => deleteRoom(r.id)}>Delete</button>
                  </td> 
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-sm text-slate-500" colSpan={4}>
                  No rooms yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    
  )
  async function deleteRoom(id) {
    if (!window.confirm("Delete this room?")) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/rooms/${id}`);
      setRooms(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete room");
    }
  }
  async function updateRoom(updatedRoom) {
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/rooms/${updatedRoom.id}`,
        updatedRoom
      );

      setRooms(prev =>
        prev.map(r => (r.id === updatedRoom.id ? res.data : r))
      );

      setEditingRoom(null);
      load()
    } catch (err) {
      console.error(err);
      alert("Failed to update room");
    }
  }
  function StatusBadge({ status }) {
    let color = 'bg-slate-200 text-slate-700'
    if (status === 'clean') color = 'bg-emerald-100 text-emerald-700'
    if (status === 'dirty') color = 'bg-rose-100 text-rose-700'
    if (status === 'in-progress') color = 'bg-amber-100 text-amber-700'

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${color}`}>
        {status}
      </span>
    )

  }



}
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




