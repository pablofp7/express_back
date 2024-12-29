import stylistic from '@stylistic/eslint-plugin'
import validErrorCodesPlugin from './myEslintRules/validErrorCodes.js'
import unusedImports from 'eslint-plugin-unused-imports'

const baseConfig = {
  ignores: ['node_modules', 'dist'], // No ignores para tests
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
}

const testConfig = {
  ...baseConfig,
  files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'], // Ajusta el patrón si es necesario
  languageOptions: {
    ...baseConfig.languageOptions,
    globals: {
      ...baseConfig.languageOptions.globals,
      describe: 'readonly',
      it: 'readonly',
      before: 'readonly',
      beforeEach: 'readonly',
      after: 'readonly',
      afterEach: 'readonly',
      setImmediate: 'readonly',
    },
  },
}

export default [
  {
    ...baseConfig,
    files: ['**/*.js'], // Archivos generales
  },
  testConfig, // Configuración específica para los tests
]
