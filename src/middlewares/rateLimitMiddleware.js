import rateLimit from 'express-rate-limit'
import { blacklist } from '../utils/blacklist.js'
import { CustomError, ERROR_TYPES } from '../errors/customError.js'
import { checkIP } from '../utils/ipValidator.js'

export const generalLimiterHandler = async (req, res) => {
  blacklist.add(req.ip)
  console.error(`[GENERAL LIMITER] IP added to blacklist: ${req.ip}`)
  res.status(429).json({ error: 'Too many requests' })
}

export const sensitiveLimiterHandler = (req, res) => {
  blacklist.add(req.ip)
  console.error(`[SENSITIVE LIMITER] IP added to blacklist: ${req.ip}`)
  res.status(429).json({ error: 'Too many requests' })
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => isLocalhost(req.ip),
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
  skip: (req) => isLocalhost(req.ip),
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

const isLocalhost = (ip) => {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'
}
