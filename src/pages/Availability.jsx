import { useState } from "react";
import axios from "axios";

export default function Availability() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [offerData, setOfferData] = useState(null);


  const checkAvailability = async () => {
    setLoading(true);

    const res = await axios.get(
      `${import.meta.env.VITE_API_URL}/availability`,
      { params: { start, end, adults, kids } }
    );

    setOptions(res.data.options);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Check Availability</h2>

      {/* Form */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <input type="date" value={start}
          onChange={e => setStart(e.target.value)}
          className="border rounded p-2" />

        <input type="date" value={end}
          onChange={e => setEnd(e.target.value)}
          className="border rounded p-2" />

        <input type="number" value={adults}
          onChange={e => setAdults(e.target.value)}
          className="border rounded p-2" />

        <input type="number" value={kids}
          onChange={e => setKids(e.target.value)}
          className="border rounded p-2" />
      </div>

      <button
        onClick={checkAvailability}
        className="bg-sky-500 text-white px-4 py-2 rounded hover:bg-sky-600"
      >
        Check
      </button>

      {/* Results */}
      <div className="mt-8 space-y-4">
        {loading && <div>Loading...</div>}

        {options.map(opt => (
          <div key={opt.type} className="border rounded p-4 bg-gray-50 shadow">
            <h3 className="font-semibold text-lg">{opt.type}</h3>
            <p className="text-sm text-gray-600">
              Capacity: {opt.capacity} • Available units: {opt.rooms.length}
            </p>


                <button className="mt-3 bg-sky-500 text-white px-3 py-1 rounded" onClick={() => setOfferData({
                start,
                end,
                adults,
                kids,
                options
                })}>

              Prepare Offer
            </button>
          </div>
        ))}
        {offerData && (
        <Modal onClose={() => setOfferData(null)}>
            <OfferModal data={offerData} onClose={() => setOfferData(null)} />
        </Modal>
        )}
      </div>
    </div>
  );


}
