import { validateUser, validatePartialUser } from '../utils/userValidation.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'

export class UserController {
  constructor({ userModel, tokenTransport }) {
    // Lo dejo por si quiero hacer inyección de dependencias en un futuro para el modelo del Usuario
    this.userModel = userModel
    this.tokenTransport = tokenTransport
    // this.userModel.init()
  }

  // Maneja el inicio de sesión de un usuario
  login = asyncHandler(async (req, res) => {
    // Validar usuario
    const result = await validatePartialUser(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.errors })
    }

    const { username, password } = result.data
    const user = await this.userModel.checkUserPassword({
      username,
      passToCheck: password,
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' })
    }

    // Generar tokens usando la función utilitaria
    const accessToken = jwt.sign(
      { username, role: user.role, userId: user.id },
      config.jwtSecret,
      { expiresIn: config.accessTokenLifetime },
    )
    const refreshToken = jwt.sign(
      { username, role: user.role, userId: user.id },
      config.refreshTokenSecret,
      { expiresIn: config.refreshTokenLifetime },
    )

    // Guardar tokens en la base de datos
    await this.userModel.saveToken({
      userId: user.id,
      token: accessToken,
      type: 'access',
      expiresIn: config.accessTokenLifetime,
    })

    await this.userModel.saveToken({
      userId: user.id,
      token: refreshToken,
      type: 'refresh',
      expiresIn: config.refreshTokenLifetime,
    })

    // Configurar cookies y/o encabezados
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.node_env === 'production',
      sameSite: 'Strict',
      maxAge: config.refreshTokenLifetime, // 1 día
    })

    if (this.tokenTransport === 'cookie') {
      res
        .cookie('authToken', accessToken, {
          httpOnly: true,
          secure: config.node_env === 'production',
          sameSite: 'Strict',
          maxAge: config.accessTokenLifetime, // 1 hora
        })
        .status(200)
        .json({ message: 'Login successful' })
    }
    else if (this.tokenTransport === 'header') {
      res
        .setHeader('Authorization', `Bearer ${accessToken}`)
        .status(200)
        .json({ message: 'Login successful' })
    }
    else {
      res.status(500).json({ message: 'Server misconfiguration' })
    }

    if (config.node_env !== 'production') {
      console.log(`Access Token (Authorization Header): Bearer ${accessToken}`)
      const setCookieHeader = res.getHeader('Set-Cookie') // Obtiene el encabezado Set-Cookie
      console.log(
        `Refresh Token (Set-Cookie Header / En futuras request -> Cookie Header: <cookie>):  ${setCookieHeader}`,
      )
    }
  })

  logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken
    const accessToken
      = req.cookies?.authToken || req.headers.authorization?.split(' ')[1]

    if (!refreshToken) {
      return res.status(400).json({ message: 'No refresh token provided.' })
    }

    try {
      // Revocar el refresh token en la base de datos
      await this.userModel.revokeToken(refreshToken)

      if (accessToken) {
        // Revocar el access token en la base de datos
        await this.userModel.revokeToken(accessToken)
      }

      // Limpiar cookies en el cliente
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.node_env === 'production',
        sameSite: 'Strict',
      })

      res.clearCookie('authToken', {
        httpOnly: true,
        secure: config.node_env === 'production',
        sameSite: 'Strict',
      })

      res.status(200).json({ message: 'Logout successful.' })
    }
    catch (err) {
      console.error('Error during logout:', err)
      res.status(500).json({ message: 'An error occurred during logout.' })
    }
  })

  // Refresh Token
  refreshToken = asyncHandler(async (req, res) => {
    const { username, role, userId } = req.refreshTokenData // Extraemos username y role

    const accessToken = jwt.sign({ username, role, userId }, config.jwtSecret, {
      expiresIn: config.accessTokenLifetime,
    })

    try {
      // Guardar el nuevo access token en la base de datos
      await this.userModel.saveToken({
        userId: req.refreshTokenData.userId || null,
        token: accessToken,
        type: 'access',
        expiresIn: config.accessTokenLifetime,
      })

      // Enviar el nuevo access token según el transporte configurado
      if (this.tokenTransport === 'cookie') {
        res
          .cookie('authToken', accessToken, {
            httpOnly: true,
            secure: config.node_env === 'production',
            sameSite: 'Strict',
            maxAge: config.accessTokenLifetime,
          })
          .status(200)
          .json({ message: 'Token refreshed successfully' })
      }
      else if (this.tokenTransport === 'header') {
        res
          .setHeader('Authorization', `Bearer ${accessToken}`)
          .status(200)
          .json({
            message: 'Token refreshed successfully',
            accessToken,
          })
      }
      else {
        throw new CustomError('SERVER_ERROR', {
          message: 'Server misconfiguration',
          resource: 'User',
          operation: 'REFRESH_TOKEN',
        })
      }

      if (config.node_env !== 'production') {
        console.log(`Nuevo Access Token (Authorization Header): Bearer ${accessToken}`)
      }
    }
    catch (err) {
      console.error('Error al guardar el nuevo access token:', err)
      throw new CustomError('USER_REFRESH_TOKEN_ERROR', {
        message: 'Error saving the new access token.',
        resource: 'Token',
        operation: 'REFRESH_TOKEN',
        originalError: err.message,
      })
    }
  })

  // Registro de usuario
  register = asyncHandler(async (req, res) => {
    const result = await validateUser(req.body)

    if (!result.success) {
      console.error('Errores en el registro al validar:', result.errors)
      throw new CustomError('USER_REGISTRATION_ERROR', {
        message: 'Validation failed during registration',
        resource: 'User',
        operation: 'REGISTER',
        validationErrors: result.errors,
      })
    }

    const newUser = await this.userModel.createUser({ input: result.data })
    console.log('Usuario registrado:', newUser)
    res.status(201).json(newUser)
  })

  // Eliminar usuario
  deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params

    if (!id) {
      console.log('Falta el ID del usuario')
      throw new CustomError('USER_MISSING_ID', {
        message: 'Missing user ID',
        resource: 'User',
        operation: 'DELETE',
      })
    }

    const isDeleted = await this.userModel.deleteUser({ userId: id })

    if (!isDeleted) {
      console.log('No se ha podido eliminar el usuario con ID:', id)
      throw new CustomError('GENERAL_NOT_FOUND', {
        message: `User with ID ${id} not found`,
        resource: 'User',
        operation: 'DELETE',
        resourceValue: id,
      })
    }

    console.log('Usuario eliminado con éxito:', id)
    res.status(200).json({ message: 'User deleted successfully.', userId: id })
  })

  // Actualizar usuario
  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params

    if (!id) {
      console.log('Falta el ID del usuario')
      throw new CustomError('USER_MISSING_ID', {
        message: 'Missing user ID',
        resource: 'User',
        operation: 'UPDATE',
      })
    }

    const result = await validatePartialUser(req.body)

    if (!result.success) {
      console.error('Errores en el formato de los datos para actualizar:', result.errors)
      throw new CustomError('USER_UPDATE_ERROR', {
        message: 'Validation failed during update',
        resource: 'User',
        operation: 'UPDATE',
        validationErrors: result.errors,
      })

      // Revisado hasta este error
    }

    const isUpdated = await this.userModel.updateUser({
      userId: id,
      userData: req.body,
    })

    if (!isUpdated) {
      console.log('No se encontró el usuario con ID:', id)
      throw new CustomError('GENERAL_NOT_FOUND', {
        message: `User with ID ${id} not found`,
        resource: 'User',
        operation: 'UPDATE',
        resourceValue: id,
      })
    }

    console.log('Usuario actualizado:', id)
    res.status(200).json({ message: 'User updated successfully.', id })
  })

  // Obtener ID de usuario por nombre de usuario
  getIdByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username) {
      throw new CustomError('USER_MISSING_USERNAME', {
        message: 'Missing username parameter',
        resource: 'User',
        operation: 'GET_ID_BY_USERNAME',
      })
    }

    const user = await this.userModel.getUserByUsername({ username })
    if (!user) {
      throw new CustomError('GENERAL_NOT_FOUND', {
        message: `User not found for username: ${username}`,
        resource: 'User',
        operation: 'GET_ID_BY_USERNAME',
        resourceValue: username,
      })
    }

    console.log(`User found for username ${username}:`, user)
    res.status(200).json({ id: user.id })
  })

  // Obtener detalles completos de usuario por nombre de usuario
  getUser = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username) {
      throw new CustomError('USER_MISSING_USERNAME', {
        message: 'Missing username parameter',
        resource: 'User',
        operation: 'GET_USER',
      })
    }

    const user = await this.userModel.getUserByUsername({ username })
    if (!user) {
      throw new CustomError('GENERAL_NOT_FOUND', {
        message: `User not found for username: ${username}`,
        resource: 'User',
        operation: 'GET_USER',
        resourceValue: username,
      })
    }

    console.log(`User found for username ${username}:`, user)

    // Devuelve todos los campos del usuario, excepto la contraseña
    const { _password, ...safeUser } = user
    res.status(200).json(safeUser)
  })
}
