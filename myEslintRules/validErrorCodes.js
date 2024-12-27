import { ERROR_TYPES } from '../src/errors/customError.js'

const flattenErrorPaths = (errorTypes) => {
  const paths = []

  Object.entries(errorTypes).forEach(([category, errors]) => {
    Object.keys(errors).forEach((errorKey) => {
      paths.push(`ERROR_TYPES.${category}.${errorKey}`)
    })
  })

  return paths
}

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
        const errorPaths = flattenErrorPaths(ERROR_TYPES)

        return {
          'NewExpression[callee.name="CustomError"]'(node) {
            const [arg] = node.arguments

            if (arg && arg.type === 'ObjectExpression') {
              let hasOrigError = false
              let hasValidErrorType = false

              arg.properties.forEach((property) => {
                if (property.key.name === 'origError') {
                  hasOrigError = true
                }

                if (property.key.name === 'errorType' && property.value.type === 'MemberExpression') {
                  let currentNode = property.value
                  const parts = []

                  while (currentNode.type === 'MemberExpression') {
                    parts.unshift(currentNode.property.name)
                    currentNode = currentNode.object
                  }

                  if (currentNode.type === 'Identifier' && currentNode.name === 'ERROR_TYPES') {
                    parts.unshift('ERROR_TYPES')

                    const fullPath = parts.join('.')

                    if (errorPaths.includes(fullPath)) {
                      hasValidErrorType = true
                    }
                  }
                }
              })

              if (!hasOrigError) {
                context.report({
                  node,
                  messageId: 'missingOrigError',
                })
              }

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
