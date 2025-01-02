import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { ERROR_TYPES, CustomError } from '../errors/customError.js'

export const authMiddleware = ({ requireAdmin = false, userModel = null } = {}) => {
  if (!userModel) {
    throw new CustomError({
      origError: new Error('authMiddleware requires a userModel instance.'),
      errorType: ERROR_TYPES.general.INVALID_INPUT,
    })
  }

  return async (req, _res, next) => {
    let token

    if (req.headers.authorization) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      throw new CustomError({
        origError: new Error('No token provided'),
        errorType: ERROR_TYPES.auth.NO_TOKEN,
      })
    }

    if (typeof token !== 'string') {
      throw new CustomError({
        origError: new Error('Invalid token format'),
        errorType: ERROR_TYPES.auth.INVALID_TOKEN,
      })
    }

    let decoded
    try {
      decoded = jwt.verify(token, config.jwtSecret)
    }
    catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new CustomError({
          origError: new Error('Token has expired'),
          errorType: ERROR_TYPES.auth.EXPIRED_TOKEN,
        })
      }
      throw new CustomError({
        origError: new Error('Invalid token'),
        errorType: ERROR_TYPES.auth.INVALID_TOKEN,
      })
    }

    if (!await userModel.checkToken(token)) {
      throw new CustomError({
        origError: new Error ('Access token not found on the database'),
        errorType: ERROR_TYPES.auth.INVALID_TOKEN,
      })
    }

    req.user = decoded

    if (requireAdmin && req.user?.role?.toLowerCase() !== 'admin') {
      throw new CustomError({
        origError: new Error('Access denied. Admins only.'),
        errorType: ERROR_TYPES.auth.ACCESS_DENIED,
      })
    }
    next()
  }
}
