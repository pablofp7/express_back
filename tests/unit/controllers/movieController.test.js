import { expect } from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'
import { validateMovie, validatePartialMovie } from '../../../src/utils/movieValidation.js'

describe('MovieController', () => {
  let movieController
  let movieModelMock
  let req, res, next
  let checkUUIDStub

  beforeEach(async () => {
    // Stub for `checkUUID`
    checkUUIDStub = sinon.stub()

    // Dynamically mock the module using esmock
    const { MovieController } = await esmock('../../../src/controllers/movieController.js', {
      '../../../src/utils/uuidValidation.js': { checkUUID: checkUUIDStub },
    })

    // Mock del modelo
    movieModelMock = {
      getAll: sinon.stub(),
      getById: sinon.stub(),
      create: sinon.stub(),
      delete: sinon.stub(),
      update: sinon.stub(),
    }

    // Initialize the controller with the mocked model
    movieController = new MovieController({ movieModel: movieModelMock })

    // Mock req, res, and next
    req = { params: {}, body: {}, query: {} }
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    }
    next = sinon.stub()
  })

  afterEach(() => {
    sinon.restore() // Restore all stubs/mocks
  })

  describe('getAll', () => {
    it('debería devolver todas las películas', async () => {
      const mockMovies = [{ id: 1, title: 'Movie A' }]
      movieModelMock.getAll.resolves(mockMovies)

      await movieController.getAll(req, res, next)

      expect(movieModelMock.getAll.calledOnce).to.be.true
      expect(res.json.calledWith(mockMovies)).to.be.true
    })

    it('debería devolver un array vacío si no hay películas', async () => {
      movieModelMock.getAll.resolves([]) // Simula que no hay películas

      await movieController.getAll(req, res, next)

      expect(movieModelMock.getAll.calledOnce).to.be.true
      expect(res.json.calledWith([])).to.be.true // Comprueba que devuelve un array vacío
    })

    it('debería propagar errores de la capa de base de datos', (done) => {
      const dbError = new Error('DB Query Failed') // Puede ser cualquier error
      movieModelMock.getAll.rejects(dbError) // Simula un rechazo

      // Llama al controlador
      movieController.getAll(req, res, next)

      // Usa setImmediate para dejar que asyncHandler maneje el error
      setImmediate(() => {
        try {
          expect(next.calledOnce).to.be.true
          expect(next.calledWith(dbError)).to.be.true // Verifica que el mismo error se propaga
          done()
        }
        catch (err) {
          done(err) // Finaliza la prueba con error si algo falla
        }
      })
    })
  })

  describe('getById', () => {
    it('debería devolver una película por ID', async () => {
      req.params.id = '1'
      const mockMovie = { id: 1, title: 'Movie A' }

      checkUUIDStub.resolves(true) // Simula que el UUID es válido
      movieModelMock.getById.resolves(mockMovie) // Configura el mock para devolver una película

      await movieController.getById(req, res, next)

      // Verifica que checkUUID fue llamado con el ID correcto
      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      // Verifica que getById fue llamado con los argumentos correctos
      expect(movieModelMock.getById.calledWith({ id: '1' })).to.be.true
      // Verifica que la respuesta contiene la película esperada
      expect(res.json.calledWith(mockMovie)).to.be.true
    })

    it('debería pasar un CustomError a next si la película no existe', (done) => {
      req.params.id = '1'

      checkUUIDStub.resolves(true) // Simula que el UUID es válido
      movieModelMock.getById.resolves(null) // Simula que no se encuentra la película

      movieController.getById(req, res, next)

      setImmediate(() => {
        try {
          // Verifica que next fue llamado
          expect(next.calledOnce).to.be.true
          // Verifica que el error pasado es un CustomError
          const error = next.args[0][0]
          expect(error).to.be.instanceOf(CustomError)
          expect(error.errorType).to.equal(ERROR_TYPES.movie.NOT_FOUND) // Verifica el tipo de error
          done()
        }
        catch (err) {
          done(err) // Finaliza el test con error si algo falla
        }
      })
    })

    it('debería pasar un CustomError a next si el UUID es inválido', (done) => {
      req.params.id = 'invalid-uuid'

      checkUUIDStub.resolves(false) // Simula que el UUID no es válido

      movieController.getById(req, res, next)

      setImmediate(() => {
        try {
          // Verifica que next fue llamado
          expect(next.calledOnce).to.be.true
          // Verifica que el error pasado es un CustomError
          const error = next.args[0][0]
          expect(error).to.be.instanceOf(CustomError)
          expect(error.errorType).to.equal(ERROR_TYPES.general.INVALID_UUID) // Verifica el tipo de error
          done()
        }
        catch (err) {
          done(err) // Finaliza el test con error si algo falla
        }
      })
    })
  })

  // Pruebas para create
  describe('create', () => {
    it('debería crear una nueva película cuando la validación es exitosa', async () => {
      const validMovie = {
        title: 'Inception',
        year: 2010,
        director: 'Christopher Nolan',
        duration: 148,
        rate: 8.8,
        poster: 'http://example.com/poster.jpg',
        genre: ['Sci-Fi', 'Action'],
      }

      sinon.stub(validateMovie, 'call').resolves({ success: true, data: validMovie })
      const createdMovie = { id: 1, ...validMovie }
      movieModelMock.create.resolves(createdMovie)

      req.body = validMovie

      await movieController.create(req, res, next)

      expect(movieModelMock.create.calledWith({ input: validMovie })).to.be.true
      expect(res.status.calledWith(201)).to.be.true
      expect(res.json.calledWith(createdMovie)).to.be.true
    })

    it('debería pasar un CustomError a next si la validación falla', (done) => {
      sinon.stub(validateMovie, 'call').resolves({
        success: false,
        error: { message: 'Validation failed' },
      })

      req.body = {}

      movieController.create(req, res, next)
        .then(() => done(new Error('La prueba debería haber llamado a next con un error.')))
        .catch(() => {
          expect(next.calledOnce).to.be.true
          const error = next.args[0][0]
          expect(error).to.be.instanceOf(CustomError)
          expect(error.message).to.equal('Movie validation failed')
          done()
        })
    })
  })

  describe('delete', () => {
    it('debería eliminar una película por ID', async () => {
      req.params.id = '1'
      movieModelMock.delete.resolves(true)

      await movieController.delete(req, res, next)

      expect(movieModelMock.delete.calledWith({ id: '1' })).to.be.true
      expect(res.json.calledWith({ message: 'Movie deleted' })).to.be.true
    })

    it('debería pasar un CustomError a next si la película no se encuentra', async () => {
      req.params.id = '1'
      movieModelMock.delete.resolves(false)

      movieController.delete(req, res, next)

      expect(next.calledOnce).to.be.true
      const error = next.args[0][0]
      expect(error).to.be.instanceOf(CustomError)
      expect(error.message).to.equal('Movie with id 1 not found')
    })
  })

  describe('update', () => {
    it('debería actualizar una película cuando la validación es exitosa', async () => {
      const partialUpdate = { rate: 9.0 }

      sinon.stub(validatePartialMovie, 'call').resolves({ success: true, data: partialUpdate })
      const updatedMovie = { id: 1, title: 'Inception', rate: 9.0 }
      movieModelMock.update.resolves(updatedMovie)

      req.params.id = '1'
      req.body = partialUpdate

      await movieController.update(req, res, next)

      expect(movieModelMock.update.calledWith({ id: '1', input: partialUpdate })).to.be.true
      expect(res.json.calledWith(updatedMovie)).to.be.true
    })

    it('debería pasar un CustomError a next si la validación falla', async () => {
      sinon.stub(validatePartialMovie, 'call').resolves({
        success: false,
        error: { message: 'Validation failed' },
      })

      req.body = { rate: 11 }

      movieController.update(req, res, next)

      expect(next.calledOnce).to.be.true
      const error = next.args[0][0]
      expect(error).to.be.instanceOf(CustomError)
      expect(error.message).to.equal('Partial movie validation failed')
    })
  })
})
