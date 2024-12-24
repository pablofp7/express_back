import { validateUser, validatePartialUser } from '../utils/userValidation.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { CustomError, ERROR_TYPES } from '../errors/customError.js'
import bcrypt from 'bcrypt'

export class UserController {
  constructor({ userModel }) {
    this.userModel = userModel
    // this.userModel.init() // No es necesario porque ya se inicializa en server_sql.js
  }

  register = asyncHandler(async (req, res) => {
    const input = req.body

    if (!await validateUser(input)) {
      throw new CustomError({
        origError: new Error('Invalid user data'),
        errorType: ERROR_TYPES.user.VALIDATION_ERROR,

      })
    }

    const newUser = await this.userModel.createUser({ input })
    console.log('Usuario registrado:', newUser)
    res.status(201).json(newUser)
  })

  login = asyncHandler(async (req, res) => {
    const { username, password } = req.body

    if (!await validatePartialUser({ username, password })) {
      throw new CustomError({
        origError: new Error('Invalid input data'),
        errorType: ERROR_TYPES.user.VALIDATION_ERROR,
      })
    }

    const user = await this.userModel.authenticateUser({ username, password })

    if (!user) {
      await bcrypt.compare(
        'fakePassword',
        '$2b$10$ABCDEFGHIJKLMNOPQRSTUVWXyZ1234567890abcdefghi',
      )
      throw new CustomError({
        origError: new Error('Invalid credentials'),
        errorType: ERROR_TYPES.user.INVALID_CREDENTIALS,
      })
    }

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

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'Strict',
      maxAge: config.refreshTokenLifetime,
    })

    res
      .setHeader('Authorization', `Bearer ${accessToken}`)
      .status(200)
      .json({ message: 'Login successful' })

    if (config.nodeEnv !== 'production') {
      console.log(`Access Token (Authorization Header): Bearer ${accessToken}`)
      const setCookieHeader = res.getHeader('Set-Cookie')
      console.log(
        `Refresh Token (Set-Cookie Header): ${setCookieHeader}`,
      )
    }
  })

  deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params

    if (!id) {
      throw new CustomError('USER_MISSING_ID', {
        message: 'Missing user ID',
        resource: 'User',
        operation: 'DELETE',
      })
    }

    const result = await this.userModel.deleteUser({ userId: id })

    if (!result || result.affectedRows === 0) {
      throw new CustomError('GENERAL_NOT_FOUND', {
        message: `User with ID ${id} not found`,
        resource: 'User',
        operation: 'DELETE',
        resourceValue: id,
      })
    }

    res.status(200).json({ message: 'User deleted successfully' })
  })

  logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken
    const accessToken = req.headers.authorization?.split(' ')[1]

    if (!refreshToken) {
      throw new CustomError({
        origError: new Error('No refresh token provided'),
        errorType: ERROR_TYPES.auth.NO_REFRESH_TOKEN,
      })
    }

    if (typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      throw new CustomError({
        origError: new Error('Invalid refresh token format'),
        errorType: ERROR_TYPES.auth.INVALID_REFRESH_TOKEN,
      })
    }

    if (accessToken && (typeof accessToken !== 'string' || accessToken.trim() === '')) {
      throw new CustomError({
        origError: new Error('Invalid access token format'),
        errorType: ERROR_TYPES.auth.INVALID_TOKEN,
      })
    }

    const revokeRefreshResult = await this.userModel.revokeToken(refreshToken)

    if (!revokeRefreshResult || revokeRefreshResult.affectedRows === 0) {
      throw new CustomError({
        origError: new Error('Refresh token not found or already revoked'),
        errorType: ERROR_TYPES.auth.TOKEN_REVOKED,
      })
    }

    if (accessToken) {
      const revokeAccessResult = await this.userModel.revokeToken(accessToken)

      if (!revokeAccessResult || revokeAccessResult.affectedRows === 0) {
        throw new CustomError({
          origError: new Error('Access token not found or already revoked'),
          errorType: ERROR_TYPES.auth.TOKEN_REVOKED,
        })
      }
    }

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
  })

  // Refresh Token
  refreshToken = asyncHandler(async (req, res) => {
    const { username, role, userId } = req.refreshTokenData

    if (!username || !role || !userId) {
      throw new CustomError({
        origError: new Error('Invalid refresh token data'),
        errorType: ERROR_TYPES.auth.INVALID_REFRESH_TOKEN,
      })
    }

    const accessToken = jwt.sign({ username, role, userId }, config.jwtSecret, {
      expiresIn: config.accessTokenLifetime,
    })

    await this.userModel.saveToken({
      userId,
      token: accessToken,
      type: 'access',
      expiresIn: config.accessTokenLifetime,
    })

    res
      .setHeader('Authorization', `Bearer ${accessToken}`)
      .status(200)
      .json({
        message: 'Token refreshed successfully',
        accessToken,
      })

    if (config.node_env !== 'production') {
      console.log(`Nuevo Access Token (Authorization Header): Bearer ${accessToken}`)
    }
  })

  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params

    if (!id) {
      throw new CustomError({
        origError: new Error('Missing user ID'),
        errorType: ERROR_TYPES.user.MISSING_ID,
      })
    }

    const validationResult = await validatePartialUser(req.body)

    if (!validationResult) {
      throw new CustomError({
        origError: new Error('Validation failed during update'),
        errorType: ERROR_TYPES.user.VALIDATION_ERROR,
      })
    }

    const allowedFields = ['email', 'password', 'age']
    const { role, ...otherFields } = req.body

    const fields = Object.entries(otherFields).filter(
      ([key, value]) => allowedFields.includes(key) && value !== undefined,
    )

    if (fields.length === 0 && !role) {
      throw new CustomError({
        origError: new Error('No valid fields or role provided for update'),
        errorType: ERROR_TYPES.general.INVALID_INPUT,
      })
    }

    if (role) {
      const validRoles = ['User', 'Admin', 'Guest']
      if (!validRoles.includes(role)) {
        throw new CustomError({
          origError: new Error('Invalid role provided'),
          errorType: ERROR_TYPES.general.INVALID_INPUT,
        })
      }
    }

    const isUpdated = await this.userModel.updateUser({
      userId: id,
      userData: req.body,
    })

    if (!isUpdated) {
      throw new CustomError({
        origError: new Error(`User with ID ${id} not found`),
        errorType: ERROR_TYPES.general.NOT_FOUND,
      })
    }

    res.status(200).json({ message: 'User updated successfully.', id })
  })

  getIdByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username) {
      throw new CustomError({
        origError: new Error('Missing username parameter'),
        errorType: ERROR_TYPES.user.VALIDATION_ERROR,
      })
    }

    const user = await this.userModel.getUserByUsername({ username })

    if (!user) {
      throw new CustomError({
        origError: new Error(`User not found for username: ${username}`),
        errorType: ERROR_TYPES.general.NOT_FOUND,
      })
    }

    res.status(200).json({ id: user.id })
  })

  getUser = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username) {
      throw new CustomError({
        origError: new Error('Missing username parameter'),
        errorType: ERROR_TYPES.user.VALIDATION_ERROR,
      })
    }

    const user = await this.userModel.getUserByUsername({ username })

    if (!user) {
      throw new CustomError({
        origError: new Error(`User not found for username: ${username}`),
        errorType: ERROR_TYPES.general.NOT_FOUND,
      })
    }

    const { password: _hidden, ...safeUser } = user
    res.status(200).json(safeUser)
  })
}
