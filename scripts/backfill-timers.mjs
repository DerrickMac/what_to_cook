/**
 * Seed `recipe_step_timers` from the "for 20 minutes" durations already written
 * into each recipe's steps, so every timer is a real, editable row.
 * Re-runnable: it clears prior source='auto' rows first. User-edited timers
 * (source='user') are never touched.
 *   node scripts/backfill-timers.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
await sb.auth.signInAnonymously();
const hh = (await sb.rpc('join_household', { invite_code_input: 'ADOBO7' })).data;

const DUR_RE = /\b(\d+(?:\.\d+)?)\s*(?:[-–]\s*(\d+(?:\.\d+)?)\s*)?(min(?:ute)?s?|hours?|hrs?)\b/i;
function stepMinutes(step) {
  const m = DUR_RE.exec(step);
  if (!m) return null;
  const lo = parseFloat(m[1]);
  const hi = m[2] ? parseFloat(m[2]) : lo;
  const isHr = /^h/i.test(m[3]);
  const mins = ((lo + hi) / 2) * (isHr ? 60 : 1);
  if (mins < 1 || mins > 240) return null;
  return Math.round(mins * 100) / 100;
}

const { data: recipes, error } = await sb
  .from('recipes')
  .select('id, instructions')
  .eq('household_id', hh);
if (error) { console.error(error.message); process.exit(1); }

const ids = recipes.map((r) => r.id);
for (let i = 0; i < ids.length; i += 100) {
  await sb.from('recipe_step_timers').delete().eq('source', 'auto').in('recipe_id', ids.slice(i, i + 100));
}

const rows = [];
for (const r of recipes) {
  const steps = (r.instructions ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
  steps.forEach((text, stepIndex) => {
    const minutes = stepMinutes(text);
    if (minutes) rows.push({ recipe_id: r.id, step_index: stepIndex, label: '', minutes, source: 'auto', position: 0 });
  });
}

for (let i = 0; i < rows.length; i += 500) {
  const { error: e } = await sb.from('recipe_step_timers').insert(rows.slice(i, i + 500));
  if (e) { console.error(e.message); process.exit(1); }
}

console.log(`recipes: ${recipes.length}  |  auto timers seeded: ${rows.length}`);
await sb.auth.signOut();
