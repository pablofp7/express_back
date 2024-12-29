import sinon from 'sinon'
import chaiAsPromised from 'chai-as-promised'
import jwt from 'jsonwebtoken'
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

  beforeEach(async () => {
    userModelMock = {
      checkToken: sinon.stub(),
    }

    const MockedMiddleware = await esmock('../../src/middleware/authMiddleware.js', {
      jsonwebtoken: jwt,
    })

    authMiddleware = MockedMiddleware.authMiddleware

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
        expect(error).to.be.instanceOf(Error)
        expect(error.message).to.equal('No token provided')
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
        expect(error).to.be.instanceOf(Error)
        expect(error.message).to.equal('Invalid token format')
      }

      expect(next.called).to.be.false
    })

    it('should throw INVALID_TOKEN for invalid token', async () => {
      req.headers.authorization = 'Bearer invalidToken'
      sinon.stub(jwt, 'verify').throws(new Error('Invalid token'))

      const middleware = authMiddleware({ userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(Error)
        expect(error.message).to.equal('Invalid token')
      }

      expect(next.called).to.be.false
    })

    it('should throw EXPIRED_TOKEN if the token is expired', async () => {
      req.headers.authorization = 'Bearer expiredToken'
      sinon.stub(jwt, 'verify').throws({ name: 'TokenExpiredError' })

      const middleware = authMiddleware({ userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(Error)
        expect(error.message).to.equal('Token has expired')
      }

      expect(next.called).to.be.false
    })

    it('should call next if the token is valid', async () => {
      const decodedToken = { id: '123', role: 'user' }
      req.headers.authorization = 'Bearer validToken'
      sinon.stub(jwt, 'verify').returns(decodedToken)
      userModelMock.checkToken.resolves()

      const middleware = authMiddleware({ userModel: userModelMock })

      await middleware(req, res, next)

      expect(req.user).to.deep.equal(decodedToken)
      expect(next.calledOnce).to.be.true
    })

    it('should throw ADMIN_ONLY if requireAdmin is true and user is not admin', async () => {
      const decodedToken = { id: '123', role: 'user' }
      req.headers.authorization = 'Bearer validToken'
      sinon.stub(jwt, 'verify').returns(decodedToken)
      userModelMock.checkToken.resolves()

      const middleware = authMiddleware({ requireAdmin: true, userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(Error)
        expect(error.message).to.equal('Access denied. Admins only.')
      }

      expect(next.called).to.be.false
    })
  })
})
