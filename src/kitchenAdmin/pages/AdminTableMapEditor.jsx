import { useEffect, useState } from "react";
import TableMap from "../../kitchen/components/TableMap";
import axios from "axios";
import { fetchActiveTables } from "../../kitchen/services/kitchenOrdersApi";

export default function AdminTableMapEditor() {
  const [tables, setTables] = useState([]);
  const [positions, setPositions] = useState([]);
  const [dragging, setDragging] = useState(null);

  const MAP_WIDTH = 1500;
  const MAP_HEIGHT = 900;

  // Load tables
  useEffect(() => {
    fetchActiveTables().then(setTables);
  }, []);

  // Load existing map OR initialize default layout
  useEffect(() => {
    if (!tables.length) return;

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/table-map`)
      .then(res => {
        if (res.data?.tables?.length) {
          setPositions(res.data.tables);
        } else {
          // default layout (grid-ish)
          setPositions(
            tables.map((t, i) => ({
              tableId: t._id,
              x: 120 + (i % 5) * 140,
              y: 120 + Math.floor(i / 5) * 140,
            }))
          );
        }
      })
      .catch(() => {
        // fallback if API fails
        setPositions(
          tables.map((t, i) => ({
            tableId: t._id,
            x: 120 + (i % 5) * 140,
            y: 120 + Math.floor(i / 5) * 140,
          }))
        );
      });
  }, [tables]);

    function getRelativeCoords(e) {
    const svg = e.currentTarget.querySelector("svg");
    const rect = svg.getBoundingClientRect();

    const x =
        ((e.clientX - rect.left) / rect.width) * MAP_WIDTH;
    const y =
        ((e.clientY - rect.top) / rect.height) * MAP_HEIGHT;

    return { x, y };
    }

  function handleMouseMove(e) {
    if (!dragging) return;

   const { x, y } = getRelativeCoords(e);


    setPositions(prev =>
      prev.map(p =>
        p.tableId === dragging
          ? {
              ...p,
              x: Math.max(40, Math.min(MAP_WIDTH - 40, x)),
              y: Math.max(40, Math.min(MAP_HEIGHT - 40, y)),
            }
          : p
      )
    );
  }

  function handleMouseUp() {
    setDragging(null);
  }

  async function save() {
    await axios.post(`${import.meta.env.VITE_API_URL}/api/table-map`, {
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      tables: positions,
    });

    alert("Layout saved");
  }

  if (!tables.length || !positions.length) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-slate-500">
        Loading table map…
      </div>
    );
  } 
  

const mergedTables = tables.map(t => ({
  ...t,
  _pos: positions.find(p => p.tableId === t._id),
}));

 
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Table Map Editor</h1>

      <div className="border rounded-xl bg-white overflow-hidden">
        <div
        className="border rounded-xl bg-white overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        >
          <TableMap
            admin
            tables={mergedTables}
            layout={{
              width: MAP_WIDTH,
              height: MAP_HEIGHT,
              tables: positions,
            }}
            onDragStart={setDragging}
          />
        </div>
      </div>

      <button
        onClick={save}
        className="rounded-xl bg-slate-900 px-4 py-2 text-white"
      >
        Save layout
      </button>
    </div>
  );
}
