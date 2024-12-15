import cors from 'cors'

// Define orígenes aceptados
const ACCEPTED_ORIGINS = [
  // 'http://example.com', // Añade dominios específicos
  // 'http://anotherdomain.com' // Añade otros dominios según sea necesario
]

// Middleware CORS personalizado
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permitir solicitudes sin origen (por ejemplo, herramientas locales como `curl`)
    if (!origin) {
      return callback(null, true)
    }

    // Permitir todas las solicitudes de localhost sin importar el puerto
    if (origin.startsWith('http://localhost')) {
      return callback(null, true)
    }

    // Verificar si el origen está en la lista de permitidos
    if (ACCEPTED_ORIGINS.includes(origin)) {
      return callback(null, true)
    }

    // Si el origen no es permitido, bloquear y registrar un mensaje de error
    console.error(`Bloqueado por CORS: origen no permitido - ${origin}`)
    return callback(new Error('Not allowed by CORS'))
  },
})
