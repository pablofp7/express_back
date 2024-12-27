import { z } from 'zod'

const uuidSchema = z.string().trim().uuid()

export async function checkUUID(id) {
  const result = uuidSchema.safeParse(id)
  return result.success
}
