import z from 'zod'

const userSchema = z.object({
  username: z
    .string({
      invalid_type_error: 'Username must be a string',
      required_error: 'Username is required.',
    })
    .min(3, { message: 'Username must be at least 3 characters long.' }),

  email: z
    .string({
      invalid_type_error: 'Email must be a string',
      required_error: 'Email is required.',
    })
    .email({ message: 'Invalid email address.' })
    .optional(),

  password: z
    .string({
      invalid_type_error: 'Password must be a string',
      required_error: 'Password is required.',
    })
    .min(6, { message: 'Password must be at least 6 characters long.' }),

  age: z.number().int().positive().optional(),
})

async function validateSchema(input, schema) {
  return schema.safeParse(input).success
}

export async function validateUser(input) {
  return validateSchema(input, userSchema)
}

export async function validatePartialUser(input) {
  return validateSchema(input, userSchema.partial())
}
