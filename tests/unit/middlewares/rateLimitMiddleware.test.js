import { expect } from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'
import { checkErrorType } from '../../testUtils/checkErrorType.js'

describe('Rate Limiter Tests', () => {
  let sandbox
  let rateLimitStub
  let blacklistStub
  let checkIPStub
  let rateLimitMiddleware
  let res

  beforeEach(async () => {
    sinon.stub(console, 'log')
    sinon.stub(console, 'warn')
    sinon.stub(console, 'error')
    sandbox = sinon.createSandbox()
    rateLimitStub = sandbox.stub().returns({})
    blacklistStub = { add: sandbox.stub() }
    checkIPStub = sandbox.stub()
    res = {}

    rateLimitMiddleware = await esmock('../../../src/middlewares/rateLimitMiddleware.js', {
      'express-rate-limit': rateLimitStub,
      '../../../src/utils/blacklist.js': { blacklist: blacklistStub },
      '../../../src/utils/ipValidator.js': { checkIP: checkIPStub },
    })
  })

  afterEach(() => {
    sandbox.restore()
    sinon.restore()
  })

  describe('Limiter Handlers', () => {
    it('generalLimiterHandler should add IP to blacklist and return 429 with error message', async () => {
      const req = { ip: '192.168.1.1' }
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      }

      await rateLimitMiddleware.generalLimiterHandler(req, res)

      expect(blacklistStub.add.calledOnceWith(req.ip)).to.be.true
      expect(res.status.calledOnceWith(429)).to.be.true
      expect(res.json.calledOnceWith({ error: 'Too many requests' })).to.be.true
    })

    it('sensitiveLimiterHandler should add IP to blacklist and return 429 with error message', async () => {
      const req = { ip: '192.168.1.1' }
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      }

      rateLimitMiddleware.sensitiveLimiterHandler(req, res)

      expect(blacklistStub.add.calledOnceWith(req.ip)).to.be.true
      expect(res.status.calledOnceWith(429)).to.be.true
      expect(res.json.calledOnceWith({ error: 'Too many requests' })).to.be.true
    })
  })

  describe('Rate Limiters Configuration', () => {
    it('should configure generalLimiter correctly', () => {
      const generalConfig = rateLimitStub.getCall(0).args[0]

      expect(generalConfig.windowMs).to.equal(15 * 60 * 1000)
      expect(generalConfig.max).to.equal(100)
      expect(generalConfig.handler).to.equal(rateLimitMiddleware.generalLimiterHandler)
    })

    it('should configure sensitiveLimiter correctly', () => {
      const sensitiveConfig = rateLimitStub.getCall(1).args[0]

      expect(sensitiveConfig.windowMs).to.equal(15 * 60 * 1000)
      expect(sensitiveConfig.max).to.equal(10)
      expect(sensitiveConfig.handler).to.equal(rateLimitMiddleware.sensitiveLimiterHandler)
    })
  })

  describe('KeyGenerator Tests', () => {
    it('should validate IP and return it when valid', () => {
      const req = { ip: '192.168.1.1' }
      checkIPStub.returns(true)

      const generalConfig = rateLimitStub.getCall(0).args[0]
      const result = generalConfig.keyGenerator(req)

      expect(checkIPStub.calledOnceWith(req.ip)).to.be.true
      expect(result).to.equal(req.ip)
    })

    it('should throw error when IP is invalid', () => {
      const req = { ip: 'invalid-ip' }
      checkIPStub.returns(false)

      const generalConfig = rateLimitStub.getCall(0).args[0]

      try {
        generalConfig.keyGenerator(req)
        expect.fail('Should have thrown an error')
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }
    })
  })
})
