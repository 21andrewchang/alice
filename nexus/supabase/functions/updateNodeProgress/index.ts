import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../../cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // or anon, but service role if you need to upsert freely
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { node_id, exp, user_id } = await req.json();
    const { data: existing, error: selectError } = await supabase
      .from('user_nodes')
      .select('exp, mastery')
      .eq('user_id', user_id)
      .eq('node_id', node_id)
      .single()

    if (selectError) {
      throw selectError
    }

    const currentExp = existing.exp ?? 0
    const currentMastery = existing.mastery ?? 0

    const earned = exp
    const totalExp = currentExp + earned
    const gainLevels = Math.floor(totalExp / 100)
    const newMastery = Math.min(currentMastery + gainLevels, 3)
    const remainingExp = totalExp % 100

    const { data, error } = await supabase
      .from("user_nodes")
      .upsert(
        {
          user_id,
          node_id,
          exp: remainingExp,            // you’ll replace this with your sum/overflow logic
          mastery: newMastery,
        },
        { onConflict: ["user_id", "node_id"] }
      );

    if (error) {
      console.error("upsert failed:", error);
      throw error;
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("✖️ function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
