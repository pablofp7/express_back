import stylistic from '@stylistic/eslint-plugin'
import validErrorCodesPlugin from './myEslintRules/validErrorCodes.js' // Path to your custom rule file

export default [
  {
    plugins: {
      '@stylistic': stylistic,
      'valid-error-codes': validErrorCodesPlugin, // Register the custom ESLint plugin
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
      'no-unused-vars': ['error', { // Avoid unused variables
        vars: 'all',
        args: 'after-used',
        argsIgnorePattern: '^_',
      }],
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
      'valid-error-codes/valid-error-codes': 'error', // Enforce valid error codes
    },
  },
]
