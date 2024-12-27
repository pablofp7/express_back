import stylistic from '@stylistic/eslint-plugin'
import validErrorCodesPlugin from './myEslintRules/validErrorCodes.js'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  {

    files: ['**/*.js'],
    ignores: ['node_modules', 'dist', 'tests/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        Buffer: 'readonly',

      },
    },
    plugins: {
      '@stylistic': stylistic,
      'valid-error-structure': validErrorCodesPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...stylistic.configs['recommended-flat'].rules,

      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'arrow-parens': ['error', 'always'],
      '@stylistic/arrow-parens': 'off',
      'eqeqeq': ['error', 'always'],
      'no-undef': 'error',

      'no-unused-vars': 'off',
      'unused-imports/no-unused-vars': ['error', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-duplicate-imports': 'error',
      'no-shadow': 'error',
      'max-len': ['error', {
        code: 300,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: false,
        ignoreTemplateLiterals: false,
        ignoreRegExpLiterals: true,
      }],
      'prefer-template': 'error',

      'valid-error-structure/valid-error-structure': 'error',
    },
  },

  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        beforeEach: 'readonly',
        after: 'readonly',
        afterEach: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        Buffer: 'readonly',
        setImmediate: 'readonly',
      },
    },
    plugins: {
      '@stylistic': stylistic,
      'valid-error-structure': validErrorCodesPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...stylistic.configs['recommended-flat'].rules,
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'arrow-parens': ['error', 'always'],
      '@stylistic/arrow-parens': 'off',
      'eqeqeq': ['error', 'always'],
      'no-undef': 'error',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-vars': ['error', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-duplicate-imports': 'error',
      'no-shadow': 'error',
      'max-len': ['error', {
        code: 300,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: false,
        ignoreTemplateLiterals: false,
        ignoreRegExpLiterals: true,
      }],
      'prefer-template': 'error',
      'valid-error-structure/valid-error-structure': 'error',

      'no-unused-expressions': 'off',
    },
  },
]
