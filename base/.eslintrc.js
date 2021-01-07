module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  extends: [
    'eslint:all',
    'plugin:@typescript-eslint/all'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    globalThis: false
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    project: 'tsconfig.json'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    '@typescript-eslint/brace-style': ['error', 'stroustrup', { allowSingleLine: true }],
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/indent': 'off',
    '@typescript-eslint/init-declarations': 'off',
    '@typescript-eslint/lines-between-class-members': ['warn', 'always', { exceptAfterSingleLine: true }],
    '@typescript-eslint/method-signature-style': 'off',
    '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true, ignoreVoidOperator: true }],
    '@typescript-eslint/no-empty-interface': ['warn', { 'allowSingleExtends': true }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-extra-parens': 'off',
    '@typescript-eslint/no-inferrable-types': ['warn', { ignoreParameters: true, ignoreProperties: true }],
    '@typescript-eslint/no-invalid-void-type': 'off',
    '@typescript-eslint/no-magic-numbers': ['off', { ignoreNumericLiteralTypes: true, ignoreEnums: true, ignore: [0, 1, 128, 256, 512, 1024, 2048, 4096], ignoreArrayIndexes: true }],
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-type-alias': 'off',
    '@typescript-eslint/no-unnecessary-condition': ['error', { allowConstantLoopConditions: true }],
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unused-vars-experimental': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    '@typescript-eslint/prefer-readonly-parameter-types': ['off', { checkParameterProperties: false }],
    '@typescript-eslint/quotes': ['warn', 'single'],
    '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    '@typescript-eslint/sort-type-union-intersection-members': 'off',
    '@typescript-eslint/space-before-function-paren': ['warn', { anonymous: 'never', named: 'never', asyncArrow: 'always' }],
    '@typescript-eslint/typedef': 'off',
    'array-bracket-newline': ['error', 'consistent'],
    'array-element-newline': ['error', 'consistent'],
    'camelcase': 'off',
    'capitalized-comments': ['warn', 'never'],
    'class-methods-use-this': 'off',
    'dot-location': ['error', 'property'],
    'eqeqeq': 'off',
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
    'function-call-argument-newline': ['warn', 'consistent'],
    'generator-star-spacing': ['off', { before: false, after: true }],
    'id-length': 'off',
    'indent': 'off',
    'init-declarations': 'off',
    'line-comment-position': 'off',
    'linebreak-style': ['error', 'unix'],
    'lines-between-class-members': 'off',
    'max-len': ['off', { code: 150 }],
    'max-lines': 'off',
    'max-params': 'off',
    'max-statements': ['warn', 20],
    'multiline-ternary': 'off',
    'new-cap': 'off',
    'newline-per-chained-call': 'off',
    'no-await-in-loop': 'off',
    'no-case-declarations': 'off',
    'no-constant-condition': 'off',
    'no-continue': 'off',
    'no-duplicate-imports': 'off',
    'no-inline-comments': 'off',
    'no-negated-condition': 'off',
    'no-nested-ternary': 'off',
    'no-plusplus': ['off', { allowForLoopAfterthoughts: true }],
    'no-ternary': 'off',
    'no-undefined': 'off',
    'no-underscore-dangle': 'off',
    'no-void': ['error', { allowAsStatement: true }],
    'object-curly-spacing': ['warn', 'always'],
    'object-property-newline': ['warn', { allowAllPropertiesOnSameLine: true }],
    'one-var': ['error', 'never'],
    'operator-linebreak': ['warn', 'before'],
    'padded-blocks': ['error', 'never'],
    'prefer-destructuring': 'off',
    'quote-props': ['error', 'as-needed'],
    'sort-imports': ['off', { ignoreCase: true }],
    'sort-keys': 'off',
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        selector: 'default',
        format: ['camelCase'],
        leadingUnderscore: 'allow'
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE']
      },
      {
        selector: 'enumMember',
        format: ['PascalCase']
      },
      {
        selector: 'typeLike',
        format: ['PascalCase']
      }
    ],
    '@typescript-eslint/member-delimiter-style': ['error', {
      multiline: {
        delimiter: 'comma',
        requireLast: false
      },
      singleline: {
        delimiter: 'comma',
        requireLast: false
      },
      overrides: {
        interface: {
          multiline: {
            delimiter: 'semi',
            requireLast: true
          }
        }
      }
    }],
    '@typescript-eslint/member-ordering': ['warn', {
      default: [
        'signature',

        'private-static-field',
        'protected-static-field',
        'public-static-field',

        'private-instance-field',
        'protected-instance-field',
        'public-instance-field',

        'private-abstract-field',
        'protected-abstract-field',
        'public-abstract-field',

        'private-field',
        'protected-field',
        'public-field',

        'static-field',
        'instance-field',
        'abstract-field',

        'field',

        'constructor',

        'public-static-method',
        'protected-static-method',
        'private-static-method',

        'public-instance-method',
        'protected-instance-method',
        'private-instance-method',

        'public-abstract-method',
        'protected-abstract-method',
        'private-abstract-method',

        'public-method',
        'protected-method',
        'private-method',

        'static-method',
        'instance-method',
        'abstract-method',

        'method'
      ]
    }]
  }
};
