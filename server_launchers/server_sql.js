import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { createApp, startServer } from '../src/app.js'
import { MovieModel } from '../src/models/movie/mysql/movieModelSQL.js'
import { UserModel } from '../src/models/user/mysql/userModelSQL.js'
import { CustomError, ERROR_TYPES } from '../src/errors/customError.js'

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
  .help().argv
  /*
   Este punto y coma es necesario para que el linter entienda que lo siguiente es una función autoinvocada
  */

/* Función para crear la app y esperar la inicialización de los modelos */
const generateAppInstance = async () => {
  try {
    const movieModel = new MovieModel({ movieDbType })
    const userModel = new UserModel({ userDbType })

    /*
    Se podría pensar que se puede hacer la inicialización ya en el constructor de los modelos, pero hay un problema:
    La inicialización de la conexión a la base de datos es asíncrona (la parte que usan los clientes de librerias como mysql2/promise.
    Por lo tanto, no se puede hacer en el constructor de la clase (los constructores no pueden ser asíncronos).
    */
    await Promise.all([movieModel.init(), userModel.init()])

    return createApp({ movieModel, userModel })
  }
  catch (error) {
    if (error instanceof CustomError) {
      throw error
    }
    else {
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.general.SERVER_ERROR,
      })
    }
  }
}

/* Función autoinvocada para iniciar el servidor con la app creada anteriormente */
(async () => {
  try {
    const appInstance = await generateAppInstance()
    startServer({ app: appInstance })
  }
  catch (error) {
    if (error instanceof CustomError) {
      throw error
    }
    else {
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.general.SERVER_ERROR,
      })
    }
  }
})()
