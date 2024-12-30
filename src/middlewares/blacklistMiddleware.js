import { blacklist } from '../utils/blacklist.js'
import { ERROR_TYPES, CustomError } from '../errors/customError.js'

export const blacklistMiddleware = (req, _res, next) => {
  if (blacklist.has(req.ip)) {
    throw new CustomError({
      origError: new Error(`Blocked IP: ${req.ip}`),
      errorType: ERROR_TYPES.auth.ACCESS_DENIED,
    })
  }
  next()
}
