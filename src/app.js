import express, { json } from 'express'
import 'express-async-errors'
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

let server

export const createApp = ({ movieModel, userModel }) => {
  const app = express()
  app.use(json())
  app.use(corsMiddleware)
  app.disable('x-powered-by')

  app.use(cookieParser())
  app.use(blacklistMiddleware)
  app.use(generalLimiter)

  const movieRouter = createMovieRouter({ movieModel, userModel })
  const userRouter = createUserRouter({ userModel })

  const swaggerDocument = YAML.load('./openapi.yaml')
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

  app.use('/movie', movieRouter)
  app.use('/user', userRouter)

  app.use(errorHandlerMiddleware)

  return app
}

export const startServer = ({ app }) => {
  const port = config.port
  server = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`)
    console.log(`Swagger docs available on http://localhost:${port}/api-docs`)
  })
  return server
}

export const stopServer = () => {
  if (server) {
    server.close(() => {
      console.log('Server has been stopped.')
    })
  }
}
