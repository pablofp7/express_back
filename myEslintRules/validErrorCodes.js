import { ERROR_TYPES } from '../src/utils/errors.js' // Adjust the path to your errors.js file

export default {
  rules: {
    'valid-error-codes': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Ensure all error codes passed to CustomError are valid',
          category: 'Best Practices',
        },
        schema: [], // No options for this rule
      },

      create(context) {
        return {
          'NewExpression[callee.name="CustomError"]'(node) {
            const codeArg = node.arguments[0] // Get the error code passed to CustomError

            if (codeArg && codeArg.type === 'Literal') {
              const errorCode = codeArg.value

              // Check if the errorCode is valid by checking against ERROR_TYPES
              if (!(errorCode in ERROR_TYPES)) {
                context.report({
                  node,
                  message: `Invalid error code "${errorCode}". Please ensure it is defined in ERROR_TYPES.`,
                })
              }
            }
          },
        }
      },
    },
  },
}
