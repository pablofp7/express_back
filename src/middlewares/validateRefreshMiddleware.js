import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { CustomError } from '../utils/customError.js'

export const validateRefreshMiddleware = ({ userModel }) => {
  if (!userModel) {
    throw new CustomError('AUTH_NO_USER_MODEL', {
      message: 'UserModel instance is required for validateRefreshMiddleware',
      operation: 'INITIALIZATION',
      resource: 'Middleware',
    })
  }

  return async (req, res, next) => {
    await validateRefreshLogic(req, res, next, userModel)
  }
}

const validateRefreshLogic = async (req, res, next, userModel) => {
  const refreshToken = req.cookies?.refreshToken // Obtenemos el refresh token desde las cookies

  if (!refreshToken) {
    throw new CustomError('USER_NO_REFRESH_TOKEN', {
      message: 'Refresh token is required',
      resource: 'Token',
      operation: 'AUTH',
    })
  }

  try {
    // Verificar la firma del token y decodificarlo
    const decoded = jwt.verify(refreshToken, config.refreshTokenSecret)
    const { username, role, userId } = decoded // Extraemos username y role desde el token

    console.log('Token decodificado:', decoded)

    // Verificar que el token está activo en la base de datos
    await userModel.checkToken(refreshToken)
    console.log('Token válido y encontrado en la base de datos')

    // Adjuntar los datos decodificados al objeto `req` para el siguiente middleware/controlador
    req.refreshTokenData = { username, role, userId }
    next() // Continúa al siguiente middleware o controlador
  }
  catch (err) {
    console.error('Error con el refresh token:', err)
    throw new CustomError('AUTH_INVALID_REFRESH_TOKEN', {
      message: 'Invalid or expired refresh token',
      resource: 'Token',
      operation: 'JWT_VERIFY',
      originalError: err.message,
    })
  }
}
