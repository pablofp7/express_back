import { blacklist } from '../utils/blacklist.js'

export const blacklistMiddleware = (req, res, next) => {
  if (blacklist.has(req.ip)) {
    return res.status(403).json({ message: 'Your IP is blocked' })
  }
  next()
}
