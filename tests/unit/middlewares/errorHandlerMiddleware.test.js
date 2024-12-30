import * as chai from 'chai'
import sinon from 'sinon'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'
import { config } from '../../../src/config/config.js'
import { errorHandlerMiddleware } from '../../../src/middlewares/errorHandlerMiddleware.js'

const { expect } = chai

describe('ErrorHandlerMiddleware', () => {
  let originalNodeEnv
  let consoleErrorStub, consoleWarnStub

  beforeEach(() => {
    originalNodeEnv = config.nodeEnv
    consoleErrorStub = sinon.stub(console, 'error')
    consoleWarnStub = sinon.stub(console, 'warn')
  })

  afterEach(() => {
    config.nodeEnv = originalNodeEnv
    sinon.restore()
  })

  const mockResponse = () => {
    const res = {}
    res.status = function (code) {
      this.statusCode = code
      return this
    }
    res.json = function (data) {
      this.body = data
      return this
    }
    return res
  }

  it('should respond safely in development mode', () => {
    config.nodeEnv = 'development'

    const mockError = new CustomError({
      origError: new Error('User validation failed.'),
      errorType: ERROR_TYPES.user.VALIDATION_ERROR,
    })
    mockError.status = 400

    const req = {}
    const res = mockResponse()

    errorHandlerMiddleware(mockError, req, res, () => {})

    expect(consoleWarnStub.calledOnce).to.be.true
    expect(consoleWarnStub.firstCall.args[0]).to.include('[DEV ERROR]:')

    expect(res.statusCode).to.equal(400)
    expect(res.body).to.deep.equal({
      error: 'User validation failed.',
    })
  })

  it('should respond safely in production mode', () => {
    config.nodeEnv = 'production'

    const mockError = new CustomError({
      origError: new Error('Access denied.'),
      errorType: ERROR_TYPES.auth.ACCESS_DENIED,
    })
    mockError.status = 403

    const req = {}
    const res = mockResponse()

    errorHandlerMiddleware(mockError, req, res, () => {})

    expect(consoleErrorStub.calledOnce).to.be.true
    expect(consoleErrorStub.firstCall.args[0]).to.include('ERROR:')

    expect(res.statusCode).to.equal(403)
    expect(res.body).to.deep.equal({
      error: 'Access denied.',
    })
  })

  it('should throw the error if it is not an instance of CustomError', () => {
    const mockError = new Error('Unexpected error')

    const req = {}
    const res = mockResponse()

    expect(() => errorHandlerMiddleware(mockError, req, res, () => {})).to.throw(
      'Unexpected error',
    )

    expect(consoleErrorStub.called).to.be.false
    expect(consoleWarnStub.called).to.be.false
  })
})
