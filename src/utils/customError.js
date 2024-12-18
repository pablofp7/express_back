import { ERROR_TYPES } from './errors.js'

export class CustomError extends Error {
  constructor(origError, { code, message, status, ...additionalFields } = {}) {
    if (!origError) {
      throw new Error('The "origError" parameter is required to create a CustomError.')
    }

    // Determina el tipo de error a usar basado en el código proporcionado (code):
    // - Si 'code' está definido y existe en ERROR_TYPES, se utiliza el error correspondiente.
    // - Si 'code' está definido pero no existe en ERROR_TYPES, se usa el error genérico SERVER_ERROR como respaldo.
    // - Si 'code' no está definido, también se asigna el error genérico SERVER_ERROR como valor por defecto.
    // Esto asegura que siempre se asigne un tipo de error válido, evitando fallos inesperados.

    const errorType = code ? ERROR_TYPES[code] || ERROR_TYPES.general.SERVER_ERROR : ERROR_TYPES.general.SERVER_ERROR

    // Usa el mensaje proporcionado o el predefinido
    super(message || errorType.message)

    // Asigna propiedades principales
    this.code = code || errorType.code
    this.status = status || errorType.statusCode

    Object.assign(this, additionalFields)

    if (origError.stack) {
      this.stack = origError.stack
    }
  }
}
