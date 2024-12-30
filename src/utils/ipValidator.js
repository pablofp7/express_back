import { z } from 'zod'
import { isIP } from 'net'

const ipSchema = z.string().trim().refine((ip) => isIP(ip) !== 0, {
  message: 'Invalid IP address',
})

export async function checkIP(ip) {
  return ipSchema.safeParse(ip).success
}
