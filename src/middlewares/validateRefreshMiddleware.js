import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { CustomError, ERROR_TYPES } from '../errors/customError.js'

export const validateRefreshMiddleware = ({ userModel }) => {
  if (!userModel) {
    throw new CustomError({
      origError: new Error('UserModel instance is required'),
      errorType: ERROR_TYPES.general.SERVER_ERROR,
    })
  }

  return async (req, _res, next) => {
    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
      throw new CustomError({
        origError: new Error('No refresh token provided'),
        errorType: ERROR_TYPES.auth.NO_REFRESH_TOKEN,
      })
    }

    try {
      const decoded = jwt.verify(refreshToken, config.refreshTokenSecret)
      const { username, role, userId } = decoded

      if (!username || !role || !userId) {
        throw new CustomError({
          origError: new Error('Decoded token is missing required fields'),
          errorType: ERROR_TYPES.auth.INVALID_REFRESH_TOKEN,
        })
      }

      await userModel.checkToken(refreshToken)

      req.refreshTokenData = { username, role, userId }
      next()
    }
    catch (err) {
      throw new CustomError({
        origError: err,
        errorType: ERROR_TYPES.auth.INVALID_REFRESH_TOKEN,
      })
    }
  }
}
