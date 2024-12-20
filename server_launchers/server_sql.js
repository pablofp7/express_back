import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { createApp } from '../src/app.js'
import { MovieModel } from '../src/models/movie/mysql/movieModelSQL.js'
import { UserModel } from '../src/models/user/mysql/userModelSQL.js'

const { userDbType, movieDbType } = yargs(hideBin(process.argv))
  .option('userDbType', {
    alias: 'u',
    describe: 'Database type for users',
    choices: ['local', 'freesql', 'turso'],
    demandOption: true,
  })
  .option('movieDbType', {
    alias: 'm',
    describe: 'Database type for movies',
    choices: ['local', 'freesql', 'turso'],
    demandOption: true,
  })

  .help().argv // Hace falta ';' porque si no no sabe como inferir esta forma, podria ser un argumento siendo argv una funcion por ejemplo

;(async () => {
  try {
    // Instanciar y inicializar modelos
    const movieModel = new MovieModel({ movieDbType })
    const userModel = new UserModel({ userDbType })

    await Promise.all([movieModel.init(), userModel.init()])

    // Crear y lanzar la aplicación
    createApp({ movieModel, userModel })
  }
  catch (error) {
    console.error('Error during initialization:', error)
    process.exit(1) // Terminar el proceso si ocurre un error
  }
})()
