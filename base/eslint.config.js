import stylistic from '@stylistic/eslint-plugin';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'] },
  { ignores: ['**/dist/'] },
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js']
        }
      },
      globals: { ...globals.browser, ...globals.node }
    }
  },
  stylistic.configs.customize({
    semi: true,
    arrowParens: true,
    commaDangle: 'never'
  }),
  {
    rules: {
      'prefer-named-capture-group': ['warn']
    }
  },
  {
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      ...tseslint.configs['strict-type-checked'].rules,
      ...tseslint.configs['stylistic-type-checked'].rules,
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports', disallowTypeAnnotations: false }],
      '@typescript-eslint/no-confusing-void-expression': ['warn', { ignoreArrowShorthand: true, ignoreVoidOperator: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-inferrable-types': ['warn', { ignoreParameters: true, ignoreProperties: true }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-condition': ['warn', { allowConstantLoopConditions: 'only-allowed-literals', checkTypePredicates: true }],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/restrict-template-expressions': ['warn', { allowNumber: true, allowBoolean: true, allowNullish: true }]
    }
  },
  {
    rules: {
      '@stylistic/member-delimiter-style': ['warn', {
        multiline: { delimiter: 'comma', requireLast: false },
        singleline: { delimiter: 'comma', requireLast: false },
        overrides: {
          interface: {
            multiline: { delimiter: 'semi', requireLast: true },
            singleline: { delimiter: 'semi', requireLast: true }
          }
        }
      }],
      '@stylistic/yield-star-spacing': ['error', 'after'],
      '@stylistic/indent': 'off'
    }
  }
];
