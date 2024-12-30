import * as chai from 'chai'
import sinon from 'sinon'
import { blacklistMiddleware } from '../../../src/middlewares/blacklistMiddleware.js'
import { blacklist } from '../../../src/utils/blacklist.js'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'
import chaiAsPromised from 'chai-as-promised'
const { expect } = chai
chai.use(chaiAsPromised)

describe('blacklistMiddleware', () => {
  let req, res, next

  beforeEach(() => {
    req = { ip: '192.168.0.1' }
    res = {}
    next = sinon.stub()
    sinon.stub(blacklist, 'has')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('Blacklist Middleware', () => {
    it('should call next without arguments if IP is not blacklisted', () => {
      blacklist.has.returns(false)

      blacklistMiddleware(req, res, next)

      expect(blacklist.has.calledOnceWith(req.ip)).to.be.true
      expect(next.calledOnce).to.be.true
      expect(next.firstCall.args).to.have.lengthOf(0)
    })

    it('should throw a CustomError for blacklisted IPs', () => {
      blacklist.has.returns(true)

      try {
        blacklistMiddleware(req, {}, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.errorType).to.equal(ERROR_TYPES.auth.ACCESS_DENIED)
        expect(error.origError.constructor).to.equal(Error)
        expect(error.origError.message).to.equal(`Blocked IP: ${req.ip}`)
      }

      expect(next.called).to.be.false
    })
  })
})
