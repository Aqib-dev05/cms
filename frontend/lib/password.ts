const LOWER = "abcdefghijkmnpqrstuvwxyz"; // no l / o (look-alikes)
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I / O
const DIGITS = "23456789"; // no 0 / 1
const SYMBOLS = "!@#$%&*?";

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  // rejection sampling → no modulo bias
  const limit = Math.floor(0x100000000 / max) * max;
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % max;
}

const pick = (set: string) => set[randomInt(set.length)];

/** Random initial password: at least one lower, upper, digit and symbol. Default length 12. */
export function generatePassword(length = 12): string {
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < Math.max(length, 8)) chars.push(pick(all));
  // Fisher–Yates shuffle so the guaranteed characters aren't always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
