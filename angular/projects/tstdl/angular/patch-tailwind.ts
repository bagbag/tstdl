const pattern = /\.tsl-tw\s+(\.tsl-dark(?:\s+))?(.*?)\s*\{/u;

const source = await Deno.readTextFile(Deno.args[0]);

const lines = source.split('\n');
const outputLines: string[] = [];

for (const line of lines) {
  const match = pattern.exec(line);

  if (match == null) {
    outputLines.push(line);
    continue;
  }

  const [, dark, utility] = match;

  const patchedLine = (dark == undefined)
    ? `.tsl-tw ${utility}, .tsl-tw${utility} {`
    : `.tsl-dark .tsl-tw ${utility}, .tsl-dark .tsl-tw${utility}, .tsl-dark.tsl-tw${utility}, .tsl-tw .tsl-dark${utility} {`;

  outputLines.push(patchedLine);
}

const output = outputLines.join('\n');
await Deno.writeTextFile(Deno.args[1], output);
