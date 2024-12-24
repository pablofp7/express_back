import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { CustomError, ERROR_TYPES } from '../errors/customError.js'

export const validateRefreshMiddleware = ({ userModel }) => {
  if (!userModel) {
    // Este error debe lanzarse inmediatamente porque ocurre en la configuración, no en el flujo de solicitud
    throw new CustomError({
      origError: new Error('UserModel instance is required'),
      errorType: ERROR_TYPES.general.SERVER_ERROR,
    })
  }

  return async (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      return next(
        new CustomError({
          origError: new Error('No refresh token provided'),
          errorType: ERROR_TYPES.auth.NO_REFRESH_TOKEN,
        }),
      )
    }

    try {
      const decoded = jwt.verify(refreshToken, config.refreshTokenSecret)
      const { username, role, userId } = decoded

      if (!username || !role || !userId) {
        return next(
          new CustomError({
            origError: new Error('Decoded token is missing required fields'),
            errorType: ERROR_TYPES.auth.INVALID_REFRESH_TOKEN,
          }),
        )
      }

      await userModel.checkToken(refreshToken)

      req.refreshTokenData = { username, role, userId }
      next() // Continuar al siguiente middleware si todo es correcto
    }
    catch (err) {
      return next(
        new CustomError({
          origError: err,
          errorType: ERROR_TYPES.auth.INVALID_REFRESH_TOKEN,
        }),
      )
    }
  }
}
