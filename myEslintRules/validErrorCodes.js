import { ERROR_TYPES } from '../src/utils/customError.js' // Adjust the path if necessary

export default {
  rules: {
    'valid-error-structure': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Ensure CustomError is instantiated with proper arguments',
          category: 'Best Practices',
        },
        schema: [],
        messages: {
          missingOrigError: 'The "origError" property must be present and an instance of Error.',
          invalidErrorType: 'A valid "errorType" must be passed and defined in ERROR_TYPES.',
        },
      },

      create(context) {
        // Flatten ERROR_TYPES to retrieve all valid error type references
        const validErrorTypes = Object.values(ERROR_TYPES)
          .flatMap((category) => Object.values(category))
          .map((error) => error.code)

        // Add debugging output for valid error types

        return {
          'NewExpression[callee.name="CustomError"]'(node) {
            const [arg] = node.arguments

            if (arg && arg.type === 'ObjectExpression') {
              let hasOrigError = false
              let hasValidErrorType = false

              arg.properties.forEach((property) => {
                // Check for `origError` property
                if (
                  property.key.name === 'origError'
                  && property.value.type === 'NewExpression'
                  && property.value.callee.name === 'Error'
                ) {
                  hasOrigError = true
                }

                // Check for `errorType` property and validate it
                if (property.key.name === 'errorType' && property.value.type === 'MemberExpression') {
                  let currentNode = property.value
                  const errorTypeParts = []

                  // Traverse the MemberExpression to reconstruct the full error type
                  while (currentNode.type === 'MemberExpression') {
                    errorTypeParts.unshift(currentNode.property.name) // Add property name to the front
                    currentNode = currentNode.object // Move to the object part
                  }

                  if (currentNode.type === 'Identifier' && currentNode.name === 'ERROR_TYPES') {
                    const errorTypeCode = errorTypeParts.join('_').toUpperCase() // Normalize case

                    if (validErrorTypes.includes(errorTypeCode)) {
                      hasValidErrorType = true
                    }
                  }
                }
              })

              // Report if `origError` is missing
              if (!hasOrigError) {
                context.report({
                  node,
                  messageId: 'missingOrigError',
                })
              }

              // Report if `errorType` is invalid
              if (!hasValidErrorType) {
                context.report({
                  node,
                  messageId: 'invalidErrorType',
                })
              }
            }
          },
        }
      },
    },
  },
}
