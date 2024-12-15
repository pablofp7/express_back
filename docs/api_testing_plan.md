
# Plan de Pruebas para la API Movie and User Management

## Introducción

Este documento detalla el plan de pruebas para la API Movie and User Management basada en el esquema proporcionado (OpenAPI 3.1.1). Las pruebas se dividen en unitarias, de integración y funcionales, y abarcan los endpoints definidos en el archivo `openapi.yaml`. El objetivo es garantizar la calidad y fiabilidad de la API en todos los niveles.

---

## Tipos de Pruebas y Orden de Implementación

### 1. **Pruebas Unitarias**

Probar unidades de código aisladas, como funciones, middlewares o controladores. Estas pruebas aseguran que las piezas individuales de la API funcionan correctamente.

#### **Componentes a Probar**

- **`dbConnection.js` (Abstracción de conexión a bases de datos):**

  - Validar la conexión a:
    - MySQL local.
    - FreeSQL (MySQL online).
    - Turso (SQLite online).
  - Simular consultas simples (éxito y error).

- **Middlewares:**

  - **`authMiddleware.js`**:
    - Rechazar solicitudes sin token.
    - Aceptar solicitudes con tokens válidos.
    - Detectar permisos insuficientes.
  - **`validateRefreshMiddleware.js`**:
    - Validar cookies con refresh token.
    - Manejar tokens inválidos o caducados.

- **Utilidades (`src/utils`)**:

  - Validar UUIDs.
  - Probar errores personalizados y funciones de validación de entrada.

---

### 2. **Pruebas de Integración**

Probar la interacción entre módulos y rutas.

#### **Componentes a Probar**

- **Rutas protegidas por middlewares:**

  - Probar `authMiddleware` para verificar tokens y permisos.
  - Validar que `validateRefreshMiddleware` permite la emisión de nuevos access tokens.

- **Rutas CRUD (Usuarios y Películas):**

  - Verificar la correcta interacción entre las rutas, controladores y modelos.
  - Simular datos con bases de datos en memoria o mocks.

#### **Casos Clave:**

- Probar interacciones con bases de datos reales y simuladas.
- Validar respuestas para entradas válidas e inválidas.

---

### 3. **Pruebas Funcionales**

Probar el funcionamiento completo de los endpoints.

#### **Endpoints a Probar (Según OpenAPI):**

##### **Usuarios:**

- **POST `/user/login`**:

  - Probar login con credenciales válidas e inválidas.
  - Validar la emisión correcta de access tokens y refresh tokens.

- **POST `/user/register`**:

  - Crear usuarios con datos válidos.
  - Manejar errores de validación.

- **GET `/user/refresh-token`**:

  - Solicitar un nuevo access token con un refresh token válido.
  - Manejar errores de tokens inválidos o ausentes.

- **DELETE `/user/{id}`**:

  - Probar eliminación de usuarios con rol admin.
  - Validar errores como token inválido, permisos insuficientes o usuario no encontrado.

##### **Películas:**

- **GET `/movies`**:

  - Validar que devuelve una lista de películas con un token válido.

- **POST `/movies`**:

  - Crear películas con datos válidos (solo admin).
  - Manejar errores de validación y permisos.

- **PATCH `/movies/{id}`**:

  - Actualizar películas con datos válidos.
  - Probar errores de permisos o películas inexistentes.

- **DELETE `/movies/{id}`**:

  - Eliminar películas como admin.
  - Validar errores como película no encontrada o permisos insuficientes.

---

### 4. **Pruebas de Extremo a Extremo (E2E)**

Opcional para simular el uso completo de la API desde el punto de vista de un cliente.

#### **Flujos a Probar:**

- **Usuario:**

  1. Registro.
  2. Login.
  3. Crear recursos (ej. películas).
  4. Actualizar y eliminar recursos.
  5. Logout.

- **Autenticación y autorización:**

  - Probar el acceso con diferentes roles.
  - Verificar el manejo de tokens caducados.

---

## Herramientas Utilizadas

- **Mocha:** Framework de pruebas.
- **Chai:** Biblioteca para aserciones.
- **Supertest:** Simulación de solicitudes HTTP.
- **Sinon:** Mocks y stubs para pruebas unitarias.
- **nyc:** Medición de cobertura de código.

---

## Configuración Inicial

1. Instalar dependencias:
   ```bash
   npm install --save-dev mocha chai supertest sinon nyc
   ```
2. Crear directorio `tests/` con subdirectorios según los componentes:
   ```
   tests/
   ├── controllers/
   ├── middlewares/
   ├── routes/
   ├── utils/
   └── models/
   ```
3. Configurar el script de pruebas en `package.json`:
   ```json
   "scripts": {
     "test": "mocha --recursive tests"
   }
   ```
4. Ejecutar pruebas:
   ```bash
   npm test
   ```
5. Medir cobertura:
   ```bash
   npx nyc npm test
   ```

---

## Próximos Pasos

1. **Implementar Pruebas Unitarias:**
   Comenzar por los middlewares y utilidades básicas para validar su funcionamiento en aislamiento.

2. **Configurar Bases de Datos Mock:**
   Crear un entorno controlado para probar interacciones con `dbConnection.js` y los modelos.

3. **Diseñar Pruebas de Integración:**
   Simular solicitudes HTTP a las rutas principales y verificar la interacción entre módulos.

4. **Definir Flujos E2E:**
   Simular escenarios reales desde el punto de vista del cliente para validar la API en su totalidad.

5. **Automatizar Pruebas:**
   Configurar un pipeline de CI/CD (ej., GitHub Actions) para ejecutar las pruebas en cada cambio del código.
