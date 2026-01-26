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
        // key blijft in de URL: /uitslag?key=...
        const res = await fetch(`/api/results${window.location.search}`, { cache: "no-store" });
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
            <th style={thRight}>Totaal punten</th>
            <th style={thRight}>Stemmen</th>
            <th style={thRight}>#3</th>
            <th style={thRight}>#2</th>
            <th style={thRight}>#1</th>
            <th style={th}>Toelichting</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={`${r.locatie}-${r.artiest}-${r.positie}`}>
              <td style={tdCenter}>{r.positie}</td>
              <td style={td}>
                <b>{r.locatie}</b>
              </td>
              <td style={td}>{r.artiest}</td>
              <td style={tdRight}>
                <b>{r.punten_totaal}</b>
              </td>
              <td style={tdRight}>{r.stemmen_aantal}</td>
              <td style={tdRight}>{r.aantal_3}</td>
              <td style={tdRight}>{r.aantal_2}</td>
              <td style={tdRight}>{r.aantal_1}</td>

              {/* OPENKLAPBAAR */}
              <td style={td}>
                <details>
                  <summary style={{ cursor: "pointer", userSelect: "none" }}>
                    {r.toelichting_bundel && r.toelichting_bundel.trim() !== ""
                      ? "Toon toelichtingen"
                      : "Geen toelichtingen"}
                  </summary>

                  {r.toelichting_bundel && r.toelichting_bundel.trim() !== "" ? (
                    <div style={{ marginTop: 8, fontSize: 13, color: "#444", lineHeight: 1.35 }}>
                      {r.toelichting_bundel}
                    </div>
                  ) : null}
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 14, color: "#777", fontSize: 13 }}>
        Tip: bewaar deze link als favoriet inclusief <code>?key=...</code>.
      </p>
    </main>
  );
}

const th: React.CSSProperties = {
  padding: 8,
  borderBottom: "2px solid #ddd",
  textAlign: "left",
};

const thRight: React.CSSProperties = {
  ...th,
  textAlign: "right",
};

const td: React.CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
};

const tdCenter: React.CSSProperties = {
  ...td,
  textAlign: "center",
};

const tdRight: React.CSSProperties = {
  ...td,
  textAlign: "right",
};
