import esmock from 'esmock'
import sinon from 'sinon'
import { DbConn } from '../../../src/database/dbConnection.js'
import bcrypt from 'bcrypt'
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)
const { expect } = chai
import dayjs from 'dayjs'

describe('UserModel', () => {
  let userModel
  let dbConnMock

  beforeEach(async () => {
    dbConnMock = {
      query: sinon.stub(),
      executeTransaction: sinon.stub(),
      beginTransaction: sinon.stub(),
      commitTransaction: sinon.stub(),
      rollbackTransaction: sinon.stub(),
    }

    sinon.stub(DbConn.prototype, 'query').callsFake(dbConnMock.query)
    dbConnMock.executeTransaction.callsFake(async (queries) => {
      for (const query of queries) {
        await query()
      }
    })
    sinon.stub(DbConn.prototype, 'executeTransaction').callsFake(dbConnMock.executeTransaction)

    sinon.stub(dayjs.prototype, 'format').returns('2024-01-01 00:00:00')
    sinon.stub(dayjs.prototype, 'add').returns(dayjs('2024-01-01 00:00:00'))

    const MockedUserModel = await esmock(
      '../../../src/models/user/mysql/userModelSQL.js',
      {
        uuid: { v4: sinon.stub().returns('mocked-uuid') },
      },
    )
    userModel = new MockedUserModel.UserModel({ userDbType: 'sql' })
    userModel.databaseConnection = new DbConn()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('createUser', () => {
    it('debería crear un usuario con datos válidos', async () => {
      const input = {
        username: 'testUser',
        password: 'password123',
        email: 'test@example.com',
        age: 30,
      }

      const salt = 10
      const hashedPassword = await bcrypt.hash(input.password, salt)

      sinon.stub(bcrypt, 'hash').resolves(hashedPassword)

      dbConnMock.query
        .onFirstCall().resolves()
        .onSecondCall().resolves([{ id: '1' }])
        .onThirdCall().resolves()

      const result = await userModel.createUser({ input })

      expect(result).to.include({
        id: 'mocked-uuid',
        username: input.username,
        email: input.email,
        age: input.age,
        role: 'User',
      })

      expect(dbConnMock.query.calledThrice).to.be.true
      expect(dbConnMock.query.getCall(0).args[0].query).to.include('INSERT INTO user')
      expect(dbConnMock.query.getCall(1).args[0].query).to.include('SELECT id FROM role')
      expect(dbConnMock.query.getCall(2).args[0].query).to.include('INSERT INTO user_roles')

      expect(dbConnMock.executeTransaction.calledOnce).to.be.true
    })
  })

  describe('authenticateUser', () => {
    it('debería autenticar a un usuario con credenciales válidas', async () => {
      const mockUsername = 'testUser'
      const mockPassword = 'password123'
      const mockStoredHash = '$2b$10$ABCDEFGHIJKLMNOPQRSTUVWXyZ1234567890abcdefghi'
      const mockRole = 'User'

      dbConnMock.query.resolves([{ id: '1', password: mockStoredHash, role: mockRole }])

      sinon.stub(bcrypt, 'compare').resolves(true)

      const result = await userModel.authenticateUser({ username: mockUsername, password: mockPassword })

      expect(result).to.deep.equal({ id: '1', username: mockUsername, role: mockRole })

      expect(dbConnMock.query.calledOnceWithExactly({
        query: sinon.match.string,
        queryParams: [mockUsername],
      })).to.be.true
    })

    it('debería devolver null si las credenciales son incorrectas', async () => {
      const mockUsername = 'testUser'
      const mockPassword = 'password123'
      const mockStoredHash = '$2b$10$ABCDEFGHIJKLMNOPQRSTUVWXyZ1234567890abcdefghi'

      dbConnMock.query.resolves([{ id: '1', password: mockStoredHash, role: 'User' }])

      sinon.stub(bcrypt, 'compare').resolves(false)

      const result = await userModel.authenticateUser({ username: mockUsername, password: mockPassword })

      expect(result).to.be.null

      expect(dbConnMock.query.calledOnceWithExactly({
        query: sinon.match.string,
        queryParams: [mockUsername],
      })).to.be.true
    })
  })

  describe('deleteUser', () => {
    it('debería eliminar un usuario existente', async () => {
      const mockUserId = '1'

      dbConnMock.query
        .onFirstCall().resolves({ affectedRows: 1 })
        .onSecondCall().resolves({ affectedRows: 1 })

      dbConnMock.executeTransaction.callsFake(async (queries) => {
        for (const query of queries) {
          await query()
        }
      })

      const result = await userModel.deleteUser({ userId: mockUserId })

      expect(dbConnMock.executeTransaction.calledOnce).to.be.true

      expect(dbConnMock.query.calledTwice).to.be.true
      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: 'DELETE FROM user_roles WHERE user_id = ?',
        queryParams: [mockUserId],
      })
      expect(dbConnMock.query.getCall(1).args[0]).to.deep.equal({
        query: 'DELETE FROM user WHERE id = ?',
        queryParams: [mockUserId],
      })

      expect(result).to.deep.equal({ affectedRows: 1 })
    })
  })

  describe('updateUser', () => {
    it('debería actualizar los campos permitidos de un usuario y el rol', async () => {
      const mockUserId = '1'
      const userData = {
        email: 'newemail@example.com',
        age: 35,
        role: 'Admin',
      }

      dbConnMock.query
        .onFirstCall().resolves()
        .onSecondCall().resolves([{ id: '1' }])
        .onThirdCall().resolves()

      const result = await userModel.updateUser({ userId: mockUserId, userData })

      expect(result).to.be.true

      expect(dbConnMock.query.callCount).to.equal(3)

      const normalizeQuery = (query) => query.replace(/\s+/g, ' ').trim()

      expect(normalizeQuery(dbConnMock.query.getCall(0).args[0].query)).to.equal(
        'UPDATE user SET email = ?, age = ? WHERE id = ?;',
      )
      expect(dbConnMock.query.getCall(0).args[0].queryParams).to.deep.equal([
        'newemail@example.com',
        35,
        mockUserId,
      ])

      expect(dbConnMock.query.getCall(1).args[0]).to.deep.equal({
        query: 'SELECT id FROM role WHERE LOWER(name) = LOWER(?)',
        queryParams: ['Admin'],
      })

      expect(dbConnMock.query.getCall(2).args[0]).to.deep.equal({
        query: 'UPDATE user_roles SET role_id = ? WHERE user_id = ?',
        queryParams: ['1', mockUserId],
      })

      expect(dbConnMock.executeTransaction.calledOnce).to.be.true
    })

    it('debería actualizar solo los campos permitidos de un usuario sin rol', async () => {
      const mockUserId = '1'
      const userData = {
        email: 'newemail@example.com',
        age: 35,
      }

      dbConnMock.query
        .onFirstCall().resolves()

      const result = await userModel.updateUser({ userId: mockUserId, userData })

      expect(result).to.be.true

      expect(dbConnMock.query.callCount).to.equal(1)

      const normalizeQuery = (query) => query.replace(/\s+/g, ' ').trim()

      expect(normalizeQuery(dbConnMock.query.getCall(0).args[0].query)).to.equal(
        'UPDATE user SET email = ?, age = ? WHERE id = ?;',
      )
      expect(dbConnMock.query.getCall(0).args[0].queryParams).to.deep.equal([
        'newemail@example.com',
        35,
        mockUserId,
      ])

      expect(dbConnMock.executeTransaction.calledOnce).to.be.true
    })

    it('debería actualizar solo el rol cuando no hay otros campos', async () => {
      const mockUserId = '1'
      const userData = {
        role: 'Admin',
      }

      dbConnMock.query
        .onFirstCall().resolves([{ id: '1' }])
        .onSecondCall().resolves()

      const result = await userModel.updateUser({ userId: mockUserId, userData })

      expect(result).to.be.true

      expect(dbConnMock.query.callCount).to.equal(2)

      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: 'SELECT id FROM role WHERE LOWER(name) = LOWER(?)',
        queryParams: ['Admin'],
      })

      expect(dbConnMock.query.getCall(1).args[0]).to.deep.equal({
        query: 'UPDATE user_roles SET role_id = ? WHERE user_id = ?',
        queryParams: ['1', mockUserId],
      })

      expect(dbConnMock.executeTransaction.calledOnce).to.be.true
    })
  })

  describe('getUserById', () => {
    it('debería devolver un usuario por ID', async () => {
      const mockUserId = '1'
      const mockUser = {
        id: '1',
        username: 'testUser',
        email: 'test@example.com',
        age: 30,
      }

      dbConnMock.query.resolves([mockUser])

      const result = await userModel.getUserById({ userId: mockUserId })

      expect(dbConnMock.query.calledOnce).to.be.true
      const queryCall = dbConnMock.query.getCall(0)
      expect(queryCall.args[0]).to.deep.equal({
        query: 'SELECT * FROM user WHERE id = ?',
        queryParams: [mockUserId],
      })

      expect(result).to.deep.equal(mockUser)
    })

    it('debería devolver null si el usuario no existe', async () => {
      const mockUserId = '1'

      dbConnMock.query.resolves([])

      const result = await userModel.getUserById({ userId: mockUserId })

      expect(dbConnMock.query.calledOnce).to.be.true
      const queryCall = dbConnMock.query.getCall(0)
      expect(queryCall.args[0]).to.deep.equal({
        query: 'SELECT * FROM user WHERE id = ?',
        queryParams: [mockUserId],
      })

      expect(result).to.be.null
    })
  })

  describe('getUserByEmail', () => {
    it('debería devolver el usuario correspondiente al email', async () => {
      const email = 'test@example.com'
      const mockUser = {
        id: '1',
        username: 'testUser',
        email: 'test@example.com',
        age: 30,
      }

      dbConnMock.query.resolves([mockUser])

      const result = await userModel.getUserByEmail({ email })

      expect(result).to.deep.equal(mockUser)

      expect(dbConnMock.query.calledOnce).to.be.true
      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: 'SELECT * FROM user WHERE email = ?',
        queryParams: [email],
      })
    })

    it('debería devolver null si no se encuentra un usuario con el email', async () => {
      const email = 'nonexistent@example.com'

      dbConnMock.query.resolves([])

      const result = await userModel.getUserByEmail({ email })

      expect(result).to.be.null

      expect(dbConnMock.query.calledOnce).to.be.true
      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: 'SELECT * FROM user WHERE email = ?',
        queryParams: [email],
      })
    })
  })

  describe('getUserByUsername', () => {
    it('debería devolver el usuario correspondiente al username', async () => {
      const username = 'testUser'
      const mockUser = {
        id: '1',
        username: 'testUser',
        email: 'test@example.com',
        age: 30,
      }

      dbConnMock.query.resolves([mockUser])

      const result = await userModel.getUserByUsername({ username })

      expect(result).to.deep.equal(mockUser)

      expect(dbConnMock.query.calledOnce).to.be.true
      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: 'SELECT * FROM user WHERE username = ?',
        queryParams: [username],
      })
    })

    it('debería devolver null si no se encuentra un usuario con el username', async () => {
      const username = 'nonexistentUser'

      dbConnMock.query.resolves([])

      const result = await userModel.getUserByUsername({ username })

      expect(result).to.be.null

      expect(dbConnMock.query.calledOnce).to.be.true
      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: 'SELECT * FROM user WHERE username = ?',
        queryParams: [username],
      })
    })
  })

  describe('saveToken', () => {
    it('debería guardar un token con los datos correctos', async () => {
      const tokenData = {
        userId: '123',
        token: 'sampleToken',
        type: 'access',
        expiresIn: 3600,
      }

      const expiresAt = dayjs()
        .add(tokenData.expiresIn, 'second')
        .format('YYYY-MM-DD HH:mm:ss')

      dbConnMock.query.resolves()

      await userModel.saveToken(tokenData)

      expect(dbConnMock.query.calledOnce).to.be.true
      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: `INSERT INTO tokens (id,user_id,token,type,expires_at) VALUES (?,?,?,?,?)`,
        queryParams: ['mocked-uuid', tokenData.userId, tokenData.token, tokenData.type, expiresAt],
      })
    })
  })

  describe('revokeToken', () => {
    it('debería revocar un token existente', async () => {
      const token = 'sampleToken'

      dbConnMock.query.resolves({ affectedRows: 1 })

      const result = await userModel.revokeToken(token)

      expect(result).to.deep.equal({ affectedRows: 1 })

      expect(dbConnMock.query.calledOnce).to.be.true
      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: `
      UPDATE tokens
      SET revoked = CURRENT_TIMESTAMP
      WHERE token = ? AND revoked IS NULL
    `,
        queryParams: [token],
      })
    })

    it('debería devolver un resultado vacío si no se encuentra el token', async () => {
      const token = 'nonexistentToken'

      dbConnMock.query.resolves({ affectedRows: 0 })

      const result = await userModel.revokeToken(token)

      expect(result).to.deep.equal({ affectedRows: 0 })

      expect(dbConnMock.query.calledOnce).to.be.true
      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: `
      UPDATE tokens
      SET revoked = CURRENT_TIMESTAMP
      WHERE token = ? AND revoked IS NULL
    `,
        queryParams: [token],
      })
    })
  })

  describe('checkToken', () => {
    it('debería devolver el token válido si no está revocado y no ha expirado', async () => {
      const mockToken = 'sampleToken'

      dbConnMock.query.resolves([
        { id: 'token-id-123', token: mockToken, type: 'access', user_id: '123', expires_at: '2024-01-01 00:00:00' },
      ])

      const result = await userModel.checkToken(mockToken)

      expect(result).to.deep.equal({
        id: 'token-id-123',
        token: mockToken,
        type: 'access',
        user_id: '123',
        expires_at: '2024-01-01 00:00:00',
      })
    })

    it('debería devolver null si el token no es válido o está revocado', async () => {
      const token = 'revokedToken'

      dbConnMock.query.resolves([])

      const result = await userModel.checkToken(token)

      expect(result).to.be.null

      expect(dbConnMock.query.calledOnce).to.be.true
      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: `
      SELECT * FROM tokens
      WHERE token = ? AND revoked IS NULL AND expires_at > NOW()
    `,
        queryParams: [token],
      })
    })
  })
})
