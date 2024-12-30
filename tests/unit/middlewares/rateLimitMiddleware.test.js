import * as chai from 'chai'
import sinon from 'sinon'
import { generalLimiter, sensitiveLimiter } from '../../../src/middlewares/rateLimitMiddleware.js'
import { blacklist } from '../../../src/utils/blacklist.js'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'

const { expect } = chai

describe('Rate Limit Middlewares', () => {
  let req, res, next

  beforeEach(() => {
    req = { ip: '123.456.789.000' }
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    }
    next = sinon.stub()
    sinon.stub(blacklist, 'add') // Stub blacklist.add
  })

  afterEach(() => {
    sinon.restore() // Restore all stubs after each test
  })

  describe('generalLimiter', () => {
    it('should forward the request if the rate limit is not exceeded', async () => {
      // Simulate that the rate limit is not exceeded
      res.headersSent = false // Required by express-rate-limit to determine if the response is sent

      await generalLimiter(req, res, next)

      // Verify that the request was forwarded
      expect(next.calledOnce).to.be.true
      expect(blacklist.add.notCalled).to.be.true // IP should not be added to the blacklist
    })

    it('should add the IP to the blacklist and throw a CustomError when the rate limit is exceeded', async () => {
      // Simulate that the rate limit is exceeded
      res.headersSent = false // Required by express-rate-limit to invoke the handler
      generalLimiter.options.handler(req, res, next)

      // Verify the behavior when the rate limit is exceeded
      expect(blacklist.add.calledOnceWith(req.ip)).to.be.true
      expect(next.calledOnce).to.be.true

      const error = next.getCall(0).args[0]
      expect(error).to.be.instanceOf(CustomError)
      expect(error.errorType).to.equal(ERROR_TYPES.general.TOO_MANY_REQUESTS)
      expect(error.origError.message).to.equal('Too many requests')
    })
  })

  describe('sensitiveLimiter', () => {
    it('should forward the request if the rate limit is not exceeded', async () => {
      // Simulate that the rate limit is not exceeded
      res.headersSent = false // Required by express-rate-limit to determine if the response is sent

      await sensitiveLimiter(req, res, next)

      // Verify that the request was forwarded
      expect(next.calledOnce).to.be.true
      expect(blacklist.add.notCalled).to.be.true // IP should not be added to the blacklist
    })

    it('should add the IP to the blacklist and throw a CustomError when the rate limit is exceeded', async () => {
      // Simulate that the rate limit is exceeded
      res.headersSent = false // Required by express-rate-limit to invoke the handler
      sensitiveLimiter.options.handler(req, res, next)

      // Verify the behavior when the rate limit is exceeded
      expect(blacklist.add.calledOnceWith(req.ip)).to.be.true
      expect(next.calledOnce).to.be.true

      const error = next.getCall(0).args[0]
      expect(error).to.be.instanceOf(CustomError)
      expect(error.errorType).to.equal(ERROR_TYPES.general.TOO_MANY_REQUESTS)
      expect(error.origError.message).to.equal('Too many requests on sensitive route')
    })
  })
})
