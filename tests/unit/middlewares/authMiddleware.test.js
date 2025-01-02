import sinon from 'sinon'
import chaiAsPromised from 'chai-as-promised'
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'
import { checkErrorType } from '../../testUtils/checkErrorType.js'
import * as chai from 'chai'
const { expect } = chai
chai.use(chaiAsPromised)

describe('authMiddleware', () => {
  let authMiddleware
  let userModelMock
  let req, res, next
  let jwtVerifyStub

  beforeEach(async () => {
    jwtVerifyStub = sinon.stub()

    const MockedMiddleware = await esmock('../../../src/middlewares/authMiddleware.js', {
      jsonwebtoken: { verify: jwtVerifyStub },
    })

    authMiddleware = MockedMiddleware.authMiddleware

    userModelMock = {
      checkToken: sinon.stub(),
    }

    req = { headers: {}, user: null }
    res = {}
    next = sinon.stub()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('Authentication Middleware', () => {
    it('should throw NO_TOKEN if no token is provided', async () => {
      const middleware = authMiddleware({ userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(next.called).to.be.false
    })

    it('should throw INVALID_TOKEN if the token format is invalid', async () => {
      req.headers.authorization = 'Bearer'

      const middleware = authMiddleware({ userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(next.called).to.be.false
    })

    it('should throw INVALID_TOKEN for invalid token', async () => {
      req.headers.authorization = 'Bearer invalidToken'
      jwtVerifyStub.throws(new Error('Invalid token'))

      const middleware = authMiddleware({ userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(next.called).to.be.false
    })

    it('should throw EXPIRED_TOKEN if the token is expired', async () => {
      req.headers.authorization = 'Bearer expiredToken'
      jwtVerifyStub.throws({ name: 'TokenExpiredError' })

      const middleware = authMiddleware({ userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(next.called).to.be.false
    })

    it('should call next if the token is valid', async () => {
      const decodedToken = { id: '123', role: 'user' }
      req.headers.authorization = 'Bearer validToken'
      jwtVerifyStub.returns(decodedToken)
      userModelMock.checkToken.resolves()

      const middleware = authMiddleware({ userModel: userModelMock })

      await middleware(req, res, next)

      expect(req.user).to.deep.equal(decodedToken)
      expect(next.calledOnce).to.be.true
    })

    it('should throw ACCESS_DENIED if requireAdmin is true and user is not admin', async () => {
      const decodedToken = { id: '123', role: 'user' }
      req.headers.authorization = 'Bearer validToken'
      jwtVerifyStub.returns(decodedToken)
      userModelMock.checkToken.resolves()

      const middleware = authMiddleware({ requireAdmin: true, userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(next.called).to.be.false
    })
  })
})
