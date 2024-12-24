import { expect } from 'chai'
import sinon from 'sinon'
import { MovieController } from '../../../src/controllers/movieController.js'
import { validateMovie, validatePartialMovie } from '../../../src/utils/movieValidation.js'
import { CustomError } from '../../../src/errors/customError.js'

describe('MovieController', () => {
  let movieController
  let movieModelMock
  let req, res, next

  beforeEach(() => {
    // Mock del modelo
    movieModelMock = {
      getAll: sinon.stub(),
      getById: sinon.stub(),
      create: sinon.stub(),
      delete: sinon.stub(),
      update: sinon.stub(),
    }

    // Inicializar el controlador con el modelo mockeado
    movieController = new MovieController({ movieModel: movieModelMock })

    // Simulación de req, res y next
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

  // Pruebas para getAll
  describe('getAll', () => {
    it('debería devolver todas las películas', async () => {
      const mockMovies = [{ id: 1, title: 'Movie A' }]
      movieModelMock.getAll.resolves(mockMovies)

      await movieController.getAll(req, res, next)

      expect(movieModelMock.getAll.calledOnce).to.be.true
      expect(res.json.calledWith(mockMovies)).to.be.true
    })

    it('debería pasar un CustomError a next si falla la obtención de películas', (done) => {
      movieModelMock.getAll.rejects(new Error('DB Error'))

      // Llama al controlador
      movieController.getAll(req, res, next)

      // Usa setImmediate para dejar que asyncHandler procese el error
      setImmediate(() => {
        try {
          expect(next.calledOnce).to.be.true
          const error = next.args[0][0]
          expect(error).to.be.instanceOf(CustomError)
          expect(error.message).to.equal('Error fetching movie data.')
          done()
        }
        catch (err) {
          done(err) // Finaliza la prueba con error si algo falla
        }
      })
    })
  })

  // Pruebas para getById
  describe('getById', () => {
    it('debería devolver una película por ID', async () => {
      req.params.id = '1'
      const mockMovie = { id: 1, title: 'Movie A' }
      movieModelMock.getById.resolves(mockMovie)

      await movieController.getById(req, res, next)

      expect(movieModelMock.getById.calledWith({ id: '1' })).to.be.true
      expect(res.json.calledWith(mockMovie)).to.be.true
    })

    it('Using setImmediate. debería pasar un CustomError a next si la película no existe', (done) => {
      req.params.id = '1'
      movieModelMock.getById.resolves(null)

      movieController.getById(req, res, next)

      setImmediate(() => {
        try {
          expect(next.calledOnce).to.be.true
          const error = next.args[0][0]
          expect(error).to.be.instanceOf(CustomError)
          expect(error.message).to.equal('Movie with id 1 not found')
          done()
        }
        catch (err) {
          done(err)
        }
      })
    })

    it('Using async await.debería pasar un CustomError a next si la película no existe', async () => {
      req.params.id = '1'
      movieModelMock.getById.resolves(null)

      await movieController.getById(req, res, next)

      expect(next.calledOnce).to.be.true // Verify `next` was called once
      const error = next.args[0][0] // Access the error passed to `next`
      expect(error).to.be.instanceOf(CustomError) // Ensure it's a `CustomError`
      expect(error.message).to.equal('Movie with id 1 not found') // Check the error message
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
