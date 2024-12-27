import { ERROR_TYPES } from '../../src/errors/customError.js'

/**
 * Check if the given errorType exists in ERROR_TYPES.
 *
 * @param {Object} errorType - The errorType object to search for.
 * @returns {boolean} - True if the errorType exists, false otherwise.
 */
export function checkErrorType(errorType) {
  return Object.keys(ERROR_TYPES).some((category) => {
    return Object.values(ERROR_TYPES[category]).some(
      (definedError) => JSON.stringify(definedError) === JSON.stringify(errorType),
    )
  })
}
