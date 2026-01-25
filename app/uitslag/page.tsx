"use client";

import { useEffect, useState } from "react";

type Row = {
  positie: number;
  locatie_id: number;
  locatie: string;
  artiest: string;
  wegingsfactor: number;
  stemmen_aantal: number;
  punten_totaal: number;
  aantal_3: number;
  aantal_2: number;
  aantal_1: number;
  toelichting_bundel?: string | null;
};

export default function UitslagPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "error" | "ok"; msg?: string }>({ type: "idle" });

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("key") ?? "";
    if (!key) {
      setStatus({ type: "error", msg: "Geen toegang: ontbrekende sleutel in URL." });
      return;
    }

    (async () => {
      setStatus({ type: "loading", msg: "Uitslag laden..." });
      const res = await fetch(`/api/results?key=${encodeURIComponent(key)}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setStatus({ type: "error", msg: json.error ?? "Geen toegang of fout." });
        return;
      }

      setRows((json.rows ?? []) as Row[]);
      setStatus({ type: "ok" });
    })();
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: "30px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Uitslag</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Privé overzicht – alleen toegankelijk met geheime link.
      </p>

      {status.type === "loading" && <p>{status.msg}</p>}
      {status.type === "error" && <p style={{ color: "#b00020" }}>{status.msg}</p>}

      {status.type === "ok" && (
        <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f6f6f6" }}>
                {["#", "Locatie — artiest", "Punten", "# stemmen", "#3", "#2", "#1", "Toelichting"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #ddd", fontSize: 14 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.locatie_id}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", width: 40 }}>
                    <b>{r.positie}</b>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                    <b>{r.locatie}</b> — {r.artiest}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                    {r.punten_totaal}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                    {r.stemmen_aantal}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                    {r.aantal_3}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                    {r.aantal_2}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
                    {r.aantal_1}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee", minWidth: 240 }}>
                    {r.toelichting_bundel || <span style={{ color: "#888" }}>—</span>}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 12, color: "#666" }}>
                    Nog geen uitslag beschikbaar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

