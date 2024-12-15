import { DbConn } from '../../../database/dbConnection.js'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import { config } from '../../../config/config.js'
import { checkUUID } from '../../../utils/uuidValidation.js'
import dayjs from 'dayjs'
import { CustomError } from '../../../utils/customError.js'

export class UserModel {
  constructor({ userDbType }) {
    this.userDbType = userDbType
    this.databaseConnection = null
  }

  init = async () => {
    this.databaseConnection = new DbConn()
    await this.databaseConnection.init({ userDbType: this.userDbType })
  }

  async createUser({ input }) {
    const { username, password, email, age } = input
    const newId = uuidv4()
    const salt = parseInt(config.salt, 10)
    const hashedPassword = await bcrypt.hash(password, salt)
    const defaultRole = 'User'

    // Sincronizamos el filtrado de campos y valores
    const rawFields = ['id', 'username', 'password', 'email', 'age']
    const rawValues = [newId, username, hashedPassword, email, age]

    const filteredData = rawFields
      .map((field, index) => ({ field, value: rawValues[index] }))
      .filter(({ value }) => value !== undefined)

    const fields = filteredData.map(({ field }) => field)
    const values = filteredData.map(({ value }) => value)

    await this.databaseConnection.beginTransaction()

    try {
      // Inserción en la tabla `user`
      await this.databaseConnection.query({
        query: `INSERT INTO user (${fields.join(',')}) VALUES (${values.map(() => '?').join(',')})`,
        queryParams: values,
        resource: 'User',
        operation: 'INSERT',
      })

      // Obtener el ID del rol predeterminado (`User`)
      const roleResult = await this.databaseConnection.query({
        query: 'SELECT id FROM role WHERE LOWER(name) = LOWER(?)',
        queryParams: [defaultRole],
        resource: 'Role',
        operation: 'SELECT',
      })

      const idRole = roleResult[0]?.id

      if (!idRole) {
        throw new CustomError('GENERAL_NOT_FOUND', {
          resource: 'Role',
          resourceValue: defaultRole,
          operation: 'FETCH_DEFAULT_ROLE',
        })
      }

      // Inserción en la tabla `user_roles`
      await this.databaseConnection.query({
        query: 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
        queryParams: [newId, idRole],
        resource: 'User_roles',
        operation: 'INSERT',
      })

      await this.databaseConnection.commitTransaction()

      // Retornar el objeto del usuario creado
      return {
        id: newId,
        username,
        email: email || null,
        age: age || null,
        role: defaultRole,
      }
    }
    catch (error) {
      await this.databaseConnection.rollbackTransaction()
      throw error // Propaga errores ya manejados por DbConn
    }
  }

  async checkUserPassword({ username, passToCheck }) {
    // Buscar usuario en la base de datos
    const result = await this.databaseConnection.query({
      query: `
        SELECT 
          u.id, 
          u.password, 
          r.name AS role 
        FROM 
          user u 
        JOIN 
          user_roles ur ON u.id = ur.user_id 
        JOIN 
          role r ON ur.role_id = r.id 
        WHERE 
          u.username = ?`,
      queryParams: [username],
      resource: 'User',
      operation: 'SELECT',
    })

    // Si el usuario no existe, simula un hash para igualar tiempos de comparación
    if (!result || result.length === 0) {
      await bcrypt.compare(
        'fakePassword',
        '$2b$10$ABCDEFGHIJKLMNOPQRSTUVWXyZ1234567890abcdefghi',
      )
      throw new CustomError('USER_INVALID_CREDENTIALS', {
        resource: 'User',
        operation: 'LOGIN',
      })
    }

    const { id, password: storedHash, role } = result[0]

    // Validar la contraseña
    const isPasswordCorrect = await bcrypt.compare(passToCheck, storedHash)

    if (!isPasswordCorrect) {
      throw new CustomError('USER_INVALID_CREDENTIALS', {
        resource: 'User',
        operation: 'LOGIN',
      })
    }

    // Si la contraseña es correcta, devuelve id, username y rol
    return { id, username, role }
  }

