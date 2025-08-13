import { exists } from 'jsr:@std/fs';
import { join } from 'jsr:@std/path';

import packageJson from './package.json' with { type: 'json' };

const allModules = Object.keys(packageJson.exports).map((key) => key.slice(2)).filter((key) => (key.length > 0) && !key.endsWith('json') && !key.endsWith('js'));

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// List of module directories to process, relative to the project root.
const MODULE_SUBDIRS: string[] = [
  'ai',
  'authentication',
  'browser',
  'enumeration',
  'errors',
  'http',
  'injector',
  'logger',
  'message-bus',
  'module',
  'object-storage',
  'orm',
  'password',
  'pdf',
  'process',
  'queue',
  'schema',
  'sse',
  'text',
  'types',
  'utils',
];

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

const exampleSourceCode1 = await packDirectoryWithRepomix(`./source/document-management`);
const exampleSourceCode2 = await Deno.readTextFile('./tstdl-features.xml');

const exampleSourceCode = [exampleSourceCode1, exampleSourceCode2].join('\n\n---\n\n');

// --- HELPER FUNCTIONS ---

/**
 * Packs a directory's contents into a single string using the `repomix` CLI tool.
 * @param dirPath The path to the directory to pack.
 * @returns The packed content as a string.
 */
async function packDirectoryWithRepomix(dirPath: string): Promise<string> {
  console.log(`  📦 Packing directory with repomix...`);
  const command = new Deno.Command('repomix', {
    args: ['--style', 'markdown', '--ignore', 'README.md', '-o', '-', dirPath],
    stdout: 'piped',
    stderr: 'piped',
  });

  const { code, stdout, stderr } = await command.output();

  if (code !== 0) {
    const errorOutput = new TextDecoder().decode(stderr);
    throw new Error(
      `repomix failed with exit code ${code}:\n${errorOutput}\nIs 'repomix' installed and in your PATH?`,
    );
  }

  return new TextDecoder().decode(stdout);
}

/**
 * Reads the content of an existing README.md file.
 * @param readmePath The full path to the README.md file.
 * @returns The content of the file, or null if it doesn't exist.
 */
async function getExistingReadme(readmePath: string): Promise<string | null> {
  if (await exists(readmePath)) {
    console.log('  📄 Found existing README.md.');
    return await Deno.readTextFile(readmePath);
  }
  console.log('  📄 No existing README.md found.');
  return null;
}

/**
 * Builds the prompt for the Gemini API based on whether a README already exists.
 * @param packedCode The code context from repomix.
 * @param existingReadme The content of the existing README, or null.
 * @returns The complete prompt string.
 */
function buildPrompt(module: string, packedCode: string, existingReadme: string | null): string {
  const baseInstruction = `
You are an expert software developer creating high-quality, developer-focused documentation.
The output must be ONLY the raw Markdown content for the README.md file. Do not include any surrounding text, explanations, or code fences like \`\`\`markdown.

The README should include:
- A clear and concise title and a short description of the module's purpose.
- A "Table of Contents" section for easy navigation.
- A "Features" section if applicable.
- A "Core Concepts" section explaining the main ideas and architecture.
- A "Usage" section with clear code examples.
- An "API Summary" section briefly listing the main exported functions/classes. Include their arguments, return type and a short description. Format as a markdown table.

Study the example usage source code provided to understand how the module is typically used.

Use package import statements instead of relative paths in your examples:
Example: \`import { SomeService } from '@tstdl/base/some-module';\` instead of \`import { FooService } from '#/some-module/index.js';\`

Use generic examples like User, Car, Pet, Product, etc. instead of the specific ones from the example source code.

Available modules to import from: ${allModules.join(', ')}
`.trim();

  if (existingReadme) {
    // --- UPDATE PROMPT ---
    return `
${baseInstruction}

Your task is to UPDATE and IMPROVE an existing README.md file for the TypeScript ${module} module based on its source code.
Make sure the README is accurate, reflects any new features or changes, and follows best practices for developer documentation.
You can add, remove, or rewrite sections as needed for clarity and completeness.

**EXAMPLE USAGE SOURCE CODE:**
  \`\`\`markdown
${exampleSourceCode}
\`\`\`

**MODULE SOURCE CODE:**
\`\`\`markdown
${packedCode}
\`\`\`

**EXISTING README.MD:**
\`\`\`markdown
${existingReadme}
\`\`\`

Now, provide the complete, final, and updated README.md content.
`.trim();
  }
  else {
    // --- GENERATE NEW PROMPT ---
    return `
${baseInstruction}

Your task is to GENERATE a new, comprehensive, developer-focused README.md file for a TypeScript module based on its source code.

**EXAMPLE USAGE SOURCE CODE:**
\`\`\`markdown
${exampleSourceCode}
\`\`\`

**MODULE SOURCE CODE:**
\`\`\`markdown
${packedCode}
\`\`\`

Now, generate the complete README.md content.
`.trim();
  }
}

/**
 * Calls the Gemini API to generate or update the README content.
 * @param prompt The prompt to send to the API.
 * @returns The Markdown content from the API response.
 */
async function generateReadmeContent(prompt: string): Promise<string> {
  console.log('  🧠 Calling Gemini API...');
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini API request failed: ${response.status} ${response.statusText}\n${errorBody}`,
    );
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    console.log('content: ', content);
    throw new Error('Failed to extract content from Gemini API response.');
  }

  console.log('  ✅ Successfully received response from Gemini.');
  return content.trim();
}

// --- MAIN EXECUTION ---

async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ ERROR: GEMINI_API_KEY not found in environment variables.');
    Deno.exit(1);
  }

  // Check for the --skip-existing flag
  const skipExisting = Deno.args.includes('--skip-existing');

  if (skipExisting) {
    console.log('🚀 Starting README generation process... (Mode: New files only)');
  }
  else {
    console.log('🚀 Starting README generation process... (Mode: Update all files)');
  }

  for (const module of MODULE_SUBDIRS) {
    const dir = `source/${module}`;
    const modulePath = join(Deno.cwd(), dir);
    const readmePath = join(modulePath, 'README.md');
    console.log(`\nProcessing module: ${module}`);

    // If the flag is set and the README exists, skip this module
    if (skipExisting && (await exists(readmePath))) {
      console.log(`  ⏩ Skipping module as README.md already exists.`);
      continue;
    }

    try {
      // 1. Pack the directory
      const packedCode = await packDirectoryWithRepomix(modulePath);

      // 2. Check for an existing README
      const existingReadme = await getExistingReadme(readmePath);

      // 3. Build the appropriate prompt
      const prompt = buildPrompt(module, packedCode, existingReadme);

      // 4. Call Gemini API
      const newReadmeContent = await generateReadmeContent(prompt);

      // 5. Write the new/updated README.md file
      await Deno.writeTextFile(readmePath, newReadmeContent);
      console.log(`  💾 Successfully wrote README.md to ${readmePath}`);
    }
    catch (error) {
      console.error(`❌ Failed to process directory ${dir}:`, error.message);
    }
  }

  console.log('\n✨ All modules processed!');
}

if (import.meta.main) {
  await main();
}
