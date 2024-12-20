import { ERROR_TYPES } from '../src/utils/customError.js' // Adjust the path if necessary

const flattenErrorPaths = (errorTypes) => {
  const paths = []

  // Recorre cada categoría principal (auth, user, etc.)
  Object.entries(errorTypes).forEach(([category, errors]) => {
    // Recorre cada error dentro de la categoría
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
        // Flatten ERROR_TYPES to retrieve all valid error type references
        const errorPaths = flattenErrorPaths(ERROR_TYPES)

        // Add debugging output for valid error types

        return {
          'NewExpression[callee.name="CustomError"]'(node) {
            const [arg] = node.arguments

            if (arg && arg.type === 'ObjectExpression') {
              let hasOrigError = false
              let hasValidErrorType = false

              arg.properties.forEach((property) => {
                if (property.key.name === 'origError') {
                  hasOrigError = true // Solo valida que la propiedad exista
                }

                // Check for `errorType` property and validate it
                if (property.key.name === 'errorType' && property.value.type === 'MemberExpression') {
                  let currentNode = property.value
                  const parts = []

                  // Reconstruir el path completo
                  while (currentNode.type === 'MemberExpression') {
                    parts.unshift(currentNode.property.name)
                    currentNode = currentNode.object
                  }

                  if (currentNode.type === 'Identifier' && currentNode.name === 'ERROR_TYPES') {
                    // Añadir ERROR_TYPES al inicio
                    parts.unshift('ERROR_TYPES')

                    // Construir el path completo
                    const fullPath = parts.join('.')

                    // console.log(`Checking path: ${fullPath}`)
                    if (errorPaths.includes(fullPath)) {
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
