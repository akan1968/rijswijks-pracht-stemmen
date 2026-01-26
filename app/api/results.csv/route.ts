
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  // CSV: quotes verdubbelen, veld tussen quotes
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const requiredKey = process.env.RESULTS_VIEW_KEY;

    if (!supabaseUrl || !serviceRoleKey || !requiredKey) {
      return NextResponse.json({ ok: false, error: "Server mist environment variables." }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const providedKey = searchParams.get("key") ?? "";

    if (providedKey !== requiredKey) {
      return NextResponse.json({ ok: false, error: "Geen toegang." }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("v_uitslag_met_toelichting")
      .select("*")
      .order("positie", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as any[];

    const header = [
      "positie",
      "locatie_id",
      "locatie",
      "artiest",
      "wegingsfactor",
      "stemmen_aantal",
      "punten_totaal",
      "aantal_3",
      "aantal_2",
      "aantal_1",
      "toelichting_bundel",
    ];

    const lines: string[] = [];
    lines.push(header.map(csvEscape).join(","));

    for (const r of rows) {
      lines.push(
        [
          r.posities ?? r.positie,
          r.locatie_id,
          r.locatie,
          r.artiest,
          r.wegingsfactor,
          r.stemmen_aantal,
          r.punten_totaal,
          r.aantal_3,
          r.aantal_2,
          r.aantal_1,
          r.toelichting_bundel ?? "",
        ].map(csvEscape).join(",")
      );
    }

    const csv = lines.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="uitslag.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Onbekende fout" }, { status: 500 });
  }
}

