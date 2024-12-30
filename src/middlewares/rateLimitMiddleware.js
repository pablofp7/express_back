import rateLimit from 'express-rate-limit'
import { blacklist } from '../utils/blacklist.js'
import { CustomError, ERROR_TYPES } from '../errors/customError.js'

export const generalLimiterHandler = (req, _res) => {
  blacklist.add(req.ip)
  throw new CustomError({
    origError: new Error('Too many requests'),
    errorType: ERROR_TYPES.general.TOO_MANY_REQUESTS,
  })
}

export const sensitiveLimiterHandler = (req, _res) => {
  blacklist.add(req.ip)
  throw new CustomError({
    origError: new Error('Too many requests on sensitive route'),
    errorType: ERROR_TYPES.general.TOO_MANY_REQUESTS,
  })
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: generalLimiterHandler,
})

export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: sensitiveLimiterHandler,
})
