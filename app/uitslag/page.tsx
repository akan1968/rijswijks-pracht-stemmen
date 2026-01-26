"use client";

import { useEffect, useMemo, useState } from "react";

type ResultRow = {
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
  toelichting_bundel: string;
};

export default function UitslagPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "error"; msg?: string }>({
    type: "idle",
  });

  const key = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("key") ?? "";
  }, []);

  useEffect(() => {
    (async () => {
      setStatus({ type: "loading", msg: "Uitslag laden..." });

      if (!key) {
        setStatus({ type: "error", msg: "Geen key in de URL. Voeg ?key=... toe." });
        return;
      }

      const res = await fetch(`/api/results?key=${encodeURIComponent(key)}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setStatus({ type: "error", msg: json.error ?? "Kon uitslag niet laden." });
        return;
      }

      setRows((json.rows ?? []) as ResultRow[]);
      setStatus({ type: "idle" });
    })();
  }, [key]);

  return (
    <main style={{ maxWidth: 1100, margin: "30px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Uitslag</h1>
      <p style={{ marginTop: 0, color: "#555" }}>
        Privé overzicht (alleen met geheime link).
      </p>

      {status.type === "loading" && <p>{status.msg}</p>}
      {status.type === "error" && <p style={{ color: "#b00020" }}>{status.msg}</p>}

      {status.type === "idle" && rows.length > 0 && (
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <Th>#</Th>
                <Th>Locatie — artiest</Th>
                <Th align="right">Totaal punten</Th>
                <Th align="right"># stemmen</Th>
                <Th align="right">#3</Th>
                <Th align="right">#2</Th>
                <Th align="right">#1</Th>
                <Th>Toelichting (bundels)</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.locatie_id} style={{ borderTop: "1px solid #eee" }}>
                  <Td>{r.positie}</Td>
                  <Td>
                    <b>{r.locatie}</b> — {r.artiest}
                  </Td>
                  <Td align="right">{r.punten_totaal}</Td>
                  <Td align="right">{r.stemmen_aantal}</Td>
                  <Td align="right">{r.aantal_3}</Td>
                  <Td align="right">{r.aantal_2}</Td>
                  <Td align="right">{r.aantal_1}</Td>
                  <Td style={{ color: "#444" }}>{r.toelichting_bundel || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status.type === "idle" && rows.length === 0 && (
        <p>Geen resultaten gevonden (nog geen stemmen?).</p>
      )}

      <p style={{ marginTop: 14, color: "#777", fontSize: 13 }}>
        Tip: bookmark deze link inclusief key.
      </p>
    </main>
  );
}

function Th({ children, align }: { children: any; align?: "right" | "left" | "center" }) {
  return (
    <th
      style={{
        textAlign: align ?? "left",
        padding: "10px 12px",
        fontSize: 13,
        color: "#444",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  style,
}: {
  children: any;
  align?: "right" | "left" | "center";
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        textAlign: align ?? "left",
        padding: "10px 12px",
        verticalAlign: "top",
        ...style,
      }}
    >
      {children}
    </td>
  );
}
