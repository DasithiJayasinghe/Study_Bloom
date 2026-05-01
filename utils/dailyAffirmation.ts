import { localDateKey } from '@/utils/localDateKey';

/** All affirmations including the original Blossom line — order here is only the input to shuffle. */
const RAW_AFFIRMATIONS: string[] = [
  '\u201CYou are capable of amazing things. Bloom at your own pace 🌸\u201D',
  '\u201CGrow quietly, roots first, then everything else 🌸\u201D',
  '\u201CYou don\u2019t have to rush what\u2019s meant to unfold 🌸\u201D',
  '\u201CSmall progress is still progress. Keep going 🌸\u201D',
  '\u201CBecome who you needed when things felt heavy 🌸\u201D',
  '\u201CNot every day has to be perfect to be meaningful 🌸\u201D',
  '\u201CYou\u2019re allowed to take your time becoming yourself 🌸\u201D',
  '\u201CYou\u2019re growing, even when it feels slow 🌸\u201D',
  '\u201CKeep showing up, that\u2019s where change begins 🌸\u201D',
  '\u201CYou are a work in progress, not a problem to fix 🌸\u201D',
  '\u201CYou don\u2019t need permission to evolve 🌸\u201D',
];

/** Stable pseudo-shuffle so the sequence isn\u2019t alphabetical but is identical for every user/session. */
function shuffleDeterministic<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const CYCLE = shuffleDeterministic(RAW_AFFIRMATIONS, 0xb1065d);

function dayNumberFromKey(dk: string): number | null {
  const parts = dk.split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, mo, d] = parts;
  const localMidnight = new Date(y, mo - 1, d);
  return Math.floor(localMidnight.getTime() / 86400000);
}

/**
 * One affirmation per local calendar day, advancing through a full shuffled cycle
 * before any quote repeats (cycle length = number of quotes).
 */
export function getAffirmationForDateKey(dk: string): string {
  const n = dayNumberFromKey(dk);
  if (n === null) return RAW_AFFIRMATIONS[0];
  const i = ((n % CYCLE.length) + CYCLE.length) % CYCLE.length;
  return CYCLE[i];
}

/** Today\u2019s device-local affirmation (Blossom Routine home). */
export function getDailyAffirmationToday(): string {
  return getAffirmationForDateKey(localDateKey());
}
