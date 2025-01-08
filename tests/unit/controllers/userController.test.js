import * as chai from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'
import { checkErrorType } from '../../testUtils/checkErrorType.js'
import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)
const { expect } = chai

describe('UserController', () => {
  let userController
  let userModelMock
  let req, res, next
  let validateUserStub, validatePartialUserStub, checkUUIDStub

  beforeEach(async () => {
    validateUserStub = sinon.stub()
    validatePartialUserStub = sinon.stub()
    checkUUIDStub = sinon.stub()

    const MockedController = await esmock('../../../src/controllers/userController.js', {
      '../../../src/utils/userValidation.js': {
        validateUser: validateUserStub,
        validatePartialUser: validatePartialUserStub,
      },
      '../../../src/utils/uuidValidation.js': { checkUUID: checkUUIDStub },
    })

    userModelMock = {
      createUser: sinon.stub(),
      authenticateUser: sinon.stub(),
      saveToken: sinon.stub(),
      deleteUser: sinon.stub(),
      revokeToken: sinon.stub(),
      updateUser: sinon.stub(),
      getUserByUsername: sinon.stub(),
    }

    userController = new MockedController.UserController({ userModel: userModelMock })

    req = { params: {}, body: {}, cookies: {}, headers: {} }
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
      cookie: sinon.stub().returnsThis(),
      clearCookie: sinon.stub().returnsThis(),
      setHeader: sinon.stub().returnsThis(),
      getHeader: sinon.stub().returns('refreshToken=value; Path=/; HttpOnly'),
    }

    next = sinon.stub()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('register', () => {
    it('should register a user with valid data', async () => {
      req.body = { username: 'user', password: 'password' }
      validateUserStub.resolves(true)
      const mockUser = { id: 1, username: 'user' }
      userModelMock.createUser.resolves(mockUser)

      await userController.register(req, res, next)

      expect(validateUserStub.calledOnceWith(req.body)).to.be.true
      expect(userModelMock.createUser.calledOnceWith({ input: req.body })).to.be.true
      expect(res.status.calledOnceWith(201)).to.be.true
      expect(res.json.calledOnceWith(mockUser)).to.be.true
    })

    it('should throw a CustomError when the data is invalid', async () => {
      req.body = { username: '', password: '' }
      validateUserStub.resolves(false)

      try {
        await userController.register(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(validateUserStub.calledOnceWith(req.body)).to.be.true
      expect(userModelMock.createUser.called).to.be.false
    })
  })

  describe('login', () => {
    it('should authenticate an user when the credentials are valid', async () => {
      req.body = { username: 'user', password: 'password' }
      validatePartialUserStub.resolves(true)
      const mockUser = { id: 1, username: 'user', role: 'User' }
      userModelMock.authenticateUser.resolves(mockUser)
      userModelMock.saveToken.resolves()

      await userController.login(req, res, next)

      expect(validatePartialUserStub.calledOnceWith(req.body)).to.be.true
      expect(userModelMock.authenticateUser.calledOnceWith(req.body)).to.be.true
      expect(res.cookie.calledOnce).to.be.true
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ message: 'Login successful' })).to.be.true
    })

    it('should throw a CustomError when the credentials are invalid', async () => {
      req.body = { username: 'user', password: 'wrong-password' }
      validatePartialUserStub.resolves(true)
      userModelMock.authenticateUser.resolves(null)

      try {
        await userController.login(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(validatePartialUserStub.calledOnceWith(req.body)).to.be.true
      expect(userModelMock.authenticateUser.calledOnceWith(req.body)).to.be.true
    })
  })

  describe('deleteUser', () => {
    it('should remove an existing user by ID', async () => {
      req.params.id = '1'

      checkUUIDStub.resolves(true)
      userModelMock.deleteUser.resolves({ affectedRows: 1 })

      await userController.deleteUser(req, res, next)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(userModelMock.deleteUser.calledOnceWith({ userId: '1' })).to.be.true
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ message: 'User deleted successfully' })).to.be.true
    })

    it('should throw a CustomError when the UUID (format) is not valid', async () => {
      req.params.id = 'invalid-id'

      checkUUIDStub.resolves(false)

      try {
        await userController.deleteUser(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }
      expect(userModelMock.deleteUser.called).to.be.false
    })

    it('should throw a CustomError when the ID is not found', async () => {
      req.params.id = '1'

      checkUUIDStub.resolves(true)
      userModelMock.deleteUser.resolves({ affectedRows: 0 })

      try {
        await userController.deleteUser(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }
      expect(userModelMock.deleteUser.calledOnceWith({ userId: '1' })).to.be.true
    })
  })

  describe('logout', () => {
    it('should revoke tokens and clean cookies correctly', async () => {
      req.cookies.refreshToken = 'valid-refresh-token'
      req.headers.authorization = 'Bearer valid-access-token'
      userModelMock.revokeToken.resolves({ affectedRows: 1 })

      await userController.logout(req, res, next)

      expect(userModelMock.revokeToken.calledTwice).to.be.true
      expect(userModelMock.revokeToken.firstCall.args[0]).to.equal('valid-refresh-token')
      expect(userModelMock.revokeToken.secondCall.args[0]).to.equal('valid-access-token')
      expect(res.clearCookie.calledOnce).to.be.true
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ message: 'Logout successful' })).to.be.true
    })

    it('should throw a CustomError when there is not a refreshToken', async () => {
      req.cookies.refreshToken = undefined

      try {
        await userController.logout(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(userModelMock.revokeToken.called).to.be.false
    })

    it('should throw a CustomError if the refreshToken has an invalid format', async () => {
      req.cookies.refreshToken = '   '

      try {
        await userController.logout(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(userModelMock.revokeToken.called).to.be.false
    })

    it('should only revoke the refreshToken if there is not an accessToken', async () => {
      req.cookies.refreshToken = 'valid-refresh-token'
      req.headers.authorization = undefined
      userModelMock.revokeToken.resolves({ affectedRows: 1 })

      await userController.logout(req, res, next)

      expect(userModelMock.revokeToken.calledOnceWith('valid-refresh-token')).to.be.true
      expect(res.clearCookie.calledOnce).to.be.true
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ message: 'Logout successful' })).to.be.true
    })

    it('should throw a CustomError if the refreshToken is not found on the db', async () => {
      req.cookies.refreshToken = 'invalid-refresh-token'
      userModelMock.revokeToken.resolves({ affectedRows: 0 })

      try {
        await userController.logout(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(userModelMock.revokeToken.calledOnceWith('invalid-refresh-token')).to.be.true
    })

    it('should throw a CustomError if the accessToken has an invalid format', async () => {
      req.cookies.refreshToken = 'valid-refresh-token'
      req.headers.authorization = 'Bearer '

      try {
        await userController.logout(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(userModelMock.revokeToken.called).to.be.false
    })

    it('should throw a CustomError if the accessToken is not found on the db', async () => {
      req.cookies.refreshToken = 'valid-refresh-token'
      req.headers.authorization = 'Bearer invalid-access-token'
      userModelMock.revokeToken
        .onFirstCall().resolves({ affectedRows: 1 })
        .onSecondCall().resolves({ affectedRows: 0 })

      try {
        await userController.logout(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(userModelMock.revokeToken.calledTwice).to.be.true
    })
  })

  describe('updateUser', () => {
    it('should update an user if data is valid', async () => {
      req.params.id = '1'
      req.body = { email: 'new@email.com', age: 30 }

      checkUUIDStub.resolves(true)
      validatePartialUserStub.resolves(true)
      userModelMock.updateUser.resolves(true)

      await userController.updateUser(req, res, next)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(validatePartialUserStub.calledOnceWith(req.body)).to.be.true
      expect(userModelMock.updateUser.calledOnceWith({ userId: '1', userData: req.body })).to.be.true
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ message: 'User updated successfully.', id: '1' })).to.be.true
    })

    it('should throw a CustomError when the UUID (format) is not valid', async () => {
      req.params.id = 'invalid-uuid'
      req.body = { email: 'new@email.com', age: 30 }

      checkUUIDStub.resolves(false)
      try {
        await userController.updateUser(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(userModelMock.updateUser.called).to.be.false
    })

    it('should throw a CustomError if the user\'s data is not valid', async () => {
      req.params.id = '1'
      req.body = { email: 'invalid-email' }

      checkUUIDStub.resolves(true)
      validatePartialUserStub.resolves(false)

      try {
        await userController.updateUser(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(userModelMock.updateUser.called).to.be.false
    })
  })

  describe('getIdByUsername', () => {
    it('should return the ID for a valid username', async () => {
      req.params.username = 'validUser'

      const mockUser = { id: 1 }
      userModelMock.getUserByUsername.resolves(mockUser)

      await userController.getIdByUsername(req, res, next)

      expect(userModelMock.getUserByUsername.calledOnceWith({ username: 'validUser' })).to.be.true

      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ id: mockUser.id })).to.be.true
    })

    it('should throw a CustomError if the id param is missing', async () => {
      req.params.username = undefined

      try {
        await userController.getIdByUsername(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(userModelMock.getUserByUsername.called).to.be.false
    })

    it('should throw a CustomError if the user is not found', async () => {
      req.params.username = 'nonExistentUser'

      userModelMock.getUserByUsername.resolves(null)

      try {
        await userController.getIdByUsername(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(userModelMock.getUserByUsername.calledOnceWith({ username: 'nonExistentUser' })).to.be.true
    })
  })

  describe('getUser', () => {
    it('should return user\'s data if the usernama is found', async () => {
      req.params.username = 'validUser'

      const mockUser = {
        id: 1,
        username: 'validUser',
        email: 'user@example.com',
        password: 'hiddenPassword',
      }
      userModelMock.getUserByUsername.resolves(mockUser)

      await userController.getUser(req, res, next)

      expect(userModelMock.getUserByUsername.calledOnceWith({ username: 'validUser' })).to.be.true

      const expectedResponse = {
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
      }
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith(expectedResponse)).to.be.true
    })

    it('should throw a CustomError if the username param is missing', async () => {
      req.params.username = undefined

      try {
        await userController.getUser(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(userModelMock.getUserByUsername.called).to.be.false
    })

    it('should throw a CustomError if the user is not found', async () => {
      req.params.username = 'nonExistentUser'

      userModelMock.getUserByUsername.resolves(null)

      try {
        await userController.getUser(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(userModelMock.getUserByUsername.calledOnceWith({ username: 'nonExistentUser' })).to.be.true
    })
  })
})
