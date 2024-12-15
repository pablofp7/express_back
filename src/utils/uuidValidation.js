import { z } from 'zod'

const uuidSchema = z.string().uuid()

export function checkUUID(id) {
  try {
    uuidSchema.parse(id) // Valida el UUID
    return true
  }
  catch (error) {
    throw new CustomError('INVALID_UUID', {
      message: 'UUID format not valid',
      resource: 'UUID',
      operation: 'VALIDATION',
      details: error.errors[0]?.message,
    })
  }
}
