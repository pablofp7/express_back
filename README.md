# README - Back End para Movie and User Management

## Descripción

Este proyecto es un backend desarrollado con **Express.js** que sigue la arquitectura **Modelo-Vista-Controlador (MVC)**. Ofrece funcionalidades para la gestión de usuarios y películas, incluyendo autenticación, autorización y operaciones CRUD.

## Funcionalidades Principales

### Usuarios

- Registro de nuevos usuarios.
- Inicio de sesión con emisión de tokens:
  - **Access Token**: Token de corta duración para acceder a recursos protegidos.
  - **Refresh Token**: Token de larga duración enviado en una cookie segura.
- Renovación del Access Token utilizando el Refresh Token.
- Recuperación de información de usuarios.
- Actualización y eliminación de usuarios (requiere permisos de administrador).

### Películas

- Recuperación de la lista completa de películas.
- Creación, actualización y eliminación de películas (requiere permisos de administrador).
- Recuperación de información de películas por ID.

## Tecnologías y Herramientas

- **Node.js**
- **Express.js**
- **MySQL**, **SQLite** y **MongoDB** (soportado por una capa de abstracción de bases de datos `dbConnection.js`).
- **JWT (JSON Web Tokens)** para autenticación y autorización.
- **Middleware personalizados**:
  - `authMiddleware.js`: Verifica tokens de acceso y permisos.
  - `validateRefreshMiddleware.js`: Valida tokens de refresco para renovación.
- **OpenAPI 3.1.1** para la documentación de la API.

## Instalación

1. Clona este repositorio:

   ```bash
   git clone <URL_DEL_REPOSITORIO>

   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno:
   Copia el archivo .env.example y renńombralo como .env:

   ```bash
   cp .env.example .env
   ```

   A continuación, edita el archivo .env y completa las variables necesarias según tu entorno.

4. Inicia el servidor según la base de datos que quieras usar:

   Para usar MySQL:

   ```bash
   npm run start:mysql
   ```

   Para usar la base de datos local o mongoDB:

   ```bash
   npm run start:local
   ```

   o

   ```bash
   npm run start:mongo
   ```

   El servidor se ejecutará en el puerto definido en el archivo .env (por defecto, 33333).

   NOTA: Para local y sobre todo mongo no está la funcionalidad completa, se empezó a desarrollar con las tres opciones para aprender inyección de dependecias con varios modelos y demás, pero el avance final solo se llevó a cabo con las BBDD SQL (hay varios tipos).

## Uso

### Endpoints Clave

#### Usuarios

- **POST `/user/login`**:  
  Inicia sesión y devuelve tokens de acceso y refresco.
- **POST `/user/register`**:  
  Registra un nuevo usuario.
- **GET `/user/refresh-token`**:  
  Renueva el token de acceso usando el refresh token.
- **POST `/user/logout`**:  
  Cierra la sesión de un usuario autenticado, invalidando sus tokens.
- **DELETE `/user/{id}`**:  
  Elimina un usuario (requiere rol admin).
- **PATCH `/user/{id}`**:  
  Actualiza información de un usuario (requiere rol admin).
- **GET `/user/:username`**:  
  Devuelve la información de un usuario dado su nombre de usuario.

#### Películas

- **GET `/movies`**:
  Recupera todas las películas.
- **POST `/movies`**:
  Crea una nueva película (requiere rol admin).
- **GET `/movies/{id}`**:
  Recupera información de una película por ID.
- **PATCH `/movies/{id}`**:
  Actualiza una película (requiere rol admin).
- **DELETE `/movies/{id}`**:
  Elimina una película (requiere rol admin).

### Autenticación

- **Access Token**: Enviado en el header `Authorization: Bearer <token>`.
- **Refresh Token**: Enviado en una cookie `refresh-token` con propiedades `HttpOnly` y `SameSite` para mayor seguridad.

## Testing

Este proyecto incluye un plan de pruebas detallado dividido en diferentes niveles:

- **Pruebas unitarias**:  
  Validan el correcto funcionamiento de componentes individuales, como middlewares, controladores y utilidades.

- **Pruebas de integración**:  
  Verifican la interacción entre rutas, middlewares y bases de datos.

- **Pruebas funcionales**:  
  Validan el comportamiento completo de los endpoints principales.

- **Pruebas E2E (End-to-End)**:  
  Simulan flujos completos desde el punto de vista del cliente.

### **Ejecución de Pruebas**

Puedes ejecutar todas las pruebas o seleccionar un tipo específico usando los siguientes comandos:

- **Todas las pruebas**:

  ```bash
  npm test
  ```

- **Pruebas unitarias**:

  ```bash
  npm run test:unit
  ```

- **Pruebas de integración**:

  ```bash
  npm run test:integration
  ```

- **Pruebas funcionales**:

  ```bash
  npm run test:functional
  ```

- **Pruebas E2E**:
  ```bash
  npm run test:e2e
  ```

### **Cobertura de Pruebas**

Para medir la cobertura de las pruebas, utiliza el siguiente comando:

```bash
npx nyc npm test
```

Esto generará un informe de cobertura que indica qué partes del código están probadas y cuáles no.

<!-- ## Contribución

1. Realiza un fork de este repositorio.
2. Crea una nueva rama para tus cambios:
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. Envía tus cambios en un pull request.

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más información. -->
