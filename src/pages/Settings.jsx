import { useState, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/settings`)
      .then(res => {
        setSettings(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Settings load error:", err);
        setLoading(false);
      });
  }, []);

  const save = () => {
    setSaving(true);
    axios.post(`${API}/api/settings`, settings)
      .then(() => {
        alert("Settings saved!");
        setSaving(false);
      })
      .catch(err => {
        alert("Error saving settings");
        console.error(err);
        setSaving(false);
      });
  };

  if (loading || !settings) {
     return <div className="p-6">Loading settings…</div>;
  }


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Hotel Settings</h1>

      <div className="grid grid-cols-2 gap-6 bg-white p-4 rounded shadow">

        {/* HOTEL INFO */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Hotel Info</h2>

          {["name", "vatNumber", "country", "address", "email", "phone"].map(field => (
            <div key={field} className="mb-3">
              <label className="block text-sm font-bold capitalize">{field}</label>
              <input
                className="border p-2 rounded w-full"
                value={settings.hotelInfo[field]}
                onChange={(e) => setSettings({
                  ...settings,
                  hotelInfo: { ...settings.hotelInfo, [field]: e.target.value }
                })}
              />
            </div>
          ))}
        </div>

        {/* INVOICE DEFAULTS */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Invoice Defaults</h2>
          <div className="col-span-2">
          <div className="mb-3">
            <label className="block text-sm font-bold">Series</label>
            <input
              className="border p-2 rounded w-full"
              value={settings.invoiceSeries.currentSeries}
              onChange={(e) => setSettings({
                ...settings,
                invoiceDefaults: { ...settings.invoiceDefaults, series: e.target.value }
              })}
            />

          </div>

          <div className="mb-3">
            <label className="block text-sm font-bold">Accommodation VAT (%)</label>
            <input
              type="number"
              step="0.01"
              className="border p-2 rounded w-full"
              value={settings.invoiceDefaults.vatAccommodation}
              onChange={(e) => setSettings({
                ...settings,
                invoiceDefaults: {
                  ...settings.invoiceDefaults,
                  vatAccommodation: parseFloat(e.target.value)
                }
              })}
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-bold">Extras VAT (%)</label>
            <input
              type="number"
              step="0.01"
              className="border p-2 rounded w-full"
              value={settings.invoiceDefaults.vatExtras}
              onChange={(e) => setSettings({
                ...settings,
                invoiceDefaults: {
                  ...settings.invoiceDefaults,
                  vatExtras: parseFloat(e.target.value)
                }
              })}
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-bold">Accommodation Tax (€)</label>
            <input
              type="number"
              step="0.1"
              className="border p-2 rounded w-full"
              value={settings.invoiceDefaults.accommodationTax}
              onChange={(e) => setSettings({
                ...settings,
                invoiceDefaults: {
                  ...settings.invoiceDefaults,
                  accommodationTax: parseFloat(e.target.value)
                }
              })}
            />
          </div>
                      <h2 className="text-lg font-semibold mb-2">Invoice Series Control</h2>

            <div className="grid grid-cols-3 gap-4">
                <div>
                <label className="block text-sm font-bold">Current Series</label>
                <input
                    className="border p-2 rounded w-full"
                    value={settings.invoiceSeries.currentSeries}
                    onChange={(e) => setSettings({
                    ...settings,
                    invoiceSeries: {
                        ...settings.invoiceSeries,
                        current: e.target.value.toUpperCase()
                    }
                    })}
                />
                </div>

                <div>
                <label className="block text-sm font-bold">Next AA</label>
                <input
                    type="number"
                    className="border p-2 rounded w-full"
                    value={settings.invoiceSeries.nextAA}
                    onChange={(e) => setSettings({
                    ...settings,
                    invoiceSeries: {
                        ...settings.invoiceSeries,
                        nextAA: parseInt(e.target.value)
                    }
                    })}
                />
                </div>

                <div>
                <label className="block text-sm font-bold">Max AA</label>
                <input
                    type="number"
                    className="border p-2 rounded w-full"
                    value={settings.invoiceSeries.maxAA}
                    onChange={(e) => setSettings({
                    ...settings,
                    invoiceSeries: {
                        ...settings.invoiceSeries,
                        maxAA: parseInt(e.target.value)
                    }
                    })}
                />
                </div>
            </div>

            <div className="mt-4">
                <label className="block text-sm font-bold">Allowed Series (comma separated)</label>
                <input
                className="border p-2 rounded w-full"
                value={settings.invoiceSeries.allowedSeries.join(",")}
                onChange={(e) => setSettings({
                    ...settings,
                    invoiceSeries: {
                    ...settings.invoiceSeries,
                    allowedSeries: e.target.value.split(",").map(s => s.trim().toUpperCase())
                    }
                })}
                />
            </div>
            </div>    
        
        </div>

        {/* AADE KEYS */}
        <div className="col-span-2">
          <h2 className="text-lg font-semibold mb-2">AADE API Settings</h2>

          <div className="mb-3">
            <label className="block font-bold text-sm">Mode</label>
            <select
              className="border p-2 rounded w-full"
              value={settings.aade.mode}
              onChange={(e) => setSettings({
                ...settings,
                aade: { ...settings.aade, mode: e.target.value }
              })}
            >
              <option value="DEV">DEV</option>
              <option value="PROD">PRODUCTION</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold">Username</label>
              <input
                className="border p-2 rounded w-full"
                value={settings.aade.username}
                onChange={(e) => setSettings({
                  ...settings,
                  aade: { ...settings.aade, username: e.target.value }
                })}
              />
            </div>

            <div>
              <label className="block font-bold">Subscription Key</label>
              <input
                type="password"
                className="border p-2 rounded w-full"
                value={settings.aade.subscriptionKey}
                onChange={(e) => setSettings({
                  ...settings,
                  aade: { ...settings.aade, subscriptionKey: e.target.value }
                })}
              />
            </div>
          </div>
        </div>

        <div className="col-span-2 text-right">
          <button
            onClick={save}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>

      </div>
    </div>
  );
}
