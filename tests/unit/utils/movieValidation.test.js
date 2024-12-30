import * as chai from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)
const { expect } = chai

describe('MovieValidation', () => {
  let validateMovie
  let validatePartialMovie
  let validatorEscapeStub

  beforeEach(async () => {
    validatorEscapeStub = sinon.stub().callsFake((input) => input)

    const MockedValidation = await esmock('../../../src/utils/movieValidation.js', {
      validator: { escape: validatorEscapeStub },
    })

    validateMovie = MockedValidation.validateMovie
    validatePartialMovie = MockedValidation.validatePartialMovie
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('validateMovie', () => {
    it('should validate a correct movie input', async () => {
      const input = {
        title: 'Inception',
        year: 2010,
        director: 'Christopher Nolan',
        duration: 148,
        rate: 8.8,
        poster: 'https://example.com/inception.jpg',
        genre: ['Action', 'Sci-Fi'],
      }

      const result = await validateMovie(input)

      expect(result).to.be.true
      expect(validatorEscapeStub.calledTwice).to.be.true
    })

    it('should return an error for missing required fields', async () => {
      const input = {
        year: 2010,
        director: 'Christopher Nolan',
      }

      const result = await validateMovie(input)

      expect(result).to.be.false
    })

    it('should return an error for invalid URL', async () => {
      const input = {
        title: 'Inception',
        year: 2010,
        director: 'Christopher Nolan',
        duration: 148,
        rate: 8.8,
        poster: 'not-a-valid-url',
        genre: ['Action', 'Sci-Fi'],
      }

      const result = await validateMovie(input)

      expect(result).to.be.false
    })
  })

  describe('validatePartialMovie', () => {
    it('should validate partial input with some fields missing', async () => {
      const input = {
        title: 'Interstellar',
        rate: 9.0,
      }

      const result = await validatePartialMovie(input)

      expect(result).to.be.true
    })

    it('should allow empty input', async () => {
      const input = {}

      const result = await validatePartialMovie(input)

      expect(result).to.be.true
    })

    it('should return errors for invalid fields in partial input', async () => {
      const input = {
        title: 123,
        rate: 15,
      }

      const result = await validatePartialMovie(input)

      expect(result).to.be.false
    })
  })
})
