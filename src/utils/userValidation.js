import z from 'zod'

// Esquema completo del usuario
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

async function validateSchema(input, schema, resource, operation) {
  const result = schema.safeParse(input)
  if (!result.success) {
    const errors = result.error.issues.reduce((acc, issue) => {
      acc[issue.path[0]] = issue.message
      return acc
    }, {})
    throw new CustomError('USER_VALIDATION_ERROR', {
      message: 'Validation failed',
      resource,
      operation,
      details: errors,
    })
  }
  return { success: true, data: result.data }
}

export async function validateUser(input) {
  return validateSchema(input, userSchema, 'User', 'VALIDATION')
}

export async function validatePartialUser(input) {
  return validateSchema(input, userSchema.partial(), 'User', 'PARTIAL_VALIDATION')
}
