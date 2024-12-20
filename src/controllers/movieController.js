import { validateMovie, validatePartialMovie } from '../utils/movieValidation.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ERROR_TYPES, CustomError } from '../utils/customError.js'
import { checkUUID } from '../utils/uuidValidation.js'

export class MovieController {
  constructor({ movieModel }) {
    this.movieModel = movieModel
  }

  getAll = asyncHandler(async (req, res) => {
    const { genre } = req.query
    console.log('Solicitadas todas las películas filtradas por género: ', genre)
    const movies = await this.movieModel.getAll({ genre })

    console.log('Devolviendo las películas: ')
    res.status(200).json(movies)
  })

  getById = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!await checkUUID(id)) {
      throw new CustomError({
        origError: new Error('Invalid UUID'),
        errorType: ERROR_TYPES.general.INVALID_UUID,
      })
    }

    console.log('Solicitadas las películas por id: ', id)
    const movie = await this.movieModel.getById({ id })
    if (movie) {
      return res.status(200).json(movie)
    }
    else {
      throw new CustomError({
        origError: new Error('Movie not found'),
        errorType: ERROR_TYPES.movie.NOT_FOUND,
      })
    }
  })

  create = asyncHandler(async (req, res) => {
    const result = req.body

    if (!await validateMovie(result)) {
      throw new CustomError({
        origError: new Error('Invalid movie data'),
        errorType: ERROR_TYPES.movie.VALIDATION_ERROR,
      })
    }

    const newMovie = await this.movieModel.create({ input: result.data })
    console.log('Creación de una nueva película: ', newMovie)
    res.status(201).json(newMovie)
  })

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!await checkUUID(id)) {
      throw new CustomError({
        origError: new Error('Invalid UUID'),
        errorType: ERROR_TYPES.general.INVALID_UUID,
      })
    }
    const result = await this.movieModel.delete({ id })

    if (result.affectedRows === 0) {
      throw new CustomError({
        origError: new Error('Movie not found'),
        errorType: ERROR_TYPES.movie.NOT_FOUND,
      })
    }

    console.log('Eliminación de una película: ', id)
    res.status(200).json({ message: 'Movie deleted' })
  })

  update = asyncHandler(async (req, res) => {
    const { id } = req.params
    const input = req.body

    // Validar si el UUID es válido
    if (!await checkUUID(id)) {
      throw new CustomError({
        origError: new Error('Invalid UUID'),
        errorType: ERROR_TYPES.general.INVALID_UUID,
      })
    }

    // Validar los datos de entrada
    if (!await validatePartialMovie(input)) {
      throw new CustomError({
        origError: new Error('Invalid movie data'),
        errorType: ERROR_TYPES.movie.VALIDATION_ERROR,
      })
    }

    // Validar que haya campos válidos o géneros para actualizar
    const allowedFields = [
      'title',
      'year',
      'director',
      'duration',
      'poster',
      'rate',
    ]
    const { genre, ...otherFields } = input

    const fields = Object.entries(otherFields).filter(
      ([key, value]) => allowedFields.includes(key) && value !== undefined,
    )

    if (fields.length === 0 && !genre) {
      throw new CustomError({
        origError: new Error('No valid fields or genres provided to update'),
        errorType: ERROR_TYPES.movie.VALIDATION_ERROR,
      })
    }

    // Llamar al modelo para actualizar la película
    const result = await this.movieModel.update({ id, fields, genre })

    // Validar si no se encontró la película
    if (!result || result.affectedRows === 0) {
      throw new CustomError({
        origError: new Error(`Movie with id ${id} not found`),
        errorType: ERROR_TYPES.movie.NOT_FOUND,
      })
    }

    console.log('Actualización de una película: ', id)
    res.status(200).json({ message: 'Movie updated successfully' })
  })
}
