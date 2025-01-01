import * as chai from 'chai'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'

const { expect } = chai

describe('CustomError', () => {
  it('should initialize with valid origError and errorType', () => {
    const origError = new Error('Original error message')
    const errorType = ERROR_TYPES.auth.ACCESS_DENIED

    const customError = new CustomError({ origError, errorType })

    expect(customError).to.be.instanceOf(CustomError)
    expect(customError).to.have.property('code', 'AUTH_ACCESS_DENIED')
    expect(customError).to.have.property('status', 403)
    expect(customError).to.have.property('message', 'Access denied.')
    expect(customError).to.have.property('origError', origError)
    expect(customError.origError.message).to.equal('Original error message')
  })

  it('should throw an error if origError is missing', () => {
    const errorType = ERROR_TYPES.auth.ACCESS_DENIED
  
    try {
      new CustomError({ errorType })
    } catch (error) {
      expect(error.message).to.equal('The "origError" parameter is required to create a CustomError.')
    }
  })
  
  it('should throw an error if errorType is malformed', () => {
    const origError = new Error('Original error message')
  
    try {
      new CustomError({ origError, errorType: { invalid: 'type' } })
      throw new Error('Expected an error to be thrown but none was thrown')
    } catch (error) {
      expect(error.message).to.equal(
        'The "errorType" parameter must be well-formed or will default to a generic error.'
      )
    }
  })
  
  it('should default to SERVER_ERROR if errorType is not provided', () => {
    const origError = new Error('Original error message')

    const customError = new CustomError({ origError })

    expect(customError).to.have.property('code', 'GENERAL_SERVER_ERROR')
    expect(customError).to.have.property('status', 500)
    expect(customError).to.have.property('message', 'An unexpected server error occurred.')
  })

  it('should assign additional fields', () => {
    const origError = new Error('Original error message')
    const errorType = ERROR_TYPES.movie.NOT_FOUND
    const additionalFields = { movieId: 12345, additionalInfo: 'Some info' }

    const customError = new CustomError({ origError, errorType, ...additionalFields })

    expect(customError).to.have.property('movieId', 12345)
    expect(customError).to.have.property('additionalInfo', 'Some info')
  })

  it('should retain the stack trace from origError', () => {
    const origError = new Error('Original error message')
    const errorType = ERROR_TYPES.user.VALIDATION_ERROR

    const customError = new CustomError({ origError, errorType })

    expect(customError).to.have.property('stack', origError.stack)
  })

  it('should return correct string representation from toString()', () => {
    const origError = new Error('Original error message')
    const errorType = ERROR_TYPES.general.NOT_FOUND

    const customError = new CustomError({ origError, errorType })

    expect(customError.toString()).to.equal(
      'CustomError: GENERAL_NOT_FOUND (Status: 404) - The requested resource was not found.'
    )
  })
})
