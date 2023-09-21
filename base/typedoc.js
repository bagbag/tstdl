import { readFile } from 'node:fs/promises';

const packageJsonBytes = await readFile('package.json');
const packageJsonString = packageJsonBytes.toString('utf-8');
/**
 * @type {import("type-fest").PackageJson}
 */
const packageJson = JSON.parse(packageJsonString);

const entryPoints = Object.entries(packageJson.exports)
  .filter(([key]) => key != './tsconfig.json')
  .map(([_, value]) => `./source/${value.slice(2).slice(0, -3)}.ts`);

/**
 * @type {import('typedoc').TypeDocOptions}
 */
const config = {
  $schema: 'https://typedoc.org/schema.json',
  readme: 'README.md',
  plugin: ['typedoc-plugin-missing-exports', '@mxssfd/typedoc-theme'],
  theme: 'my-theme',
  includeVersion: true,
  out: 'dist/docs',
  entryPoints,
  excludeExternals: true,
  exclude: [
    'dist'
  ]
};


export default config;
