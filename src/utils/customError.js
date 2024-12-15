import { ERROR_TYPES } from './errors.js'

export class CustomError extends Error {
  constructor(code, details = {}) {
    const errorType = ERROR_TYPES[code] || ERROR_TYPES.SERVER_ERROR
    super(errorType.message)
    this.code = errorType.code
    this.status = errorType.statusCode
    this.details = details // Información adicional (opcional)
  }
}
