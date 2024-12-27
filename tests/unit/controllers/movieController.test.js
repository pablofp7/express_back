import * as chai from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'
import chaiAsPromised from 'chai-as-promised'
import { checkErrorType } from '../../testUtils/checkErrorType.js'

chai.use(chaiAsPromised)
const { expect } = chai

describe('MovieController', () => {
  let movieController
  let movieModelMock
  let req, res, next
  let checkUUIDStub
  let validateMovieStub
  let validatePartialMovieStub

  beforeEach(async () => {
    checkUUIDStub = sinon.stub()
    validateMovieStub = sinon.stub()
    validatePartialMovieStub = sinon.stub()

    const MockedController = await esmock('../../../src/controllers/movieController.js', {
      '../../../src/utils/uuidValidation.js': { checkUUID: checkUUIDStub },
      '../../../src/utils/movieValidation.js': {
        validateMovie: validateMovieStub,
        validatePartialMovie: validatePartialMovieStub,
      },
    })

    movieModelMock = {
      getAll: sinon.stub(),
      getById: sinon.stub(),
      create: sinon.stub(),
      delete: sinon.stub(),
      update: sinon.stub(),
    }

    movieController = new MockedController.MovieController({ movieModel: movieModelMock })

    req = { params: {}, body: {}, query: {} }
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    }
    next = sinon.stub()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('getAll', () => {
    it('debería devolver todas las películas', async () => {
      const mockMovies = [{ id: 1, title: 'Movie A' }]
      movieModelMock.getAll.resolves(mockMovies)

      await movieController.getAll(req, res, next)

      expect(movieModelMock.getAll.calledOnce).to.be.true
      expect(res.json.calledOnceWith(mockMovies)).to.be.true
    })

    it('debería devolver un array vacío si no hay películas', async () => {
      movieModelMock.getAll.resolves([])

      await movieController.getAll(req, res, next)

      expect(movieModelMock.getAll.calledOnce).to.be.true
      expect(res.json.calledOnceWith([])).to.be.true
    })
  })
  describe('getById', () => {
    it('debería devolver una película por ID', async () => {
      req.params.id = '1'
      const mockMovie = { id: 1, title: 'Movie A' }

      checkUUIDStub.resolves(true)
      movieModelMock.getById.resolves(mockMovie)

      await movieController.getById(req, res, next)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(movieModelMock.getById.calledOnceWith({ id: '1' })).to.be.true
      expect(res.json.calledOnceWith(mockMovie)).to.be.true
    })

    it('debería lanzar un CustomError si la película no existe', async () => {
      req.params.id = '1'

      checkUUIDStub.resolves(true)
      movieModelMock.getById.resolves(null)

      try {
        await movieController.getById(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }
    })

    it('debería lanzar un CustomError si el UUID es inválido', async () => {
      req.params.id = 'invalid-uuid'

      checkUUIDStub.resolves(false)

      try {
        await movieController.getById(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }
    })
  })

  describe('create', () => {
    it('debería crear una película con datos válidos', async () => {
      req.body = { title: 'Movie A', genre: 'Action' }
      const mockMovie = { id: 1, title: 'Movie A', genre: 'Action' }

      validateMovieStub.resolves(true)
      movieModelMock.create.resolves(mockMovie)

      await movieController.create(req, res, next)

      expect(validateMovieStub.calledOnceWith(req.body)).to.be.true
      expect(movieModelMock.create.calledOnceWith({ input: req.body })).to.be.true
      expect(res.status.calledOnceWith(201)).to.be.true
      expect(res.json.calledOnceWith(mockMovie)).to.be.true
    })

    it('debería lanzar un CustomError si los datos de la película no son válidos', async () => {
      req.body = { title: 'Invalid Movie', genre: '' }

      validateMovieStub.resolves(false)

      try {
        await movieController.create(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(validateMovieStub.calledOnce).to.be.true
      expect(validateMovieStub.args[0][0]).to.deep.equal(req.body)
    })
  })

  describe('delete', () => {
    it('debería eliminar correctametne una película por ID', async () => {
      req.params.id = '1'

      checkUUIDStub.resolves(true)
      movieModelMock.delete.resolves(true)

      await movieController.delete(req, res, next)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(movieModelMock.delete.calledOnceWith({ id: '1' })).to.be.true
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ message: 'Movie deleted' })).to.be.true
    }),
    it('debería lanzar un CustomError si el ID de la película no es válido', async () => {
      req.params.id = 'Invalid ID'
      checkUUIDStub.resolves(false)
      movieModelMock.delete.resolves(true)

      try {
        await movieController.delete(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(checkUUIDStub.calledOnceWith('Invalid ID')).to.be.true
      expect(movieModelMock.delete.called).to.be.false
    })
  }),
  it('debería lanzar un CustomError si la película no existe', async () => {
    req.params.id = '1'

    checkUUIDStub.resolves(true)
    movieModelMock.delete.resolves({ affectedRows: 0 })

    try {
      await movieController.delete(req, res, next)
    }
    catch (error) {
      expect(error).to.be.instanceOf(CustomError)
      expect(error.origError).to.be.instanceOf(Error)
      expect(checkErrorType(error.errorType)).to.be.true
    }

    expect(checkUUIDStub.calledOnceWith('1')).to.be.true
    expect(movieModelMock.delete.calledOnceWith({ id: '1' })).to.be.true
  }),

  describe('update', () => {
    it('debería actualizar una película con datos válidos', async () => {
      req.params.id = '1'
      req.body = { title: 'Updated Title', genre: 'Drama' }
      const mockResult = { affectedRows: 1 }

      checkUUIDStub.resolves(true)
      validatePartialMovieStub.resolves(true)
      movieModelMock.update.resolves(mockResult)

      await movieController.update(req, res, next)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(validatePartialMovieStub.calledOnceWith(req.body)).to.be.true
      expect(movieModelMock.update.calledOnceWith({
        id: '1',
        fields: [['title', 'Updated Title']],
        genre: 'Drama',
      })).to.be.true
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ message: 'Movie updated successfully' })).to.be.true
    })

    it('debería lanzar un CustomError si el UUID es inválido', async () => {
      req.params.id = 'invalid-uuid'
      req.body = { title: 'Updated Title', genre: 'Drama' }

      checkUUIDStub.resolves(false)

      try {
        await movieController.update(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(checkUUIDStub.calledOnceWith('invalid-uuid')).to.be.true
      expect(validatePartialMovieStub.called).to.be.false
      expect(movieModelMock.update.called).to.be.false
    })

    it('debería lanzar un CustomError si los datos son inválidos', async () => {
      req.params.id = '1'
      req.body = { title: '', genre: '' }

      checkUUIDStub.resolves(true)
      validatePartialMovieStub.resolves(false)

      try {
        await movieController.update(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(validatePartialMovieStub.calledOnceWith(req.body)).to.be.true
      expect(movieModelMock.update.called).to.be.false
    })

    it('debería lanzar un CustomError si no se proporcionan campos válidos para actualizar', async () => {
      req.params.id = '1'
      req.body = { invalidField: 'Invalid' }

      checkUUIDStub.resolves(true)
      validatePartialMovieStub.resolves(true)

      try {
        await movieController.update(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(validatePartialMovieStub.calledOnceWith(req.body)).to.be.true
      expect(movieModelMock.update.called).to.be.false
    })

    it('debería lanzar un CustomError si la película no existe', async () => {
      req.params.id = '1'
      req.body = { title: 'Updated Title', genre: 'Drama' }

      checkUUIDStub.resolves(true)
      validatePartialMovieStub.resolves(true)
      movieModelMock.update.resolves({ affectedRows: 0 })

      try {
        await movieController.update(req, res, next)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(validatePartialMovieStub.calledOnceWith(req.body)).to.be.true
      expect(movieModelMock.update.calledOnceWith({
        id: '1',
        fields: [['title', 'Updated Title']],
        genre: 'Drama',
      })).to.be.true
    })
  })
})
