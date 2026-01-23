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
  if (count <= 0) return [];
  if (count === 1) return [3];
  if (count === 2) return [3, 2];
  return [3, 2, 1];
}

export default function Home() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [status, setStatus] = useState<{ type: "idle" | "error" | "ok" | "loading"; msg?: string }>({
    type: "idle",
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/locations", { cache: "no-store" });
      const json = await res.json();
      setLocations((json.locations ?? []) as LocationRow[]);
    })();
  }, []);

  const canSelectMore = selectedIds.length < 3;

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
        const onlyId = selectedIds[0];
        if (next[onlyId]?.points == null) {
          next[onlyId] = { ...next[onlyId], points: 3 };
        }
      }

      return next;
    });
  }, [selectedIds, allowedPoints]);

  function toggleSelect(id: number) {
    setStatus({ type: "idle" });
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function setPointsWithSwap(locationId: number, newPoints: 1 | 2 | 3) {
    setChoices((prev) => {
      const next = { ...prev };

      if (!next[locationId]) next[locationId] = { locationId, points: null, comment: "" };

      const oldHere = next[locationId].points ?? null;

      const otherId = selectedIds.find((sid) => sid !== locationId && next[sid]?.points === newPoints);

      next[locationId] = { ...next[locationId], points: newPoints };

      if (otherId) {
        next[otherId] = { ...next[otherId], points: oldHere };
      }

      return next;
    });
  }

  async function submit() {
    setStatus({ type: "idle" });

    if (selectedIds.length < 1 || selectedIds.length > 3) {
      setStatus({ type: "error", msg: "Kies 1, 2 of 3 locaties." });
      return;
    }

    const selections = selectedIds.map((id) => ({
      locationId: id,
      points: choices[id]?.points ?? null,
      comment: choices[id]?.comment ?? "",
    }));

    if (selections.some((s) => !s.points)) {
      setStatus({ type: "error", msg: "Ken punten toe aan alle gekozen locaties." });
      return;
    }

    const expected = allowedPointsForCount(selectedIds.length)
      .slice()
      .sort((a, b) => a - b)
      .join(",");

    const actual = selections
      .map((s) => s.points as 1 | 2 | 3)
      .slice()
      .sort((a, b) => a - b)
      .join(",");

    if (actual !== expected) {
      setStatus({ type: "error", msg: "Puntentoekenning klopt niet." });
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
    setSubmitted(true);

    setSelectedIds([]);
    setChoices({});
  }

  if (submitted) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Dankjewel!</h1>
        <p style={{ fontSize: 18, lineHeight: 1.4 }}>
          Je stem is opgeslagen. Fijne avond!
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Stem: Top locaties</h1>

      <p style={{ marginTop: 0 }}>
        Kies <b>maximaal 3</b> locaties.  
        1 keuze = <b>3</b> punten.  
        2 keuzes = <b>3</b> en <b>2</b>.  
        3 keuzes = <b>3</b>, <b>2</b>, <b>1</b>.
      </p>

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>1) Kies je top (max 3)</h2>

        {locations.length === 0 ? (
          <p>Locaties laden...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {locations.map((l) => {
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

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>2) Ken punten toe</h2>

        {selectedIds.length === 0 ? (
          <p>Kies eerst locaties hierboven.</p>
        ) : (
          <>
            {selectedLocations.map((l) => {
              const c = choices[l.id];
              const current = c?.points ?? null;

              return (
                <div key={l.id} style={{ padding: 12, border: "1px solid #eee", borderRadius: 10, marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{label(l)}</div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                    <span>Punten:</span>

                    {allowedPoints.map((p) => {
                      const pNum = p as 1 | 2 | 3;
                      return (
                        <label key={p}>
                          <input
                            type="radio"
                            name={`points-${l.id}`}
                            value={p}
                            checked={current === pNum}
                            onChange={() => setPointsWithSwap(l.id, pNum)}
                          />{" "}
                          {p}
                        </label>
                      );
                    })}
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Toelichting (optioneel)"
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                    value={c?.comment ?? ""}
                    onChange={(e) =>
                      setChoices((prev) => ({
                        ...prev,
                        [l.id]: { ...prev[l.id], comment: e.target.value },
                      }))
                    }
                  />
                </div>
              );
            })}

            <button
              onClick={submit}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #333",
                background: "white",
                cursor: "pointer",
              }}
            >
              Verstuur stem
            </button>

            {status.type !== "idle" && (
              <p style={{ marginTop: 10, color: status.type === "error" ? "#b00020" : "#1b5e20" }}>
                {status.msg}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
