import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

type Selection = { locationId: number; points: 1 | 2 | 3; comment?: string };

function expectedPoints(count: number) {
  if (count === 1) return [3];
  if (count === 2) return [2, 3];
  return [1, 2, 3];
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

    // unieke locatie_ids
    const ids = selections.map(s => s.locationId);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json({ ok: false, error: "Je mag per locatie maar 1× stemmen." }, { status: 400 });
    }

    // punten validatie
    const pts = selections.map(s => s.points).sort((a, b) => a - b);
    const exp = expectedPoints(selections.length);
    if (pts.join(",") !== exp.join(",")) {
      const human = selections.length === 1 ? "3" : selections.length === 2 ? "3 en 2" : "3, 2 en 1";
      return NextResponse.json(
        { ok: false, error: `Gebruik de juiste punten: ${human}. Elk punt maar 1×.` },
        { status: 400 }
      );
    }

    // actief evenement
    const { data: ev, error: evErr } = await supabase
      .from("evenementen")
      .select("id")
      .eq("actief", true)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (evErr) throw evErr;
    if (!ev?.id) {
      return NextResponse.json({ ok: false, error: "Geen actief evenement gevonden." }, { status: 500 });
    }

    // maak inzending
    const stemtoken = crypto.randomUUID();
    const { data: inz, error: inzErr } = await supabase
      .from("inzendingen")
      .insert({
        evenement_id: ev.id,
        groep_id: null, // later gaan we dit gebruiken
        stemtoken,
        ingediend_op: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (inzErr) throw inzErr;

    // maak stemmen
    const rows = selections.map(s => ({
      inzending_id: inz.id,
      locatie_id: s.locationId,
      punten: s.points,
      toelichting: (s.comment ?? "").trim() || null,
    }));

    const { error: stErr } = await supabase.from("stemmen").insert(rows);
    if (stErr) throw stErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
