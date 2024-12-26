import * as chai from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'
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
    checkUUIDStub = sinon.stub() // Stub para checkUUID

    const MockedController = await esmock('../../../src/controllers/userController.js', {
      '../../../src/utils/userValidation.js': {
        validateUser: validateUserStub,
        validatePartialUser: validatePartialUserStub,
      },
      '../../../src/utils/uuidValidation.js': { checkUUID: checkUUIDStub }, // Mock de checkUUID
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
      status: sinon.stub().returnsThis(), // Devuelve `this` para encadenar
      json: sinon.stub().returnsThis(), // Devuelve `this` por consistencia
      cookie: sinon.stub().returnsThis(),
      clearCookie: sinon.stub().returnsThis(),
      setHeader: sinon.stub().returnsThis(), // Devuelve `this` para encadenar
      getHeader: sinon.stub().returns('refreshToken=value; Path=/; HttpOnly'),
    }

    next = sinon.stub()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('register', () => {
    it('debería registrar un usuario con datos válidos', async () => {
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

    it('debería lanzar un CustomError si los datos no son válidos', async () => {
      req.body = { username: '', password: '' }
      validateUserStub.resolves(false)

      const registerPromise = userController.register(req, res, next)
      await expect(registerPromise).to.be.rejectedWith(CustomError)
      await expect(registerPromise).to.be.rejectedWith(ERROR_TYPES.user.VALIDATION_ERROR)

      expect(validateUserStub.calledOnceWith(req.body)).to.be.true
      expect(userModelMock.createUser.called).to.be.false
    })
  })

  describe('login', () => {
    it('debería autenticar un usuario con credenciales válidas', async () => {
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

    it('debería lanzar un CustomError si las credenciales son inválidas', async () => {
      req.body = { username: 'user', password: 'wrong-password' }
      validatePartialUserStub.resolves(true)
      userModelMock.authenticateUser.resolves(null)

      const loginPromise = userController.login(req, res, next)

      await expect(loginPromise).to.be.rejectedWith(CustomError)
      await expect(loginPromise).to.be.rejectedWith(ERROR_TYPES.user.INVALID_CREDENTIALS)

      expect(validatePartialUserStub.calledOnceWith(req.body)).to.be.true
      expect(userModelMock.authenticateUser.calledOnceWith(req.body)).to.be.true
    })
  })

  describe('deleteUser', () => {
    it('debería eliminar un usuario existente por ID', async () => {
      req.params.id = '1'

      checkUUIDStub.resolves(true) // El UUID es válido
      userModelMock.deleteUser.resolves({ affectedRows: 1 }) // Simula que se elimina el usuario

      await userController.deleteUser(req, res, next)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(userModelMock.deleteUser.calledOnceWith({ userId: '1' })).to.be.true
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ message: 'User deleted successfully' })).to.be.true
    })

    it('debería lanzar un CustomError si el UUID es inválido', async () => {
      req.params.id = 'invalid-id'

      checkUUIDStub.resolves(false) // El UUID no es válido

      const deletePromise = userController.deleteUser(req, res, next)

      await expect(deletePromise).to.be.rejectedWith(CustomError)
      await expect(deletePromise).to.be.rejectedWith(ERROR_TYPES.general.INVALID_UUID)
      expect(userModelMock.deleteUser.called).to.be.false
    })

    it('debería lanzar un CustomError si no se encuentra el usuario', async () => {
      req.params.id = '1'

      checkUUIDStub.resolves(true) // El UUID es válido
      userModelMock.deleteUser.resolves({ affectedRows: 0 }) // Simula que no se encuentra el usuario

      const deletePromise = userController.deleteUser(req, res, next)

      await expect(deletePromise).to.be.rejectedWith(CustomError)
      await expect(deletePromise).to.be.rejectedWith(ERROR_TYPES.general.NOT_FOUND)
      expect(userModelMock.deleteUser.calledOnceWith({ userId: '1' })).to.be.true
    })
  })

  describe('logout', () => {
    it('debería revocar tokens y limpiar cookies correctamente', async () => {
      req.cookies.refreshToken = 'valid-refresh-token'
      req.headers.authorization = 'Bearer valid-access-token'
      userModelMock.revokeToken.resolves({ affectedRows: 1 }) // Simula éxito en la revocación

      await userController.logout(req, res, next)

      expect(userModelMock.revokeToken.calledTwice).to.be.true // Verifica que se revocaron ambos tokens
      expect(userModelMock.revokeToken.firstCall.args[0]).to.equal('valid-refresh-token') // Verifica refreshToken
      expect(userModelMock.revokeToken.secondCall.args[0]).to.equal('valid-access-token') // Verifica accessToken
      expect(res.clearCookie.calledOnce).to.be.true // Verifica que se limpiaron ambas cookies
      expect(res.status.calledOnceWith(200)).to.be.true // Verifica código de respuesta
      expect(res.json.calledOnceWith({ message: 'Logout successful.' })).to.be.true // Verifica mensaje de respuesta
    })

    it('debería lanzar un CustomError si no hay refreshToken', async () => {
      req.cookies.refreshToken = undefined

      const logoutPromise = userController.logout(req, res, next)

      await expect(logoutPromise).to.be.rejectedWith(CustomError)
      await expect(logoutPromise).to.be.rejectedWith(ERROR_TYPES.auth.NO_REFRESH_TOKEN)

      expect(userModelMock.revokeToken.called).to.be.false // Verifica que no se llamó al modelo
    })

    it('debería lanzar un CustomError si el refreshToken tiene un formato inválido', async () => {
      req.cookies.refreshToken = '   ' // Refresh token vacío o solo espacios

      const logoutPromise = userController.logout(req, res, next)

      await expect(logoutPromise).to.be.rejectedWith(CustomError)
      await expect(logoutPromise).to.be.rejectedWith(ERROR_TYPES.auth.INVALID_REFRESH_TOKEN)

      expect(userModelMock.revokeToken.called).to.be.false // Verifica que no se llamó al modelo
    })

    it('debería revocar solo el refreshToken si no hay accessToken', async () => {
      req.cookies.refreshToken = 'valid-refresh-token'
      req.headers.authorization = undefined // No hay accessToken
      userModelMock.revokeToken.resolves({ affectedRows: 1 }) // Simula éxito en la revocación del refreshToken

      await userController.logout(req, res, next)

      expect(userModelMock.revokeToken.calledOnceWith('valid-refresh-token')).to.be.true // Verifica solo refreshToken
      expect(res.clearCookie.calledOnce).to.be.true // Verifica que se limpiaron las cookies
      expect(res.status.calledOnceWith(200)).to.be.true // Verifica código de respuesta
      expect(res.json.calledOnceWith({ message: 'Logout successful.' })).to.be.true // Verifica mensaje de respuesta
    })

    it('debería lanzar un CustomError si no se encuentra el refreshToken en la base de datos', async () => {
      req.cookies.refreshToken = 'invalid-refresh-token'
      userModelMock.revokeToken.resolves({ affectedRows: 0 }) // Simula que no se encontró el token

      const logoutPromise = userController.logout(req, res, next)

      await expect(logoutPromise).to.be.rejectedWith(CustomError)
      await expect(logoutPromise).to.be.rejectedWith(ERROR_TYPES.auth.TOKEN_REVOKED)

      expect(userModelMock.revokeToken.calledOnceWith('invalid-refresh-token')).to.be.true // Verifica intento de revocar refreshToken
    })

    it('debería lanzar un CustomError si el accessToken tiene un formato inválido', async () => {
      req.cookies.refreshToken = 'valid-refresh-token'
      req.headers.authorization = 'Bearer ' // Access token vacío o inválido

      const logoutPromise = userController.logout(req, res, next)

      await expect(logoutPromise).to.be.rejectedWith(CustomError)
      await expect(logoutPromise).to.be.rejectedWith(ERROR_TYPES.auth.INVALID_TOKEN)

      expect(userModelMock.revokeToken.called).to.be.false // Verifica que no se llamó al modelo
    })

    it('debería lanzar un CustomError si no se encuentra el accessToken en la base de datos', async () => {
      req.cookies.refreshToken = 'valid-refresh-token'
      req.headers.authorization = 'Bearer invalid-access-token'
      userModelMock.revokeToken
        .onFirstCall().resolves({ affectedRows: 1 }) // Simula éxito en refreshToken
        .onSecondCall().resolves({ affectedRows: 0 }) // Simula fallo en accessToken

      const logoutPromise = userController.logout(req, res, next)

      await expect(logoutPromise).to.be.rejectedWith(CustomError)
      await expect(logoutPromise).to.be.rejectedWith(ERROR_TYPES.auth.TOKEN_REVOKED)

      expect(userModelMock.revokeToken.calledTwice).to.be.true // Verifica que se intentó revocar ambos tokens
    })
  })

  describe('updateUser', () => {
    it('debería actualizar un usuario con datos válidos', async () => {
      req.params.id = '1'
      req.body = { email: 'new@email.com', age: 30 }

      checkUUIDStub.resolves(true) // UUID válido
      validatePartialUserStub.resolves(true) // Validación exitosa
      userModelMock.updateUser.resolves(true) // Simula éxito en la actualización

      await userController.updateUser(req, res, next)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(validatePartialUserStub.calledOnceWith(req.body)).to.be.true
      expect(userModelMock.updateUser.calledOnceWith({ userId: '1', userData: req.body })).to.be.true
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ message: 'User updated successfully.', id: '1' })).to.be.true
    })

    it('debería lanzar un CustomError si el UUID no es válido', async () => {
      req.params.id = 'invalid-uuid'
      req.body = { email: 'new@email.com', age: 30 }

      checkUUIDStub.resolves(false) // UUID inválido

      await expect(userController.updateUser(req, res, next)).to.be.rejectedWith(CustomError)
      await expect(userController.updateUser(req, res, next)).to.be.rejectedWith(ERROR_TYPES.general.INVALID_UUID)

      expect(userModelMock.updateUser.called).to.be.false
    })

    it('debería lanzar un CustomError si los datos no son válidos', async () => {
      req.params.id = '1'
      req.body = { email: 'invalid-email' }

      checkUUIDStub.resolves(true) // UUID válido
      validatePartialUserStub.resolves(false) // Validación fallida

      await expect(userController.updateUser(req, res, next)).to.be.rejectedWith(CustomError)
      await expect(userController.updateUser(req, res, next)).to.be.rejectedWith(ERROR_TYPES.user.VALIDATION_ERROR)

      expect(userModelMock.updateUser.called).to.be.false
    })
  })

  describe('getIdByUsername', () => {
    it('debería devolver el ID del usuario para un nombre de usuario válido', async () => {
      // Simula parámetros de entrada
      req.params.username = 'validUser'

      // Simula la respuesta del modelo
      const mockUser = { id: 1 }
      userModelMock.getUserByUsername.resolves(mockUser)

      // Llama al controlador
      await userController.getIdByUsername(req, res, next)

      // Verifica que se llamó al modelo con los argumentos correctos
      expect(userModelMock.getUserByUsername.calledOnceWith({ username: 'validUser' })).to.be.true

      // Verifica la respuesta del controlador
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ id: mockUser.id })).to.be.true
    })

    it('debería lanzar un CustomError si falta el parámetro username', async () => {
      req.params.username = undefined // Falta el username

      // Llama al controlador y captura el error
      const getIdPromise = userController.getIdByUsername(req, res, next)

      // Verifica que se lanza un CustomError
      await expect(getIdPromise).to.be.rejectedWith(CustomError)
      await expect(getIdPromise).to.be.rejectedWith(ERROR_TYPES.user.VALIDATION_ERROR)

      // Verifica que no se llamó al modelo
      expect(userModelMock.getUserByUsername.called).to.be.false
    })

    it('debería lanzar un CustomError si el usuario no se encuentra', async () => {
      req.params.username = 'nonExistentUser' // Usuario no existente

      // Simula que el modelo no encuentra al usuario
      userModelMock.getUserByUsername.resolves(null)

      // Llama al controlador y captura el error
      const getIdPromise = userController.getIdByUsername(req, res, next)

      // Verifica que se lanza un CustomError
      await expect(getIdPromise).to.be.rejectedWith(CustomError)
      await expect(getIdPromise).to.be.rejectedWith(ERROR_TYPES.general.NOT_FOUND)

      // Verifica que el modelo fue llamado correctamente
      expect(userModelMock.getUserByUsername.calledOnceWith({ username: 'nonExistentUser' })).to.be.true
    })
  })

  describe('getUser', () => {
    it('debería devolver los datos del usuario para un nombre de usuario válido', async () => {
      // Simula parámetros de entrada
      req.params.username = 'validUser'

      // Simula la respuesta del modelo
      const mockUser = {
        id: 1,
        username: 'validUser',
        email: 'user@example.com',
        password: 'hiddenPassword',
      }
      userModelMock.getUserByUsername.resolves(mockUser)

      // Llama al controlador
      await userController.getUser(req, res, next)

      // Verifica que se llamó al modelo con los argumentos correctos
      expect(userModelMock.getUserByUsername.calledOnceWith({ username: 'validUser' })).to.be.true

      // Verifica que la contraseña no está en la respuesta
      const expectedResponse = {
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
      }
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith(expectedResponse)).to.be.true
    })

    it('debería lanzar un CustomError si falta el parámetro username', async () => {
      req.params.username = undefined // Falta el username

      // Llama al controlador y captura el error
      const getUserPromise = userController.getUser(req, res, next)

      // Verifica que se lanza un CustomError
      await expect(getUserPromise).to.be.rejectedWith(CustomError)
      await expect(getUserPromise).to.be.rejectedWith(ERROR_TYPES.user.VALIDATION_ERROR)

      // Verifica que no se llamó al modelo
      expect(userModelMock.getUserByUsername.called).to.be.false
    })

    it('debería lanzar un CustomError si el usuario no se encuentra', async () => {
      req.params.username = 'nonExistentUser' // Usuario no existente

      // Simula que el modelo no encuentra al usuario
      userModelMock.getUserByUsername.resolves(null)

      // Llama al controlador y captura el error
      const getUserPromise = userController.getUser(req, res, next)

      // Verifica que se lanza un CustomError
      await expect(getUserPromise).to.be.rejectedWith(CustomError)
      await expect(getUserPromise).to.be.rejectedWith(ERROR_TYPES.general.NOT_FOUND)

      // Verifica que el modelo fue llamado correctamente
      expect(userModelMock.getUserByUsername.calledOnceWith({ username: 'nonExistentUser' })).to.be.true
    })
  })
})
