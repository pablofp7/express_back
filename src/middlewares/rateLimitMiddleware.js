import rateLimit from 'express-rate-limit'
import { blacklist } from '../utils/blacklist.js'
import { CustomError, ERROR_TYPES } from '../errors/customError.js'
import { checkIP } from '../utils/ipValidator.js'

export const generalLimiterHandler = async (req, _res) => {
  blacklist.add(req.ip)
  throw new CustomError({
    origError: new Error('Too many requests'),
    errorType: ERROR_TYPES.general.TOO_MANY_REQUESTS,
  })
}

export const sensitiveLimiterHandler = async (req, _res) => {
  blacklist.add(req.ip)
  throw new CustomError({
    origError: new Error('Too many requests on sensitive route'),
    errorType: ERROR_TYPES.general.TOO_MANY_REQUESTS,
  })
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    const isValidIP = checkIP(req.ip)
    if (!isValidIP) {
      throw new CustomError({
        origError: new Error('Invalid IP address'),
        errorType: ERROR_TYPES.general.INVALID_IP,
      })
    }
    return req.ip
  },
  handler: generalLimiterHandler,
})

export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const isValidIP = checkIP(req.ip)
    if (!isValidIP) {
      throw new CustomError({
        origError: new Error('Invalid IP address'),
        errorType: ERROR_TYPES.general.INVALID_IP,
      })
    }
    return req.ip
  },
  handler: sensitiveLimiterHandler,
})
