import movies from '../../../stored_data/movies.json' with { type: 'json' }
import { randomUUID } from 'node:crypto'

export class MovieModel {
  // getAll y getById son equivalentes las declaraciones, con arrow function y con funcion normal

  // Funcion para obtener peliculas por género
  static async getAll({ genre }) {
    if (genre) {
      return movies.filter((movie) =>
        movie.genre.some((g) => g.toLowerCase() === genre.toLowerCase()),
      )
    }

    return movies
  }

  static async getById({ id }) {
    return movies.find((movie) => movie.id === id)
  }

  // Funcion para crear objeto en bbdd
  static async create({ input }) {
    const newMovie = {
      id: randomUUID(),
      ...input,
    }
    movies.push(newMovie)

    return newMovie
  }

  // Funcion para borrar en bbdd
  static delete = async ({ id }) => {
    const movieIndex = movies.findIndex((movie) => movie.id === id)

    if (movieIndex === -1) return false

    movies.splice(movieIndex, 1)
    return true
  }

  static async update({ id, input }) {
    const movieIndex = movies.findIndex((movie) => movie.id === id)

    if (movieIndex === -1) {
      return null // Indica que no se encontró la película
    }

    const updateMovie = {
      ...movies[movieIndex],
      ...input,
    }

    movies[movieIndex] = updateMovie
    return updateMovie // Devuelve la película actualizada
  }
}
