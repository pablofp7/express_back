import rateLimit from 'express-rate-limit'
import { blacklist } from '../utils/blacklist.js'
import { CustomError, ERROR_TYPES } from '../errors/customError.js'

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: (req, res, next) => {
    const error = new CustomError({
      origError: new Error('Too many requests'),
      errorType: ERROR_TYPES.general.TOO_MANY_REQUESTS,
    })
    blacklist.add(req.ip)
    next(error)
  },
})

export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res, next) => {
    const error = new CustomError({
      origError: new Error('Too many requests on sensitive route'),
      errorType: ERROR_TYPES.general.TOO_MANY_REQUESTS,
    })
    blacklist.add(req.ip)
    next(error)
  },
})
