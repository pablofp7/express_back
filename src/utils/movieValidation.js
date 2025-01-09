import z from 'zod'
import validator from 'validator'

const movieSchema = z.object({
  title: z.string({
    invalid_type_error: 'Movie title must be a string',
    required_error: 'Movie title is required.',
  })
    .trim()
    .min(1, { message: 'Movie title cannot be empty.' })
    .transform((val) => validator.escape(val)),
  year: z.number().int().min(1900).max(2024),
  director: z.string().trim().transform((val) => validator.escape(val)),
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

export async function validateMovie(input) {
  const result = movieSchema.safeParse(input)
  return result.success
}

export async function validatePartialMovie(input) {
  const result = movieSchema.partial().safeParse(input)
  return result.success
}
