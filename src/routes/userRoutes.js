import { Router } from 'express'
import { UserController } from '../controllers/userController.js'
import { authMiddleware } from '../middlewares/authMiddleware.js'
import { sensitiveLimiter } from '../middlewares/rateLimitMiddleware.js'
import { validateRefreshMiddleware } from '../middlewares/validateRefreshMiddleware.js'

export const createUserRouter = ({ userModel }) => {
  const userRouter = Router()
  const userController = new UserController({ userModel })

  // Rutas para logear o registrar (para usuarios no autenticados)
  userRouter.post('/login', sensitiveLimiter, userController.login)
  userRouter.post('/register', sensitiveLimiter, userController.register)
  userRouter.get('/refresh-token', validateRefreshMiddleware({ userModel }), userController.refreshToken)
  userRouter.post('/logout', authMiddleware({ userModel }), userController.logout)

  userRouter.delete('/:id', authMiddleware({ userModel, requireAdmin: true }), userController.deleteUser)
  userRouter.patch('/:id', authMiddleware({ userModel, requireAdmin: true }), userController.updateUser)

  userRouter.get('/:username', userController.getUser)
  // userRouter.get('/:username', authMiddleware, adminMiddleware, userController.getIdByUsername)

  return userRouter
}
