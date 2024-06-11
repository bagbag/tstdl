const pattern = /\.tsl-tw\s+:is\((\.tsl-dark(?:\s+))?(.*?)\)(.*?)\s*\{/u;

const baseStylesFile = Deno.args[0] as string;
const tailwindStylesFile = Deno.args[1] as string;
const outputStylesFile = Deno.args[2] as string;

const baseStyles = await Deno.readTextFile(baseStylesFile);
const tailwindStyles = await Deno.readTextFile(tailwindStylesFile);

const patchedTailwindStyles = patchTailwindStyles(tailwindStyles);

const output = `
@layer tstdl.base {
${baseStyles}

${patchedTailwindStyles}
}
`.trim();

await Deno.writeTextFile(outputStylesFile, output);


function patchTailwindStyles(styles: string): string {
  const lines = styles.split('\n');
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

  return outputLines.join('\n');
}
