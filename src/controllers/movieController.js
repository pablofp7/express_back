import { validateMovie, validatePartialMovie } from '../utils/movieValidation.js'
import { ERROR_TYPES, CustomError } from '../errors/customError.js'
import { checkUUID } from '../utils/uuidValidation.js'

export class MovieController {
  constructor({ movieModel }) {
    this.movieModel = movieModel
  }

  getAll = async (req, res) => {
    const { genre } = req.query

    const movies = await this.movieModel.getAll({ genre })

    res.status(200).json(movies)
  }

  getById = async (req, res) => {
    const { id } = req.params
    if (!await checkUUID(id)) {
      throw new CustomError({
        origError: new Error('Invalid UUID'),
        errorType: ERROR_TYPES.general.INVALID_UUID,
      })
    }

    const movies = await this.movieModel.getById({ id })
    if ((Array.isArray(movies) && movies.length > 0) || (!Array.isArray(movies) && movies)) {
      const [desMovie] = movies
      console.log(`Llamado con: ${JSON.stringify(desMovie)}`)
      return res.status(200).json(desMovie)
    }
    else {
      throw new CustomError({
        origError: new Error('Movie not found'),
        errorType: ERROR_TYPES.movie.NOT_FOUND,
      })
    }
  }

  create = async (req, res) => {
    const input = req.body

    if (!await validateMovie(input)) {
      throw new CustomError({
        origError: new Error('Invalid movie data'),
        errorType: ERROR_TYPES.movie.VALIDATION_ERROR,
      })
    }

    const newMovie = await this.movieModel.create({ input })
    res.status(201).json(newMovie)
  }

  delete = async (req, res) => {
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
  }

  update = async (req, res) => {
    const { id } = req.params
    const input = req.body

    if (!await checkUUID(id)) {
      throw new CustomError({
        origError: new Error('Invalid UUID'),
        errorType: ERROR_TYPES.general.INVALID_UUID,
      })
    }

    if (!await validatePartialMovie(input)) {
      console.log('Salta error')
      throw new CustomError({
        origError: new Error('Invalid movie data'),
        errorType: ERROR_TYPES.movie.VALIDATION_ERROR,
      })
    }

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
        origError: new Error('No valid fields or genre provided to update'),
        errorType: ERROR_TYPES.movie.VALIDATION_ERROR,
      })
    }

    const result = await this.movieModel.update({ id, fields, genre })
    if (!result || result.affectedRows === 0) {
      throw new CustomError({
        origError: new Error(`Movie with id ${id} not found`),
        errorType: ERROR_TYPES.movie.NOT_FOUND,
      })
    }

    const [updatedMovie] = await this.movieModel.getById({ id })
    if (!updatedMovie) {
      throw new CustomError({
        origError: new Error(`Movie with id ${id} not found after update`),
        errorType: ERROR_TYPES.movie.NOT_FOUND,
      })
    }

    console.log('Actualización de una película: ', updatedMovie)
    res.status(200).json({
      message: 'Movie updated successfully',
      movie: updatedMovie,
    })
  }
}
