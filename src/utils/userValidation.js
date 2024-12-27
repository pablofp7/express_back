import z from 'zod'
import validator from 'validator'

const userSchema = z.object({
  username: z.string({
    invalid_type_error: 'Username must be a string',
    required_error: 'Username is required.',
  }).trim().min(3, { message: 'Username must be at least 3 characters long.' }).transform((val) => validator.escape(val)),
  email: z.string({
    invalid_type_error: 'Email must be a string',
    required_error: 'Email is required.',
  }).email({ message: 'Invalid email address.' }).optional().transform((val) => val?.toLowerCase()),
  password: z.string({
    invalid_type_error: 'Password must be a string',
    required_error: 'Password is required.',
  }).min(6, { message: 'Password must be at least 6 characters long.' }),
  age: z.number().int().positive().optional(),
})

export async function validateUser(input) {
  return userSchema.safeParse(input).success
}

export async function validatePartialUser(input) {
  return userSchema.partial().safeParse(input).success
}
