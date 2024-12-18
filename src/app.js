import express, { json } from 'express'
import cookieParser from 'cookie-parser'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs'

import { corsMiddleware } from './middlewares/corsMiddleware.js'
import { errorHandlerMiddleware } from './middlewares/errorHandlerMiddleware.js'

import { config } from './config/config.js'
import { createMovieRouter } from './routes/movieRoutes.js'
import { createUserRouter } from './routes/userRoutes.js'
import { blacklistMiddleware } from './middlewares/blacklistMiddleware.js'
import { generalLimiter } from './middlewares/rateLimitMiddleware.js'

export const createApp = ({ movieModel, userModel, tokenTransport }) => {
  const port = config.port // Puerto obtenido del fichero de configuración
  const app = express()
  app.use(json())
  app.use(corsMiddleware)
  app.disable('x-powered-by') // deshabilitar el header X-Powered-By: Express

  app.use(cookieParser())
  app.use(blacklistMiddleware)
  app.use(generalLimiter)

  const movieRouter = createMovieRouter({ movieModel, userModel })
  const userRouter = createUserRouter({ userModel, tokenTransport })

  const swaggerDocument = YAML.load('./openapi.yaml')
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

  // Rutas
  app.use('/movies', movieRouter)
  app.use('/user', userRouter)

  // Middleware de manejo de errores centralizado
  app.use(errorHandlerMiddleware)

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`)
    console.log(`Swagger docs available on http://localhost:${port}/api-docs`)
  })
}
