import { validateMovie, validatePartialMovie } from '../utils/movieValidation.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { CustomError } from '../utils/customError.js'
import { checkUUID } from '../utils/uuidValidation.js'

export class MovieController {
  constructor({ movieModel }) {
    this.movieModel = movieModel
    // this.movieModel.init()
  }

  getAll = asyncHandler(async (req, res) => {
    const { genre } = req.query
    console.log('Solicitadas todas las películas filtradas por género: ', genre)
    try {
      const movies = await this.movieModel.getAll({ genre })
      console.log('Devolviendo las películas: ')
      res.json(movies)
    }
    catch (_err) {
      throw new CustomError('MOVIE_FETCH_ERROR')
    }
  })

  getById = asyncHandler(async (req, res) => {
    const { id } = req.params
    console.log('Solicitadas las películas por id: ', id)
    try {
      const movie = await this.movieModel.getById({ id })
      if (movie) return res.json(movie)
      throw new CustomError('GENERAL_NOT_FOUND')
    }
    catch (err) {
      if (err.code === 'GENERAL_NOT_FOUND') {
        return res.status(404).json({ message: err.message })
      }
      throw err
    }
  })

  create = asyncHandler(async (req, res) => {
    const result = await validateMovie(req.body)

    if (!result.success) {
      throw new CustomError('MOVIE_VALIDATION_ERROR')
    }

    try {
      const newMovie = await this.movieModel.create({ input: result.data })
      console.log('Creación de una nueva película: ', newMovie)
      res.status(201).json(newMovie)
    }
    catch (_err) {
      throw new CustomError('MOVIE_CREATE_ERROR')
    }
  })

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params
    try {
      const result = await this.movieModel.delete({ id })
      if (!result) {
        throw new CustomError('GENERAL_NOT_FOUND', {
          message: `Movie with id ${id} not found`,
          resource: 'Movie',
          operation: 'DELETE',
          resourceValue: id,
        })
      }
      console.log('Eliminación de una película: ', id)
      res.json({ message: 'Movie deleted' })
    }
    catch (err) {
      throw err
    }
  })

  update = asyncHandler(async (req, res) => {
    const result = await validatePartialMovie(req.body)

    if (!result.success) {
      throw new CustomError('MOVIE_VALIDATION_ERROR', {
        message: 'Partial movie validation failed',
        resource: 'Movie',
        operation: 'UPDATE',
        validationErrors: result.error.message,
      })
    }

    const { id } = req.params
    try {
      const updatedMovie = await this.movieModel.update({
        id,
        input: result.data,
      })

      if (!updatedMovie) {
        throw new CustomError('GENERAL_NOT_FOUND', {
          message: `Movie with id ${id} not found`,
          resource: 'Movie',
          operation: 'UPDATE',
          resourceValue: id,
        })
      }

      console.log('Actualización de una película: ', id)
      res.json(updatedMovie)
    }
    catch (err) {
      throw err
    }
  })
}
