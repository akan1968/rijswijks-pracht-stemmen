"use client";

import { useEffect, useMemo, useState } from "react";

type LocationRow = {
  id: number;
  "naam locatie": string;
  "naam artiest": string;
  wegingsfactor: number;
};

type Choice = {
  locationId: number;
  points: 1 | 2 | 3 | null;
  comment: string;
};

function label(l: LocationRow) {
  return `${l["naam locatie"]} — ${l["naam artiest"]}`;
}

function allowedPointsForCount(count: number): Array<1 | 2 | 3> {
  if (count === 1) return [3];
  if (count === 2) return [3, 2];
  if (count === 3) return [3, 2, 1];
  return [];
}

export default function Home() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "error" | "loading"; msg?: string }>({
    type: "idle",
  });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/locations", { cache: "no-store" });
      const json = await res.json();
      setLocations(json.locations ?? []);
    })();
  }, []);

  const selectedLocations = useMemo(
    () => locations.filter((l) => selectedIds.includes(l.id)),
    [locations, selectedIds]
  );

  const allowedPoints = useMemo(() => allowedPointsForCount(selectedIds.length), [selectedIds.length]);

  useEffect(() => {
    setChoices((prev) => {
      const next: Record<number, Choice> = { ...prev };

      for (const id of selectedIds) {
        if (!next[id]) next[id] = { locationId: id, points: null, comment: "" };
      }

      for (const key of Object.keys(next)) {
        const id = Number(key);
        if (!selectedIds.includes(id)) delete next[id];
      }

      const allowedSet = new Set<number>(allowedPoints);
      for (const id of Object.keys(next).map(Number)) {
        const p = next[id]?.points;
        if (p && !allowedSet.has(p)) next[id] = { ...next[id], points: null };
      }

      if (selectedIds.length === 1) {
        const only = selectedIds[0];
        if (!next[only].points) next[only].points = 3;
      }

      return next;
    });
  }, [selectedIds, allowedPoints]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function setPointsWithSwap(locationId: number, newPoints: 1 | 2 | 3) {
    setChoices((prev) => {
      const next = { ...prev };
      const oldHere = next[locationId]?.points ?? null;

      const otherId = selectedIds.find((sid) => sid !== locationId && next[sid]?.points === newPoints);

      next[locationId] = { ...next[locationId], points: newPoints };

      if (otherId && oldHere !== null) {
        next[otherId] = { ...next[otherId], points: oldHere };
      }

      return next;
    });
  }

  async function submit() {
    if (selectedIds.length < 1 || selectedIds.length > 3) {
      setStatus({ type: "error", msg: "Kies 1, 2 of 3 locaties." });
      return;
    }

    const selections = selectedIds.map((id) => ({
      locationId: id,
      points: choices[id]?.points,
      comment: choices[id]?.comment ?? "",
    }));

    if (selections.some((s) => !s.points)) {
      setStatus({ type: "error", msg: "Ken punten toe aan alle gekozen locaties." });
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

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main style={{ maxWidth: 800, margin: "40px auto", padding: 16, textAlign: "center" }}>
        <h1>Dankjewel!</h1>
        <p>Je stem is opgeslagen. Fijne avond!</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>Stem: Top locaties</h1>

      <p>
        Kies maximaal <b>3</b> locaties.  
        1 keuze = <b>3</b> punten.  
        2 keuzes = <b>3</b> en <b>2</b>.  
        3 keuzes = <b>3</b>, <b>2</b>, <b>1</b>.
      </p>

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2>1) Kies je top (max 3)</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {locations.map((l) => {
            const checked = selectedIds.includes(l.id);
            return (
              <label key={l.id}>
                <input type="checkbox" checked={checked} onChange={() => toggleSelect(l.id)} /> {label(l)}
              </label>
            );
          })}
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2>2) Ken punten toe</h2>

        {selectedLocations.map((l) => (
          <div key={l.id} style={{ marginBottom: 12 }}>
            <b>{label(l)}</b>
            <div>
              {allowedPoints.map((p) => (
                <label key={p} style={{ marginRight: 10 }}>
                  <input
                    type="radio"
                    name={`p-${l.id}`}
                    checked={choices[l.id]?.points === p}
                    onChange={() => setPointsWithSwap(l.id, p)}
                  />{" "}
                  {p}
                </label>
              ))}
            </div>
          </div>
        ))}

        <button onClick={submit} style={{ marginTop: 10 }}>
          Verstuur stem
        </button>

        {status.type === "error" && <p style={{ color: "red" }}>{status.msg}</p>}
      </section>
    </main>
  );
}
