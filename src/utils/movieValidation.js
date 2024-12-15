import z from 'zod'
import { CustomError } from '../utils/customError.js'

const movieSchema = z.object({
  title: z.string({
    invalid_type_error: 'Movie title must be a string',
    required_error: 'Movie title is required.',
  }),
  year: z.number().int().min(1900).max(2024),
  director: z.string(),
  duration: z.number().int().positive(),
  rate: z.number().min(0).max(10).default(5),
  poster: z.string().url({
    message: 'Poster must be a valid URL',
  }),
  genre: z.array(
    z.enum([
      'Action',
      'Adventure',
      'Crime',
      'Comedy',
      'Drama',
      'Fantasy',
      'Horror',
      'Thriller',
      'Sci-Fi',
      'Porno',
      'Documentary',
      'Animation',
      'Family',
      'Musical',
      'Romance',
      'Western',
    ]),
    {
      required_error: 'Movie genre is required.',
      invalid_type_error: 'Movie genre must be an array of enum Genre',
    },
  ),
})

async function validateSchema(input, schema, resource, operation) {
  const result = schema.safeParse(input)
  if (!result.success) {
    const errors = result.error.issues.reduce((acc, issue) => {
      acc[issue.path[0]] = issue.message
      return acc
    }, {})
    throw new CustomError('INVALID_MOVIE', {
      message: 'Validation failed',
      resource,
      operation,
      details: errors,
    })
  }
  return { success: true, data: result.data }
}

export async function validateMovie(input) {
  return validateSchema(input, movieSchema, 'Movie', 'VALIDATION')
}

export async function validatePartialMovie(input) {
  return validateSchema(input, movieSchema.partial(), 'Movie', 'PARTIAL_VALIDATION')
}
