import sinon from 'sinon'
import chaiAsPromised from 'chai-as-promised'
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'
import * as chai from 'chai'
const { expect } = chai
chai.use(chaiAsPromised)

describe('validateRefreshMiddleware', () => {
  let validateRefreshMiddleware
  let userModelMock
  let req, res, next
  let jwtVerifyStub

  beforeEach(async () => {
    jwtVerifyStub = sinon.stub()

    const MockedMiddleware = await esmock('../../../src/middlewares/validateRefreshMiddleware.js', {
      jsonwebtoken: { verify: jwtVerifyStub },
    })

    validateRefreshMiddleware = MockedMiddleware.validateRefreshMiddleware

    userModelMock = {
      checkToken: sinon.stub(),
    }

    req = { cookies: {}, refreshTokenData: null }
    res = {}
    next = sinon.stub()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('Validate Refresh Middleware', () => {
    it('should throw SERVER_ERROR if userModel is not provided', () => {
      expect(() => validateRefreshMiddleware({})).to.throw(CustomError).with.property('errorType', ERROR_TYPES.general.SERVER_ERROR)
    })

    it('should throw NO_REFRESH_TOKEN if no refresh token is provided', async () => {
      const middleware = validateRefreshMiddleware({ userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(error.errorType).to.equal(ERROR_TYPES.auth.NO_REFRESH_TOKEN)
        expect(error.origError.message).to.equal('No refresh token provided')
      }
      expect(next.called).to.be.false
    })

    it('should throw INVALID_REFRESH_TOKEN if jwt.verify fails', async () => {
      req.cookies.refreshToken = 'invalidRefreshToken'
      jwtVerifyStub.throws(new Error('Invalid token'))

      const middleware = validateRefreshMiddleware({ userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(error.errorType).to.equal(ERROR_TYPES.auth.INVALID_REFRESH_TOKEN)
        expect(error.origError.message).to.equal('Invalid token')
      }

      expect(next.called).to.be.false
    })

    it('should throw INVALID_REFRESH_TOKEN if decoded token is missing fields', async () => {
      req.cookies.refreshToken = 'refreshToken'
      jwtVerifyStub.returns({ username: null, role: null, userId: null })

      const middleware = validateRefreshMiddleware({ userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(error.errorType).to.equal(ERROR_TYPES.auth.INVALID_REFRESH_TOKEN)
        expect(error.origError.message).to.equal('Decoded token is missing required fields')
      }

      expect(next.called).to.be.false
    })

    it('should throw INVALID_REFRESH_TOKEN if userModel.checkToken rejects', async () => {
      req.cookies.refreshToken = 'refreshToken'
      jwtVerifyStub.returns({ username: 'user', role: 'admin', userId: '123' })
      userModelMock.checkToken.rejects(new Error('Token invalid'))

      const middleware = validateRefreshMiddleware({ userModel: userModelMock })

      try {
        await middleware(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(error.errorType).to.equal(ERROR_TYPES.auth.INVALID_REFRESH_TOKEN)
        expect(error.origError.message).to.equal('Token invalid')
      }

      expect(next.called).to.be.false
    })

    it('should call next with decoded token data if everything is valid', async () => {
      const decodedToken = { username: 'user', role: 'admin', userId: '123' }
      req.cookies.refreshToken = 'refreshToken'
      jwtVerifyStub.returns(decodedToken)
      userModelMock.checkToken.resolves()

      const middleware = validateRefreshMiddleware({ userModel: userModelMock })

      await middleware(req, res, next)

      expect(req.refreshTokenData).to.deep.equal(decodedToken)
      expect(next.calledOnce).to.be.true
      expect(next.getCall(0).args[0]).to.be.undefined
    })
  })
})
