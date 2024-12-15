import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { CustomError } from '../utils/customError.js'

export const authMiddleware = ({
  requireAdmin = false,
  userModel = null,
} = {}) => {
  if (!userModel) {
    throw new CustomError('AUTH_NO_USER_MODEL', {
      message: 'authMiddleware requires a userModel instance as part of its options.',
      operation: 'INITIALIZATION',
      resource: 'Middleware',
    })
  }

  return async (req, res, next) => {
    try {
      let token

      if (req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1]
      }

      if (!token && req.cookies?.authToken) {
        token = req.cookies.authToken
      }

      if (!token) {
        throw new CustomError('AUTH_NO_TOKEN', {
          message: 'No token provided',
          resource: 'Token',
          operation: 'AUTH',
        })
      }

      let decoded
      try {
        decoded = jwt.verify(token, config.jwtSecret)
      }
      catch (err) {
        if (err.name === 'TokenExpiredError') {
          throw new CustomError('AUTH_EXPIRED_TOKEN', {
            message: 'Token has expired',
            resource: 'Token',
            operation: 'JWT_VERIFY',
            originalError: err.message,
          })
        }

        throw new CustomError('AUTH_INVALID_TOKEN', {
          message: 'Invalid token',
          resource: 'Token',
          operation: 'JWT_VERIFY',
          originalError: err.message,
        })
      }

      // Verificar el token en el modelo de usuario
      await userModel.checkToken(token)

      req.user = decoded

      // Verificar si se requiere un rol de administrador
      if (requireAdmin && req.user?.role?.toLowerCase() !== 'admin') {
        throw new CustomError('AUTH_ADMIN_ONLY', {
          message: 'Access denied. Admins only.',
          resource: 'Role',
          operation: 'AUTH',
          userRole: req.user?.role,
        })
      }

      next()
    }
    catch (err) {
      next(err)
    }
  }
}
