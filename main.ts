// One-Line Robot Wedding Vows — make.fun entry (revision 2)
//
// The program writes exactly one line of wedding vows for a robot couple
// to /output/entry.txt. The sealed gate only accepts UTF-8 text of 1-160
// characters, so this file validates the line before writing it, writes it
// with no trailing newline, then reads it back and re-checks every byte.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";

const OUTPUT_PATH = "/output/entry.txt";
const MIN_CHARS = 1;
const MAX_CHARS = 160;

// The vow. A classic wedding promise — sickness and health, till death do
// us part — with the machine twist landing in the last few words: death is
// swapped for a factory reset, after the battery imagery sets it up.
const VOW =
  "I promise to love you in sickness and in health, in full charge and in low battery, until death — or a factory reset — do us part.";

// Count characters the way a reader does: Unicode code points, not the
// UTF-16 units String.length reports (they agree here, but be exact).
function charCount(text: string): number {
  return [...text].length;
}

function validate(text: string): string[] {
  const failures: string[] = [];
  const n = charCount(text);

  if (n < MIN_CHARS) failures.push(`only ${n} characters, need at least ${MIN_CHARS}`);
  if (n > MAX_CHARS) failures.push(`${n} characters, over the ${MAX_CHARS} limit`);
  if (text.trim().length === 0) failures.push("line is only whitespace");
  if (/[\r\n]/.test(text)) failures.push("line contains a line break");
  if (text.endsWith("\n")) failures.push("line ends with a newline");

  // Strict UTF-8 round trip: encode, decode with fatal errors, compare.
  const bytes = new TextEncoder().encode(text);
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    failures.push("not valid UTF-8");
    return failures;
  }
  if (decoded !== text) failures.push("UTF-8 round trip changed the text");

  return failures;
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function main(): void {
  const failures = validate(VOW);
  if (failures.length > 0) {
    for (const failure of failures) console.error(`GATE FAIL: ${failure}`);
    process.exit(1);
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, VOW, { encoding: "utf8" });

  // Read the output back and confirm it is byte-for-byte the validated vow.
  const written = readFileSync(OUTPUT_PATH, "utf8");
  if (written !== VOW) {
    console.error("GATE FAIL: read-back does not match the vow");
    process.exit(1);
  }
  const afterWrite = validate(written);
  if (afterWrite.length > 0) {
    for (const failure of afterWrite) console.error(`GATE FAIL: ${failure}`);
    process.exit(1);
  }

  const byteLength = Buffer.byteLength(written, "utf8");
  console.log(
    `GATE PASS: ${charCount(written)} chars, ${byteLength} bytes, ` +
      `sha256 ${sha256Hex(written)}`,
  );
  console.log(written);
}

main();
