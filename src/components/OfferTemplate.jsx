import { useState, useMemo } from "react";

export default function OfferTemplate({ start, end, adults, kids, roomType }) {
  const baseText = useMemo(() => {
    const nights =
      (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);

    return `
Hello,

Thank you for your inquiry!

For your dates: ${start} → ${end} (${nights} nights)
For: ${adults} adults${kids > 0 ? ` + ${kids} children` : ""}

We can offer you our ${roomType.type}.
Capacity: ${roomType.capacity}
Available rooms: ${roomType.rooms.join(", ")}

Please let us know if you’d like to proceed to reservation.
    `.trim();
  }, [start, end, adults, kids, roomType]);

  // Local editable message
  const [message, setMessage] = useState(baseText);

  // If props change (different dates / room type), reset template
  // optional – remove if you prefer to keep whatever user typed
  // useEffect(() => setMessage(baseText), [baseText]);

  return (
    <div className="space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full h-48 border p-3 rounded text-sm"
      />

      <button
        onClick={() => navigator.clipboard.writeText(message)}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Copy to Clipboard
      </button>
    </div>
  );
}