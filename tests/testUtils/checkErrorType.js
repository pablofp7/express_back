import { ERROR_TYPES } from '../../src/errors/customError.js'

export function checkErrorType(errorType) {
  return Object.keys(ERROR_TYPES).some((category) => {
    return Object.values(ERROR_TYPES[category]).some(
      (definedError) => JSON.stringify(definedError) === JSON.stringify(errorType),
    )
  })
}
