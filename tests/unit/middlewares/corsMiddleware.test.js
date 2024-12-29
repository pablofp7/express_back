import * as chai from 'chai'
import sinon from 'sinon'
import { originCallback } from '../../../src/middlewares/corsMiddleware.js'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'

const { expect } = chai

describe('originCallback', () => {
  let callback

  beforeEach(() => {
    callback = sinon.stub()
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should allow requests with no origin (e.g., non-browser requests)', () => {
    const origin = null

    originCallback(origin, callback)

    expect(callback.calledOnceWith(null, true)).to.be.true
  })

  it('should allow requests from localhost', () => {
    const origin = 'http://localhost:3000'

    originCallback(origin, callback)

    expect(callback.calledOnceWith(null, true)).to.be.true
  })

  it('should allow requests from accepted origins', () => {
    const origin = 'http://example.com'

    originCallback(origin, callback)

    expect(callback.calledOnceWith(null, true)).to.be.true
  })

  it('should block requests from disallowed origins', () => {
    const origin = 'http://unauthorizeddomain.com'

    originCallback(origin, callback)

    expect(callback.calledOnce).to.be.true
    const error = callback.firstCall.args[0]
    expect(error).to.be.instanceOf(CustomError)
    expect(error.origError.message).to.equal(`Blocked by CORS: ${origin}`)
    expect(error.errorType).to.equal(ERROR_TYPES.auth.ACCESS_DENIED)
  })

  it('should block requests when the origin is not in the whitelist', () => {
    const origin = 'http://notaccepted.com'

    originCallback(origin, callback)

    expect(callback.calledOnce).to.be.true
    const error = callback.firstCall.args[0]
    expect(error).to.be.instanceOf(CustomError)
    expect(error.origError.message).to.equal(`Blocked by CORS: ${origin}`)
    expect(error.errorType).to.equal(ERROR_TYPES.auth.ACCESS_DENIED)
  })
})