  async deleteUser({ userId }) {
    await this.databaseConnection.beginTransaction()

    try {
      // Eliminar roles del usuario
      const userRolesResult = await this.databaseConnection.query({
        query: 'DELETE FROM user_roles WHERE user_id = ?',
        queryParams: [userId],
        resource: 'User_roles',
        operation: 'DELETE',
      })

      console.log(
        `Deleted ${userRolesResult.affectedRows} roles for userId: ${userId}`,
      )

      // Eliminar usuario
      const userResult = await this.databaseConnection.query({
        query: 'DELETE FROM user WHERE id = ?',
        queryParams: [userId],
        resource: 'User',
        operation: 'DELETE',
      })

      if (userResult.affectedRows === 0) {
        throw new CustomError('GENERAL_NOT_FOUND', {
          resource: 'User',
          operation: 'DELETE',
          resourceValue: userId,
          message: `User with id '${userId}' not found.`,
        })
      }

      // Confirma la transacción
      await this.databaseConnection.commitTransaction()
      console.log(`Transaction committed. User ${userId} successfully deleted.`)
      return true
    }
    catch (error) {
      await this.databaseConnection.rollbackTransaction()
      throw error // Propaga errores ya manejados por DbConn
    }
  }

  async updateUser({ userId, userData }) {
    checkUUID(userId)

    const allowedFields = ['email', 'password', 'age']
    const { role, ...otherFields } = userData

    const fields = Object.entries(otherFields).filter(
      ([key, value]) => allowedFields.includes(key) && value !== undefined,
    )

    if (fields.length === 0 && !role) {
      throw new CustomError('INVALID_INPUT', {
        resource: 'User',
        resourceValue: userId,
        operation: 'UPDATE',
        message: 'No valid fields or role provided for update.',
      })
    }

    await this.databaseConnection.beginTransaction()

    try {
      if (fields.length > 0) {
        for (let i = 0; i < fields.length; i++) {
          const [key, value] = fields[i]
          if (key === 'password') {
            const salt = parseInt(config.salt, 10)
            const hashedPassword = await bcrypt.hash(value, salt)
            fields[i][1] = hashedPassword
          }
        }

        const setClause = fields.map(([key]) => `${key} = ?`).join(', ')
        const values = fields.map(([_, value]) => value)
        const queryParams = [...values, userId]

        const query = `
          UPDATE user
          SET ${setClause}
          WHERE id = ?;
        `

        const result = await this.databaseConnection.query({
          query,
          queryParams,
          resource: 'User',
          operation: 'UPDATE_FIELDS',
        })

        if (result.affectedRows === 0) {
          throw new CustomError('GENERAL_NOT_FOUND', {
            resource: 'User',
            resourceValue: userId,
            operation: 'UPDATE_FIELDS',
            message: 'User not found.',
          })
        }
      }

      if (role) {
        const validRoles = ['User', 'Admin', 'Guest']
        if (!validRoles.includes(role)) {
          throw new CustomError('INVALID_INPUT', {
            resource: 'Role',
            resourceValue: role,
            operation: 'UPDATE_ROLE',
            message: 'Invalid role provided.',
          })
        }

        const roleResult = await this.databaseConnection.query({
          query: 'SELECT id FROM role WHERE LOWER(name) = LOWER(?)',
          queryParams: [role],
          resource: 'Role',
          operation: 'FETCH_ROLE',
        })

        const roleId = roleResult[0]?.id

        if (!roleId) {
          throw new CustomError('GENERAL_NOT_FOUND', {
            resource: 'Role',
            resourceValue: role,
            operation: 'FETCH_ROLE',
            message: 'Role not found.',
          })
        }

        await this.databaseConnection.query({
          query: 'UPDATE user_roles SET role_id = ? WHERE user_id = ?',
          queryParams: [roleId, userId],
          resource: 'UserRoles',
          operation: 'UPDATE_ROLE',
        })
      }

      await this.databaseConnection.commitTransaction()
      return true
    }
    catch (error) {
      await this.databaseConnection.rollbackTransaction()
      throw error // Propaga los errores de DbConn o errores personalizados
    }
  }

