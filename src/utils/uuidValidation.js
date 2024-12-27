import { z } from 'zod'

const uuidSchema = z.string().trim().uuid()

export async function checkUUID(id) {
  return uuidSchema.safeParse(id).success
}
