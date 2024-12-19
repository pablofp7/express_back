import { z } from 'zod'

const uuidSchema = z.string().uuid()

export function checkUUID(id) {
  return uuidSchema.safeParse(id).success
}
