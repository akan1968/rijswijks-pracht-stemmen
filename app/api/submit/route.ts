import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

type Selection = {
  locationId: number;
  points: 1 | 2 | 3;
  comment?: string;
};

function allowedPointsForCount(count: number): number[] {
  if (count === 1) return [3];
  if (count === 2) return [3, 2];
  if (count === 3) return [3, 2, 1];
  return [];
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(url, serviceKey);

    const body = await req.json();
    const selections = (body?.selections ?? []) as Selection[];

    if (selections.length < 1 || selections.length > 3) {
      return NextResponse.json({ ok: false, error: "Kies 1, 2 of 3 locaties." }, { status: 400 });
    }

    // unieke locatieIds
    const ids = selections.map((s) => s.locationId);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      return NextResponse.json({ ok: false, error: "Je kunt niet 2× op dezelfde locatie stemmen." }, { status: 400 });
    }

    // punten-set controleren
    const expected = allowedPointsForCount(selections.length).slice().sort((a, b) => a - b).join(",");
    const actual = selections
      .map((s) => s.points)
      .slice()
      .sort((a, b) => a - b)
      .join(",");

    if (actual !== expected) {
      return NextResponse.json(
        { ok: false, error: "Puntentoekenning klopt niet (1 keuze: 3 / 2 keuzes: 3+2 / 3 keuzes: 3+2+1)." },
        { status: 400 }
      );
    }

    // Actief evenement ophalen
    const { data: evt, error: evtErr } = await supabase
      .from("evenementen")
      .select("id")
      .eq("actief", true)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (evtErr) return NextResponse.json({ ok: false, error: evtErr.message }, { status: 500 });
    if (!evt?.id) return NextResponse.json({ ok: false, error: "Geen actief evenement gevonden." }, { status: 400 });

    // ✅ stemtoken genereren (NOT NULL constraint)
    const stemtoken = crypto.randomUUID();

    // 1) inzending aanmaken
    const { data: inz, error: inzErr } = await supabase
      .from("inzendingen")
      .insert({
        evenement_id: evt.id,
        stemtoken, // <-- belangrijk
        // groep_id: null,   // alleen als groep_id inmiddels nullable is
        ingediend_op: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (inzErr) return NextResponse.json({ ok: false, error: inzErr.message }, { status: 500 });

    // 2) stemmen aanmaken
    const rows = selections.map((s) => ({
      inzending_id: inz.id,
      locatie_id: s.locationId,
      punten: s.points,
      toelichting: (s.comment ?? "").trim() || null,
    }));

    const { error: stemErr } = await supabase.from("stemmen").insert(rows);
    if (stemErr) return NextResponse.json({ ok: false, error: stemErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Onbekende fout." }, { status: 500 });
  }
}
