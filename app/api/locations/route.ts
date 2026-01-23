import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(url, serviceKey);

    // pak actief evenement (als je dat veld gebruikt)
    const { data: ev, error: evErr } = await supabase
      .from("evenementen")
      .select("id")
      .eq("actief", true)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (evErr) throw evErr;

    // fallback: als er geen actief evenement is, haal alles
    const q = supabase
      .from("locaties")
      .select(`id,"naam locatie","naam artiest",wegingsfactor,evenement_id`)
      .order("id", { ascending: true });

    const { data, error } = ev?.id ? await q.eq("evenement_id", ev.id) : await q;

    if (error) throw error;

    // map naar nette keys zonder spaties (handig in React)
    const locations = (data ?? []).map((r: any) => ({
      id: r.id,
      locatie: r["naam locatie"],
      artiest: r["naam artiest"],
      wegingsfactor: r.wegingsfactor ?? 1,
      evenement_id: r.evenement_id ?? null,
    }));

    return NextResponse.json({ ok: true, locations });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
