import stylistic from '@stylistic/eslint-plugin'
import validErrorCodesPlugin from './myEslintRules/validErrorCodes.js' // Path to your custom rule file
import unusedImports from 'eslint-plugin-unused-imports' // Importa el plugin correctamente

export default [
  {
    files: ['**/*.js'], // Aplica esta configuración a archivos .js
    languageOptions: {
      ecmaVersion: 'latest', // Habilita ES2021+
      sourceType: 'module', // Indica que usas módulos ES6 (import/export)
      globals: {
        console: 'readonly', // Define las globales estándar de Node.js
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        Buffer: 'readonly',
        // Agrega otras globales aquí si las necesitas
      },
    },
    plugins: {
      '@stylistic': stylistic,
      'valid-error-structure': validErrorCodesPlugin, // Register the custom ESLint plugin
      'unused-imports': unusedImports, // Registra el plugin correctamente
    },
    rules: {
      ...stylistic.configs['recommended-flat'].rules,

      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'arrow-parens': ['error', 'always'],
      '@stylistic/arrow-parens': 'off',
      'eqeqeq': ['error', 'always'],
      'no-undef': 'error', // Detecta variables no definidas

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
]
