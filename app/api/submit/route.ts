import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Payload = {
  selections: Array<{
    locationId: number;
    points: 1 | 2 | 3;
    comment?: string;
  }>;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, serviceKey);

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return badRequest("Ongeldige JSON.");
  }

  const selections = body?.selections ?? [];

  if (selections.length !== 3) return badRequest("Kies precies 3 locaties.");

  const locSet = new Set(selections.map(s => s.locationId));
  if (locSet.size !== 3) return badRequest("Locaties moeten uniek zijn.");

  const pts = selections.map(s => s.points).sort().join(",");
  if (pts !== "1,2,3") return badRequest("Verdeel de punten 1,2,3 elk precies één keer.");

  const { data: sub, error: subErr } = await supabase
    .from(".from("inzendingen")")
    .insert({})
    .select("id")
    .single();

  if (subErr || !sub) {
    return NextResponse.json({ ok: false, error: subErr?.message ?? "Insert mislukt." }, { status: 500 });
  }

  const rows = selections.map(s => ({
    submission_id: sub.id,
    location_id: s.locationId,
    points: s.points,
    comment: (s.comment ?? "").trim() || null,
  }));

  const { error: voteErr } = await supabase.from("votes").insert(rows);

  if (voteErr) {
    return NextResponse.json({ ok: false, error: voteErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, submissionId: sub.id });
}

