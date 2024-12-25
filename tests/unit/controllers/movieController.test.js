import * as chai from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'
import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised) // Configuración de chai-as-promised
const { expect } = chai // Usa el expect configurado

describe('MovieController', () => {
  let movieController
  let movieModelMock
  let req, res, next
  let checkUUIDStub
  let validateMovieStub
  let validatePartialMovieStub

  beforeEach(async () => {
    // Stub para `checkUUID`
    checkUUIDStub = sinon.stub()
    validateMovieStub = sinon.stub() // Stub para `validateMovie`
    validatePartialMovieStub = sinon.stub() // Stub para `validatePartialMovie`

    const MockedController = await esmock('../../../src/controllers/movieController.js', {
      '../../../src/utils/uuidValidation.js': { checkUUID: checkUUIDStub },
      '../../../src/utils/movieValidation.js': {
        validateMovie: validateMovieStub,
        validatePartialMovie: validatePartialMovieStub,
      },
    })

    // Mock del modelo
    movieModelMock = {
      getAll: sinon.stub(),
      getById: sinon.stub(),
      create: sinon.stub(),
      delete: sinon.stub(),
      update: sinon.stub(),
    }

    // Inicializa el controlador con el modelo mockeado
    movieController = new MockedController.MovieController({ movieModel: movieModelMock })

    // Asigna valores a req, res y next ya declarados
    req = { params: {}, body: {}, query: {} }
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    }
    next = sinon.stub()
  })

  afterEach(() => {
    sinon.restore() // Restaura todos los mocks y stubs
  })

  describe('getAll', () => {
    it('debería devolver todas las películas', async () => {
      const mockMovies = [{ id: 1, title: 'Movie A' }]
      movieModelMock.getAll.resolves(mockMovies) // Simula que la base de datos devuelve una lista de películas

      await movieController.getAll(req, res, next)

      expect(movieModelMock.getAll.calledOnce).to.be.true // Verifica que el método getAll fue llamado una vez
      expect(res.json.calledOnceWith(mockMovies)).to.be.true // Verifica que se devuelve la respuesta esperada
    })

    it('debería devolver un array vacío si no hay películas', async () => {
      movieModelMock.getAll.resolves([]) // Simula que la base de datos no devuelve películas

      await movieController.getAll(req, res, next)

      expect(movieModelMock.getAll.calledOnce).to.be.true // Verifica que el método getAll fue llamado una vez
      expect(res.json.calledOnceWith([])).to.be.true // Verifica que la respuesta es un array vacío
    })
  })
  describe('getById', () => {
    it('debería devolver una película por ID', async () => {
      req.params.id = '1'
      const mockMovie = { id: 1, title: 'Movie A' }

      checkUUIDStub.resolves(true) // Simula que el UUID es válido
      movieModelMock.getById.resolves(mockMovie) // Configura el mock para devolver una película

      await movieController.getById(req, res, next)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(movieModelMock.getById.calledOnceWith({ id: '1' })).to.be.true
      expect(res.json.calledOnceWith(mockMovie)).to.be.true
    })

    it('debería lanzar un CustomError si la película no existe', async () => {
      req.params.id = '1'

      checkUUIDStub.resolves(true) // Simula que el UUID es válido
      movieModelMock.getById.resolves(null) // Simula que no se encuentra la película

      // Verifica que se lanza un CustomError
      await expect(movieController.getById(req, res, next)).to.be.rejectedWith(CustomError)

      // Verifica el tipo específico del error
      await expect(movieController.getById(req, res, next)).to.be.rejectedWith(ERROR_TYPES.movie.NOT_FOUND)
    })

    it('debería lanzar un CustomError si el UUID es inválido', async () => {
      req.params.id = 'invalid-uuid'

      checkUUIDStub.resolves(false) // Simula que el UUID no es válido

      await expect(movieController.getById(req, res, next)).to.be.rejectedWith(CustomError)
      await expect(movieController.getById(req, res, next)).to.be.rejectedWith(ERROR_TYPES.general.INVALID_UUID)
    })
  })

  describe('create', () => {
    it('debería crear una película con datos válidos', async () => {
      req.body = { title: 'Movie A', genre: 'Action' } // Simula los datos de entrada
      const mockMovie = { id: 1, title: 'Movie A', genre: 'Action' }

      validateMovieStub.resolves(true) // Simula que la validación pasa
      movieModelMock.create.resolves(mockMovie) // Simula que la película es creada

      await movieController.create(req, res, next)

      expect(validateMovieStub.calledOnceWith(req.body)).to.be.true // Verifica que se validaron los datos
      expect(movieModelMock.create.calledOnceWith({ input: req.body })).to.be.true // Verifica que se llamó a create
      expect(res.status.calledOnceWith(201)).to.be.true // Verifica el código de estado
      expect(res.json.calledOnceWith(mockMovie)).to.be.true // Verifica la respuesta
    })

    it('debería lanzar un CustomError si los datos de la película no son válidos', async () => {
      req.body = { title: 'Invalid Movie', genre: '' } // Datos inválidos

      validateMovieStub.resolves(false) // Simula que la validación falla

      // Llama al método una vez y captura el Promise
      const createPromise = movieController.create(req, res, next)

      // Verifica que el Promise sea rechazado con el error esperado
      await expect(createPromise).to.be.rejectedWith(CustomError)
      await expect(createPromise).to.be.rejectedWith(ERROR_TYPES.movie.VALIDATION_ERROR)

      // Verifica que el stub fue llamado exactamente una vez
      expect(validateMovieStub.calledOnce).to.be.true
      expect(validateMovieStub.args[0][0]).to.deep.equal(req.body) // Verifica los argumentos
    })
  })

  describe('delete', () => {
    it('debería eliminar correctametne una película por ID', async () => {
      req.params.id = '1'

      checkUUIDStub.resolves(true) // Simula que el UUID es válido
      movieModelMock.delete.resolves(true) // Simula que la película fue eliminada

      await movieController.delete(req, res, next)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(movieModelMock.delete.calledOnceWith({ id: '1' })).to.be.true
      expect(res.status.calledOnceWith(200)).to.be.true
      expect(res.json.calledOnceWith({ message: 'Movie deleted' })).to.be.true
    }),
    it('debería lanzar un CustomError si el ID de la película no es válido', async () => {
      req.params.id = 'Invalid ID'
      checkUUIDStub.resolves(false) // Simula que el UUID no es válido
      movieModelMock.delete.resolves(true) // Simula que la película fue eliminada

      const createPromise = movieController.delete(req, res, next)

      await expect(createPromise).to.be.rejectedWith(CustomError)
      await expect(createPromise).to.be.rejectedWith(ERROR_TYPES.general.INVALID_UUID)

      expect(checkUUIDStub.calledOnceWith('Invalid ID')).to.be.true
      expect(movieModelMock.delete.called).to.be.false
    })
  }),
  it('debería lanzar un CustomError si la película no existe', async () => {
    req.params.id = '1'

    checkUUIDStub.resolves(true) // Simula que el UUID es válido
    movieModelMock.delete.resolves({ affectedRows: 0 }) // Simula que no se encuentra la película

    const createPromise = movieController.delete(req, res, next)

    await expect(createPromise).to.be.rejectedWith(CustomError)
    await expect(createPromise).to.be.rejectedWith(ERROR_TYPES.movie.NOT_FOUND)

    expect(checkUUIDStub.calledOnceWith('1')).to.be.true
    expect(movieModelMock.delete.calledOnceWith({ id: '1' })).to.be.true
  }),

  describe('update', () => {
    it('debería actualizar una película con datos válidos', async () => {
      req.params.id = '1'
      req.body = { title: 'Updated Title', genre: 'Drama' } // Datos válidos
      const mockResult = { affectedRows: 1 }

      checkUUIDStub.resolves(true) // UUID válido
      validatePartialMovieStub.resolves(true) // Validación exitosa
      movieModelMock.update.resolves(mockResult) // Simula que se actualizó la película

      await movieController.update(req, res, next)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true // Verifica que se validó el UUID
      expect(validatePartialMovieStub.calledOnceWith(req.body)).to.be.true // Verifica la validación
      expect(movieModelMock.update.calledOnceWith({
        id: '1',
        fields: [['title', 'Updated Title']],
        genre: 'Drama',
      })).to.be.true // Verifica la actualización
      expect(res.status.calledOnceWith(200)).to.be.true // Código de estado correcto
      expect(res.json.calledOnceWith({ message: 'Movie updated successfully' })).to.be.true // Respuesta correcta
    })

    it('debería lanzar un CustomError si el UUID es inválido', async () => {
      req.params.id = 'invalid-uuid'
      req.body = { title: 'Updated Title', genre: 'Drama' }

      checkUUIDStub.resolves(false) // UUID inválido

      const updatePromise = movieController.update(req, res, next)

      await expect(updatePromise).to.be.rejectedWith(CustomError)
      await expect(updatePromise).to.be.rejectedWith(ERROR_TYPES.general.INVALID_UUID)

      expect(checkUUIDStub.calledOnceWith('invalid-uuid')).to.be.true
      expect(validatePartialMovieStub.called).to.be.false // Validación no debería ser llamada
      expect(movieModelMock.update.called).to.be.false // No debería llamar al modelo
    })

    it('debería lanzar un CustomError si los datos son inválidos', async () => {
      req.params.id = '1'
      req.body = { title: '', genre: '' } // Datos inválidos

      checkUUIDStub.resolves(true) // UUID válido
      validatePartialMovieStub.resolves(false) // Validación fallida

      const updatePromise = movieController.update(req, res, next)

      await expect(updatePromise).to.be.rejectedWith(CustomError)
      await expect(updatePromise).to.be.rejectedWith(ERROR_TYPES.movie.VALIDATION_ERROR)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(validatePartialMovieStub.calledOnceWith(req.body)).to.be.true // Validación intentada
      expect(movieModelMock.update.called).to.be.false // No debería llamar al modelo
    })

    it('debería lanzar un CustomError si no se proporcionan campos válidos para actualizar', async () => {
      req.params.id = '1'
      req.body = { invalidField: 'Invalid' } // Ningún campo permitido

      checkUUIDStub.resolves(true) // UUID válido
      validatePartialMovieStub.resolves(true) // Validación exitosa

      const updatePromise = movieController.update(req, res, next)

      await expect(updatePromise).to.be.rejectedWith(CustomError)
      await expect(updatePromise).to.be.rejectedWith(ERROR_TYPES.movie.VALIDATION_ERROR)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(validatePartialMovieStub.calledOnceWith(req.body)).to.be.true
      expect(movieModelMock.update.called).to.be.false // No debería llamar al modelo
    })

    it('debería lanzar un CustomError si la película no existe', async () => {
      req.params.id = '1'
      req.body = { title: 'Updated Title', genre: 'Drama' } // Datos válidos

      checkUUIDStub.resolves(true) // UUID válido
      validatePartialMovieStub.resolves(true) // Validación exitosa
      movieModelMock.update.resolves({ affectedRows: 0 }) // Película no encontrada

      const updatePromise = movieController.update(req, res, next)

      await expect(updatePromise).to.be.rejectedWith(CustomError)
      await expect(updatePromise).to.be.rejectedWith(ERROR_TYPES.movie.NOT_FOUND)

      expect(checkUUIDStub.calledOnceWith('1')).to.be.true
      expect(validatePartialMovieStub.calledOnceWith(req.body)).to.be.true
      expect(movieModelMock.update.calledOnceWith({
        id: '1',
        fields: [['title', 'Updated Title']],
        genre: 'Drama',
      })).to.be.true // Intentó actualizar
    })
  })
})
