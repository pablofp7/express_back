import stylistic from '@stylistic/eslint-plugin'
import validErrorCodesPlugin from './myEslintRules/validErrorCodes.js' // Path to your custom rule file
import unusedImports from 'eslint-plugin-unused-imports' // Importa el plugin correctamente

export default [
  {
    plugins: {
      '@stylistic': stylistic,
      'valid-error-structure': validErrorCodesPlugin, // Register the custom ESLint plugin
      'unused-imports': unusedImports, // Registra el plugin correctamente
    },
    rules: {
      // Include all Stylistic JS recommended rules
      ...stylistic.configs['recommended-flat'].rules,

      // General JavaScript best practices
      'prefer-const': 'error', // Prefer const for variables never reassigned
      'no-var': 'error', // Disallow var declarations
      'object-shorthand': ['error', 'always'], // Use shorthand for object methods and properties
      'arrow-parens': ['error', 'always'], // Enforce parentheses for arrow functions
      '@stylistic/arrow-parens': 'off', // Disable conflicting Stylistic-specific rule

      // Error prevention
      'eqeqeq': ['error', 'always'], // Enforce strict equality

      // Use eslint-plugin-unused-imports to handle unused variables and imports
      'no-unused-vars': 'off', // Disable the default rule
      'unused-imports/no-unused-vars': ['error', {
        vars: 'all',
        varsIgnorePattern: '^_', // Ignorar variables que comiencen con "_"
        args: 'after-used',
        argsIgnorePattern: '^_', // Ignorar argumentos que comiencen con "_"
        caughtErrors: 'all', // Ignorar errores en bloques catch
        caughtErrorsIgnorePattern: '^_', // Ignorar errores en catch que comiencen con "_"
      }],

      // Other general best practices
      'no-duplicate-imports': 'error', // Disallow duplicate imports
      'no-shadow': 'error', // Prevent shadowing of variables in the outer scope

      // Line length and formatting
      'max-len': ['error', {
        code: 300, // Max characters per line
        ignoreComments: true, // Ignore long comments
        ignoreUrls: true, // Ignore long URLs
        ignoreStrings: false, // Enforce split strings
        ignoreTemplateLiterals: false, // Enforce split template literals
        ignoreRegExpLiterals: true, // Ignore long regex patterns
      }],
      'prefer-template': 'error', // Enforce using template literals

      // Custom error code validation rule
      'valid-error-structure/valid-error-structure': 'error', // Enforce valid error codes
    },
  },
]
