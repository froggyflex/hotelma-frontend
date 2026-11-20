import { useState } from "react";
import axios from "axios";
import { DataFeedback, useWorkspaceData } from "../components/Workspace";

const API = import.meta.env.VITE_API_URL;

async function loadSettings(signal) {
  const { data } = await axios.get(API + "/api/settings", { signal });
  if (!data?.hotelInfo || !data?.invoiceDefaults || !data?.invoiceSeries || !data?.aade) throw new Error("Invalid settings");
  return data;
}

export default function SettingsPage() {
  const resource = useWorkspaceData(loadSettings);
  const { data: settings, setData: setSettings, loading, error } = resource;
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  async function save() {
    if (saving || loading || error) return;
    setSaving(true);
    setNotice(null);
    try {
      await axios.post(API + "/api/settings", settings);
      setNotice({ message: "Settings saved." });
    } catch {
      setNotice({ message: "Could not save settings. Try again.", error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="workspace">

      <header className="workspace-heading"><h1>Hotel settings</h1></header>
      {(!settings || loading || error) && <DataFeedback {...resource} />}
      {notice && <p className={notice.error ? "workspace-alert" : "workspace-badge workspace-badge-ready justify-self-start"} role={notice.error ? "alert" : "status"}>{notice.message}</p>}


      {settings && <fieldset disabled={saving || loading || Boolean(error)} className="workspace-panel workspace-panel-body grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0">

        {/* HOTEL INFO */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Hotel Info</h2>

          {["name", "vatNumber", "country", "address", "email", "phone"].map(field => (
            <div key={field} className="mb-3">
              <label className="block text-sm font-bold capitalize">{field}</label>
              <input
                className="workspace-input"
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
          <div className="sm:col-span-2">
          <div className="mb-3">
            <label className="block text-sm font-bold">Series</label>
            <input
              className="workspace-input"
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
              className="workspace-input"
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
              className="workspace-input"
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
              className="workspace-input"
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
                    className="workspace-input"
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
                    className="workspace-input"
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
                    className="workspace-input"
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
                className="workspace-input"
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
        <div className="sm:col-span-2">
          <h2 className="text-lg font-semibold mb-2">AADE API Settings</h2>

          <div className="mb-3">
            <label className="block font-bold text-sm">Mode</label>
            <select
              className="workspace-input"
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
                className="workspace-input"
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
                className="workspace-input"
                value={settings.aade.subscriptionKey}
                onChange={(e) => setSettings({
                  ...settings,
                  aade: { ...settings.aade, subscriptionKey: e.target.value }
                })}
              />
            </div>
          </div>
        </div>

        <div className="sm:col-span-2 text-right">
          <button
            onClick={save}
            className="workspace-button workspace-primary"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>

      </fieldset>}
    </div>
  );
}
