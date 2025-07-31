import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../../cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Bracket = 'beginner' | 'intermediate' | 'advanced' | 'expert'

const bracketRules: Record<Bracket, { level: number; count: number; next: Bracket | null }> = {
  beginner: { level: 1, count: 5, next: 'intermediate' },
  intermediate: { level: 2, count: 5, next: 'advanced' },
  advanced: { level: 3, count: 5, next: 'expert' },
  expert: { level: 0, count: 0, next: null }
}

async function recalcSkillBracket(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Bracket> {
  console.log('recalculating skill bracket function')
  // 1) fetch current bracket
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('bracket')
    .eq('id', userId)
    .single()
  if (userErr) throw userErr

  const current = user.bracket as Bracket
  const rule = bracketRules[current]
  if (!rule.next) return 'expert';

  // 2) count mastered nodes
  const { count, error: cntErr } = await supabase
    .from('user_nodes')
    .select('*', { head: true, count: 'exact' })
    .eq('user_id', userId)
    .gte('mastery', rule.level)
  if (cntErr) throw cntErr
  console.log('count of mastery: ', count);

  // 3) if they’ve hit the threshold, promote
  console.log('rule count', rule.count);
  if ((count ?? 0) >= rule.count) {
    console.log('attempting to update bracket', rule.next);
    const { error: upErr } = await supabase
      .from('users')
      .update({ bracket: rule.next })
      .eq('id', userId)
    if (upErr) { console.log(upErr) }
    return rule.next;
  }
  return current;
}

Deno.serve(async (req) => {
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


    const { data: row, error } = await supabase
      .from("user_nodes")
      .upsert(
        {
          user_id,
          node_id,
          exp: remainingExp,
          mastery: newMastery,
        },
        { onConflict: 'user_id,node_id' }
      ).single();
    if (error) {
      throw error;
    }

    let newBracket: string | null = null;
    if (gainLevels > 0) {
      newBracket = await recalcSkillBracket(supabase, user_id);
    }
    return new Response(JSON.stringify({ newExp: remainingExp, newMastery: newMastery, newBracket: newBracket }), {
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
