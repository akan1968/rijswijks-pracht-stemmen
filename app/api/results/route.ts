import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const requiredKey = process.env.RESULTS_VIEW_KEY;

    if (!supabaseUrl || !serviceRoleKey || !requiredKey) {
      return NextResponse.json(
        { ok: false, error: "Server mist environment variables." },
        { status: 500 }
      );
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

    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Onbekende fout" },
      { status: 500 }
    );
  }
}
