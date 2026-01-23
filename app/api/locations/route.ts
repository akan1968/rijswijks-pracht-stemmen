import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, serviceKey);

  // alleen locaties van het actieve event
  const { data: evt } = await supabase
    .from("evenementen")
    .select("id")
    .eq("actief", true)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!evt?.id) {
    return NextResponse.json({ ok: true, locations: [] });
  }

  const { data, error } = await supabase
    .from("locaties")
    .select('id,"naam locatie","naam artiest",wegingsfactor')
    .eq("evenement_id", evt.id)
    .order("id");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, locations: data ?? [] });
}
