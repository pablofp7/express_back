import { blacklist } from '../utils/blacklist.js'
import { ERROR_TYPES, CustomError } from '../utils/customError.js'

export const blacklistMiddleware = (req, res, next) => {
  if (blacklist.has(req.ip)) {
    throw new CustomError({
      origError: new Error(`Blocked IP: ${req.ip}`),
      errorType: ERROR_TYPES.auth.ACCESS_DENIED,
    })
  }
  next()
}
