import { z } from 'zod'

const uuidSchema = z.string().uuid()

export async function checkUUID(id) {
  return uuidSchema.safeParse(id).success
}
