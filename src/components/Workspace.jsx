import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw, X } from "lucide-react";

export function useWorkspaceData(load) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const request = useRef(null);

  const reload = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const { signal } = controller;
    setLoading(true);
    setError("");
    try {
      const next = await load(signal);
      if (signal?.aborted) return;
      setData(next);
      setUpdatedAt(new Date());
    } catch {
      if (!signal?.aborted) setError("Could not load data. Check your connection and try again.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    reload();
    return () => request.current?.abort();
  }, [reload]);

  return { data, setData, loading, error, updatedAt, reload };
}

export function DataFeedback({ loading, error, reload, data, updatedAt }) {
  if (error) return (
    <div className="workspace-alert" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <span>{error}{data ? " Showing the last loaded data." : ""}</span>
      <button className="workspace-button" onClick={() => reload()}><RefreshCw size={15} /> Retry</button>
    </div>
  );

  if (loading) return <p className="workspace-empty" role="status">Loading…</p>;
  if (!updatedAt) return null;

  return <div className="workspace-freshness">
    <span>Updated {updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Athens" })} (Kos)</span>
    <button className="workspace-icon" aria-label="Refresh data" onClick={() => reload()}><RefreshCw size={15} /></button>
  </div>;
}

export function WorkspaceDialog({ title, children, onClose, wide = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={wide ? "workspace-dialog workspace-dialog-wide" : "workspace-dialog"}
      aria-label={title}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <div className="workspace-dialog-content">
        <header className="workspace-dialog-header">
          <h2>{title}</h2>
          <button type="button" className="workspace-icon" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

