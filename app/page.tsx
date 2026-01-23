"use client";

import { useEffect, useMemo, useState } from "react";

type Location = {
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

function label(l: Location) {
  return `${l["naam locatie"]} — ${l["naam artiest"]}`;
}

export default function Home() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [status, setStatus] = useState<{ type: "idle" | "error" | "ok" | "loading"; msg?: string }>({
    type: "idle",
  });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/locations", { cache: "no-store" });
      const json = await res.json();
      setLocations((json.locations ?? []) as Location[]);
    })();
  }, []);

  const selectedLocations = useMemo(
    () => locations.filter(l => selectedIds.includes(l.id)),
    [locations, selectedIds]
  );

  const canSelectMore = selectedIds.length < 3;

  // Alleen toegestane punten per aantal keuzes
  const allowedPoints = useMemo(() => {
    if (selectedIds.length === 1) return [3] as const;
    if (selectedIds.length === 2) return [3, 2] as const;
    return [3, 2, 1] as const;
  }, [selectedIds.length]);

  // Welke punten zijn al gebruikt
  const usedPoints = useMemo(() => {
    const pts = new Set<number>();
    for (const id of selectedIds) {
      const p = choices[id]?.points;
      if (p) pts.add(p);
    }
    return pts;
  }, [choices, selectedIds]);

  // Choices syncen + punten wissen die niet meer mogen (bij wissel 3->2 of 2->1)
  useEffect(() => {
    setChoices(prev => {
      const next: Record<number, Choice> = { ...prev };

      // ensure exists
      for (const id of selectedIds) {
        if (!next[id]) next[id] = { locationId: id, points: null, comment: "" };
      }

      // remove deselected
      for (const key of Object.keys(next)) {
        const id = Number(key);
        if (!selectedIds.includes(id)) delete next[id];
      }

      // reset disallowed points
      const allowed = new Set<number>(allowedPoints as unknown as number[]);
      for (const id of Object.keys(next).map(Number)) {
        const p = next[id]?.points;
        if (p && !allowed.has(p)) next[id] = { ...next[id], points: null };
      }

      // Auto-assign bij 1 keuze: altijd 3
      if (selectedIds.length === 1) {
        const onlyId = selectedIds[0];
        next[onlyId] = { ...next[onlyId], points: 3 };
      }

      return next;
    });
  }, [selectedIds, allowedPoints]);

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

    // ✅ max 3, maar 1 of 2 mag ook
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

    // verwachtte puntensets:
    const pts = selections
      .map(s => s.points as 1 | 2 | 3)
      .sort((a, b) => a - b)
      .join(",");

    const expected = selectedIds.length === 1 ? "3" : selectedIds.length === 2 ? "2,3" : "1,2,3";

    if (pts !== expected) {
      const human = selectedIds.length === 1 ? "3" : selectedIds.length === 2 ? "3 en 2" : "3, 2 en 1";
      setStatus({ type: "error", msg: `Gebruik de juiste punten: ${human}. Elk punt max. 1×.` });
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
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Stem: Top locaties</h1>
      <p style={{ marginTop: 0 }}>
        Kies <b>maximaal 3</b> locaties. 1 keuze = <b>3</b>. 2 keuzes = <b>3</b> en <b>2</b>. 3 keuzes = <b>3</b>, <b>2</b>, <b>1</b>.
      </p>

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>1) Kies je top (max 3)</h2>

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

                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                    <span>Punten:</span>

                    {allowedPoints.map(p => {
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

                    <span style={{ color: "#777" }}>(elk punt max. 1×)</span>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Toelichting (optioneel)"
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
                    value={c?.comment ?? ""}
                    onChange={e =>
                      setChoices(prev => ({ ...prev, [l.id]: { ...prev[l.id], comment: e.target.value } }))
                    }
                  />
                </div>
              );
            })}

            <button
              onClick={submit}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333", background: "white", cursor: "pointer" }}
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
