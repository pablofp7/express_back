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
    const salt = config.salt
    const hashedPassword = await bcrypt.hash(password, salt)
    const defaultRole = 'User'

    const data = { id: newId, username, password: hashedPassword, email, age }

    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined),
    )

    const fields = Object.keys(cleanData)
    const values = Object.values(cleanData)

    let idRole

    const insertUser = () => this.databaseConnection.query({
      query: `INSERT INTO user (${fields.join(',')}) VALUES (${values.map(() => '?').join(',')})`,
      queryParams: values,
    })

    const fetchDefaultRole = async () => {
      const roleResult = await this.databaseConnection.query({
        query: 'SELECT id FROM role WHERE LOWER(name) = LOWER(?)',
        queryParams: [defaultRole],
      })

      idRole = roleResult[0]?.id

      if (!idRole) {
        throw new CustomError('GENERAL_NOT_FOUND', {
          resource: 'Role',
          resourceValue: defaultRole,
          operation: 'FETCH_DEFAULT_ROLE',
        })
      }
    }

    const insertUserRole = () => this.databaseConnection.query({
      query: 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      queryParams: [newId, idRole],
    })

    await this.databaseConnection.executeTransaction([
      insertUser,
      fetchDefaultRole,
      insertUserRole,
    ])

    return {
      id: newId,
      username,
      email: email || null,
      age: age || null,
      role: defaultRole,
    }
  }

  async authenticateUser({ username, password }) {
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
    })

    const { id, password: storedHash, role } = result[0]
    const isPasswordCorrect = await bcrypt.compare(password, storedHash)

    return isPasswordCorrect ? { id, username, role } : null
  }

  async deleteUser({ userId }) {
    let result

    const deleteRoles = async () => {
      await this.databaseConnection.query({
        query: 'DELETE FROM user_roles WHERE user_id = ?',
        queryParams: [userId],
      })
    }

    const deleteUser = async () => {
      result = await this.databaseConnection.query({
        query: 'DELETE FROM user WHERE id = ?',
        queryParams: [userId],
      })
    }

    await this.databaseConnection.executeTransaction([deleteRoles, deleteUser])

    return result
  }

  async updateUser({ userId, userData }) {
    const allowedFields = ['email', 'password', 'age']
    const { role, ...otherFields } = userData

    const fields = Object.entries(otherFields).filter(
      ([key, value]) => allowedFields.includes(key) && value !== undefined,
    )

    const updateFields = async () => {
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

      await this.databaseConnection.query({
        query: `
          UPDATE user
          SET ${setClause}
          WHERE id = ?;
        `,
        queryParams,
      })
    }

    const updateRole = async () => {
      const roleResult = await this.databaseConnection.query({
        query: 'SELECT id FROM role WHERE LOWER(name) = LOWER(?)',
        queryParams: [role],
      })

      const roleId = roleResult[0]?.id

      await this.databaseConnection.query({
        query: 'UPDATE user_roles SET role_id = ? WHERE user_id = ?',
        queryParams: [roleId, userId],
      })
    }

    const tasks = []
    if (fields.length > 0) tasks.push(updateFields)
    if (role) tasks.push(updateRole)

    await this.databaseConnection.executeTransaction(tasks)

    return true
  }

  async getUserById({ userId }) {
    const query = 'SELECT * FROM user WHERE id = ?'
    const queryParams = [userId]

    const [result] = await this.databaseConnection.query({
      query,
      queryParams,
    })

    return result || null
  }

  async getUserByEmail({ email }) {
    const query = 'SELECT * FROM user WHERE email = ?'
    const queryParams = [email]

    const [result] = await this.databaseConnection.query({
      query,
      queryParams,
    })

    return result || null
  }

  async getUserByUsername({ username }) {
    const query = 'SELECT * FROM user WHERE username = ?'
    const queryParams = [username]

    const [result] = await this.databaseConnection.query({
      query,
      queryParams,
    })

    return result || null
  }

  async saveToken({ userId, token, type, expiresIn }) {
    const expiresAt = dayjs()
      .add(expiresIn, 'second')
      .format('YYYY-MM-DD HH:mm:ss')

    const data = {
      id: uuidv4(),
      user_id: userId,
      token,
      type,
      expires_at: expiresAt,
    }

    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined),
    )

    const fields = Object.keys(cleanData)
    const values = Object.values(cleanData)

    await this.databaseConnection.query({
      query: `INSERT INTO tokens (${fields.join(',')}) VALUES (${values.map(() => '?').join(',')})`,
      queryParams: values,
    })
  }

  async revokeToken(token) {
    const query = `
      UPDATE tokens
      SET revoked = CURRENT_TIMESTAMP
      WHERE token = ? AND revoked IS NULL
    `

    const result = await this.databaseConnection.query({
      query,
      queryParams: [token],
    })

    return result
  }

  async checkToken(token) {
    const query = `
      SELECT * FROM tokens
      WHERE token = ? AND revoked IS NULL AND expires_at > NOW()
    `

    const [result] = await this.databaseConnection.query({
      query,
      queryParams: [token],
    })

    return result?.[0] || null
  }
}
