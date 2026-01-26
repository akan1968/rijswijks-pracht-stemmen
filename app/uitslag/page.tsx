"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  positie: number;
  locatie: string;
  artiest: string;
  wegingsfactor: number;
  stemmen_aantal: number;
  punten_totaal: number;
  aantal_3: number;
  aantal_2: number;
  aantal_1: number;
  toelichting_bundel: string;
};

export default function UitslagPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/results${window.location.search}`);
        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "Fout bij ophalen uitslag");
        }

        setRows(json.rows ?? []);
        setStatus("idle");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    })();
  }, []);

  const totaalStemmen = useMemo(
    () => rows.reduce((sum, r) => sum + (r.stemmen_aantal ?? 0), 0),
    [rows]
  );

  if (status === "loading") return <p style={{ padding: 20 }}>Uitslag laden…</p>;
  if (status === "error") return <p style={{ padding: 20 }}>Fout bij laden uitslag.</p>;

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Uitslag publieksstemming</h1>

      <p style={{ marginTop: 0, color: "#555" }}>
        Privé overzicht (alleen toegankelijk via geheime link).
      </p>

      <p style={{ marginTop: 0, marginBottom: 20, fontSize: 16 }}>
        <b>Totaal aantal stemmen:</b> {totaalStemmen}
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f2f2f2" }}>
            <th style={th}>#</th>
            <th style={th}>Locatie</th>
            <th style={th}>Artiest</th>
            <th style={th}>Totaal punten</th>
            <th style={th}>Stemmen</th>
            <th style={th}>#3</th>
            <th style={th}>#2</th>
            <th style={th}>#1</th>
            <th style={th}>Toelichting (bundel)</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.positie}>
              <td style={tdCenter}>{r.positie}</td>
              <td style={td}>{r.locatie}</td>
              <td style={td}>{r.artiest}</td>
              <td style={tdCenter}><b>{r.punten_totaal}</b></td>
              <td style={tdCenter}>{r.stemmen_aantal}</td>
              <td style={tdCenter}>{r.aantal_3}</td>
              <td style={tdCenter}>{r.aantal_2}</td>
              <td style={tdCenter}>{r.aantal_1}</td>
              <td style={tdSmall}>{r.toelichting_bundel || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

const th: React.CSSProperties = {
  padding: 8,
  borderBottom: "2px solid #ddd",
  textAlign: "left",
};

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #eee",
};

const tdCenter: React.CSSProperties = {
  ...td,
  textAlign: "center",
};

const tdSmall: React.CSSProperties = {
  ...td,
  fontSize: 12,
  color: "#444",
};
