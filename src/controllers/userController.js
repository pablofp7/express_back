import chai from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../errors/customError.js'
import { config } from '../config/config.js'

const { expect } = chai

describe('ErrorHandlerMiddleware', () => {
  let errorHandlerMiddleware, logErrorStub, respondWithErrorStub, configStub

  beforeEach(async () => {
    logErrorStub = sinon.stub()
    respondWithErrorStub = sinon.stub()
    configStub = sinon.stub(config, 'nodeEnv').value('development')

    const MockedMiddleware = await esmock('../middlewares/errorHandler.js', {
      '../errors/customError.js': { CustomError, ERROR_TYPES },
      '../config/config.js': { config: { nodeEnv: 'development' } },
    })

    errorHandlerMiddleware = MockedMiddleware.errorHandlerMiddleware
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should log and respond with the error in development mode', () => {
    const mockError = new CustomError({
      origError: new Error('Invalid input data'),
      errorType: ERROR_TYPES.user.VALIDATION_ERROR,
    })
    const req = {}
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    }
    const next = sinon.stub()

    errorHandlerMiddleware(mockError, req, res, next)

    expect(res.status.calledOnceWith(mockError.status)).to.be.true
    expect(res.json.calledOnceWith({
      error: mockError.message,
      stack: mockError.stack,
    })).to.be.true
  })

  it('should log the error details in production mode', () => {
    configStub.value('production')

    const mockError = new CustomError({
      origError: new Error('Unauthorized access'),
      errorType: ERROR_TYPES.user.AUTH_ERROR,
    })
    const req = {}
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    }
    const next = sinon.stub()

    errorHandlerMiddleware(mockError, req, res, next)

    expect(res.status.calledOnceWith(mockError.status)).to.be.true
    expect(res.json.calledOnceWith({
      error: mockError.message,
    })).to.be.true
  })

  it('should throw the error if it is not an instance of CustomError', () => {
    const mockError = new Error('Unexpected error')
    const req = {}
    const res = {}
    const next = sinon.stub()

    expect(() => errorHandlerMiddleware(mockError, req, res, next)).to.throw(
      'Unexpected error',
    )
  })

  it('should handle different ERROR_TYPES correctly', () => {
    const mockError = new CustomError({
      origError: new Error('Database connection failed'),
      errorType: ERROR_TYPES.server.DATABASE_ERROR,
    })
    const req = {}
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    }
    const next = sinon.stub()

    errorHandlerMiddleware(mockError, req, res, next)

    expect(res.status.calledOnceWith(mockError.status)).to.be.true
    expect(res.json.calledOnceWith({
      error: mockError.message,
      stack: mockError.stack,
    })).to.be.true
  })
})``
