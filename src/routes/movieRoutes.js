import { Router } from 'express'
import { MovieController } from '../controllers/movieController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'

export const createMovieRouter = ({ movieModel, userModel }) => {
  const moviesRouter = Router()
  const movieController = new MovieController({ movieModel })

  // Rutas accesibles por cualquier usuario autenticado
  moviesRouter.get('/', authMiddleware({ userModel }), movieController.getAll)
  moviesRouter.get('/:id', authMiddleware({ userModel }), movieController.getById)

  // Rutas que requieren permisos de administrador
  moviesRouter.post('/', authMiddleware({ userModel, requireAdmin: true }), movieController.create)
  moviesRouter.delete('/:id', authMiddleware({ userModel, requireAdmin: true }), movieController.delete)
  moviesRouter.patch('/:id', authMiddleware({ userModel, requireAdmin: true }), movieController.update)

  return moviesRouter
}
