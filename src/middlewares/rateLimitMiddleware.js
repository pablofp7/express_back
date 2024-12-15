import rateLimit from 'express-rate-limit'
import { blacklist } from '../utils/blacklist.js'

// Limitador general
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  max: 100, // Máximo de solicitudes permitidas por IP
  handler: (req, res) => {
    blacklist.add(req.ip) // Añadir la IP a la lista negra
    res
      .status(429)
      .json({ message: 'Too many requests, you have been blocked' })
  },
})

// Limitador sensible (por ejemplo, para login)
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  max: 10, // Máximo de solicitudes permitidas por IP
  handler: (req, res) => {
    blacklist.add(req.ip) // Añadir la IP a la lista negra
    res.status(429).json({
      message: 'Too many requests on sensitive route, you have been blocked',
    })
  },
})
