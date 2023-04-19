const pattern = /\.tsl-tw\s+:is\((\.tsl-dark(?:\s+))?(.*?)\)(.*?)\s*\{/u;

const source = await Deno.readTextFile(Deno.args[0]);

const lines = source.split('\n');
const outputLines: string[] = [];

for (const line of lines) {
  const match = pattern.exec(line);

  if (match == null) {
    outputLines.push(line);
    continue;
  }

  const [, dark, utility, affix] = match;

  const patchedLine = (dark == undefined)
    ? `.tsl-tw :is(${utility})${affix}, .tsl-tw:is(${utility})${affix} {`
    : `:is(.tsl-tw .tsl-dark, .tsl-dark .tsl-tw, .tsl-tw.tsl-dark) :is(${utility})${affix}, :is(.tsl-tw .tsl-dark, .tsl-dark .tsl-tw, .tsl-tw.tsl-dark):is(${utility})${affix} {`;

  outputLines.push(patchedLine);
}

const output = outputLines.join('\n');
await Deno.writeTextFile(Deno.args[1], output);