  async getUserById({ userId }) {
    const result = await this.databaseConnection.query({
      query: 'SELECT * FROM user WHERE id = ?',
      queryParams: [userId],
      resource: 'User',
      operation: 'SELECT',
    })

    if (!result || result.length === 0) {
      throw new CustomError('GENERAL_NOT_FOUND', {
        resource: 'User',
        resourceValue: userId,
        operation: 'SELECT',
        message: 'User not found.',
      })
    }

    return result[0]
  }

  async getUserByEmail({ email }) {
    const result = await this.databaseConnection.query({
      query: 'SELECT * FROM user WHERE email = ?',
      queryParams: [email],
      resource: 'User',
      operation: 'SELECT',
    })

    if (!result || result.length === 0) {
      throw new CustomError('GENERAL_NOT_FOUND', {
        resource: 'User',
        resourceValue: email,
        operation: 'SELECT',
        message: 'User not found by email.',
      })
    }

    return result[0]
  }

  async getUserByUsername({ username }) {
    const result = await this.databaseConnection.query({
      query: 'SELECT * FROM user WHERE username = ?',
      queryParams: [username],
      resource: 'User',
      operation: 'SELECT',
    })

    if (!result || result.length === 0) {
      throw new CustomError('GENERAL_NOT_FOUND', {
        resource: 'User',
        resourceValue: username,
        operation: 'SELECT',
        message: 'User not found by username.',
      })
    }

    return result[0]
  }

  async saveToken({ userId, token, type, expiresIn }) {
    if (!userId || !token || !type || !expiresIn) {
      console.error(`Missing or invalid parameters for saving token:
        userId: ${userId},
        token: ${token},
        type: ${type},
        expiresIn: ${expiresIn}
      `)
      throw new CustomError('INVALID_INPUT', {
        resource: 'Tokens',
        operation: 'INSERT',
        resourceValue: { userId, token, type, expiresIn },
        message: 'Missing or invalid parameters for saving token.',
      })
    }

    const expiresAt = dayjs()
      .add(expiresIn, 'second')
      .format('YYYY-MM-DD HH:mm:ss')
    console.log('Token expira en:', expiresAt)

    const query = `
      INSERT INTO tokens (id, user_id, token, type, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `

    await this.databaseConnection.query({
      query,
      queryParams: [uuidv4(), userId, token, type, expiresAt],
      resource: 'Tokens',
      operation: 'INSERT',
    })
  }

  async revokeToken(token) {
    if (!token || typeof token !== 'string') {
      throw new CustomError('INVALID_INPUT', {
        resource: 'Tokens',
        operation: 'UPDATE',
        resourceValue: token,
        message: 'Invalid or missing token.',
      })
    }

    const query = `
      UPDATE tokens
      SET revoked = CURRENT_TIMESTAMP
      WHERE token = ? AND revoked IS NULL
    `

    const result = await this.databaseConnection.query({
      query,
      queryParams: [token],
      resource: 'Tokens',
      operation: 'UPDATE',
    })

    if (result.affectedRows === 0) {
      throw new CustomError('GENERAL_NOT_FOUND', {
        resource: 'Tokens',
        operation: 'UPDATE',
        resourceValue: token,
        message: 'Token not found or already revoked.',
      })
    }
  }

  async checkToken(token) {
    if (!token || typeof token !== 'string') {
      throw new CustomError('INVALID_INPUT', {
        resource: 'Tokens',
        operation: 'SELECT',
        resourceValue: token,
        message: 'Invalid or missing token.',
      })
    }

    const query = `
      SELECT * FROM tokens
      WHERE token = ? AND revoked IS NULL AND expires_at > NOW()
    `

    const [result] = await this.databaseConnection.query({
      query,
      queryParams: [token],
      resource: 'Tokens',
      operation: 'SELECT',
    })

    if (!result || result.length === 0) {
      throw new CustomError('GENERAL_NOT_FOUND', {
        resource: 'Tokens',
        operation: 'SELECT',
        resourceValue: token,
        message: 'Token not found, revoked, or expired.',
      })
    }

    return result[0]
  }
}
