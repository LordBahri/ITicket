import crypto from "crypto";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const ALL = UPPER + LOWER + DIGITS;

function pick(charset: string): string {
  return charset[crypto.randomInt(charset.length)];
}

export function generatePassword(length = 12): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  for (let i = chars.length; i < length; i++) {
    chars.push(pick(ALL));
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
