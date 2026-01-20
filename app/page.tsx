"use client";

import { useEffect, useMemo, useState } from "react";

type Location = {
  id: number;
  "naam locatie": string;
  "naam artiest": string;
  wegingsfactor: number;
};

function label(l: Location) {
  return `${l["naam locatie"]} — ${l["naam artiest"]}`;
}

type Choice = {
  locationId: number;
  points: 1 | 2 | 3 | null;
  comment: string;
};

export default function Home() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [status, setStatus] = useState<{ type: "idle" | "error" | "ok" | "loading"; msg?: string }>({ type: "idle" });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/locations");
      const json = await res.json();
      setLocations((json.locations ?? []) as Location[]);
    })();
  }, []);

  useEffect(() => {
    setChoices(prev => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (!next[id]) next[id] = { locationId: id, points: null, comment: "" };
      }
      for (const key of Object.keys(next)) {
        const id = Number(key);
        if (!selectedIds.includes(id)) delete next[id];
      }
      return next;
    });
  }, [selectedIds]);

  const selectedLocations = useMemo(
    () => locations.filter(l => selectedIds.includes(l.id)),
    [locations, selectedIds]
  );

  const usedPoints = useMemo(() => {
    const pts = new Set<number>();
    for (const id of selectedIds) {
      const p = choices[id]?.points;
      if (p) pts.add(p);
    }
    return pts;
  }, [choices, selectedIds]);

  const canSelectMore = selectedIds.length < 3;

  function toggleSelect(id: number) {
    setStatus({ type: "idle" });
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function submit() {
    setStatus({ type: "idle" });

   if (selectedIds.length < 1 || selectedIds.length > 3) {
  setStatus({ type: "error", msg: "Kies 1, 2 of 3 locaties." });
  return;
}

    const selections = selectedIds.map(id => ({
      locationId: id,
      points: choices[id]?.points,
      comment: choices[id]?.comment ?? "",
    }));

    if (selections.some(s => !s.points)) {
  setStatus({ type: "error", msg: "Ken punten toe aan je gekozen locaties." });
  return;
}

const pts = selections.map(s => s.points).sort((a, b) => (a! - b!)).join(",");
const expected = selectedIds.length === 1 ? "3" : selectedIds.length === 2 ? "2,3" : "1,2,3";

if (pts !== expected) {
  setStatus({ type: "error", msg: `Gebruik de punten ${expected.replace(",", " en ").replace("2,3", "3 en 2")} (elk maar 1×).` });
  return;
}

    setStatus({ type: "loading", msg: "Versturen..." });

    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections }),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      setStatus({ type: "error", msg: json.error ?? "Er ging iets mis." });
      return;
    }

    setStatus({ type: "ok", msg: "Dank! Je stem is opgeslagen." });
    setSelectedIds([]);
  }

  return (
    <main style={{ maxWidth: 820, margin: "40px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Stem: Top 3 locaties</h1>
      <p style={{ marginTop: 0 }}>
        Kies <b>precies 3</b> locaties. Verdeel daarna de punten: <b>3</b> (winnaar), <b>2</b> (tweede), <b>1</b> (derde).
      </p>

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>1) Kies je top 3 (max 3)</h2>

        {locations.length === 0 ? (
          <p>Locaties laden...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {locations.map(l => {
              const checked = selectedIds.includes(l.id);
              const disabled = !checked && !canSelectMore;
              return (
                <label key={l.id} style={{ display: "flex", gap: 10, opacity: disabled ? 0.6 : 1 }}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleSelect(l.id)} />
                  <span>{label(l)}</span>
                </label>
              );
            })}
          </div>
        )}

        <p style={{ color: "#555", marginBottom: 0 }}>Gekozen: {selectedIds.length}/3</p>
      </section>
        {selectedIds.length > 0 && (
  <div style={{ marginTop: 8 }}>
    <b>Jouw keuze:</b>
    <ol style={{ marginTop: 6 }}>
      {selectedLocations.map(l => (
        <li key={l.id}>{label(l)}</li>
      ))}
    </ol>
  </div>
)}
      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>2) Ken punten toe + toelichting</h2>

        {selectedIds.length === 0 ? (
          <p>Kies eerst locaties hierboven.</p>
        ) : (
          <>
            {selectedLocations.map(l => {
              const c = choices[l.id];
              const current = c?.points ?? null;

              return (
                <div key={l.id} style={{ padding: 12, border: "1px solid #eee", borderRadius: 10, marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{label(l)}</div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <span>Punten:</span>
                    {[3, 2, 1].map(p => {
                      const pNum = p as 1 | 2 | 3;
                      const disabled = usedPoints.has(pNum) && current !== pNum;
                      return (
                        <label key={p} style={{ opacity: disabled ? 0.5 : 1 }}>
                          <input
                            type="radio"
                            name={`points-${l.id}`}
                            value={p}
                            checked={current === pNum}
                            disabled={disabled}
                            onChange={() =>
                              setChoices(prev => ({ ...prev, [l.id]: { ...prev[l.id], points: pNum } }))
                            }
                          />{" "}
                          {p}
                        </label>
                      );
                    })}
                    <span style={{ color: "#777" }}>(elk getal kan maar 1×)</span>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Toelichting (optioneel)"
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                    value={c?.comment ?? ""}
                    onChange={e => setChoices(prev => ({ ...prev, [l.id]: { ...prev[l.id], comment: e.target.value } }))}
                  />
                </div>
              );
            })}

            <button onClick={submit} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333", background: "white" }}>
              Verstuur stem
            </button>

            {status.type !== "idle" && (
              <p style={{ marginTop: 10, color: status.type === "error" ? "#b00020" : "#1b5e20" }}>{status.msg}</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
