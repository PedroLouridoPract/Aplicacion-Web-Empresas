# Backend - Aplicación Web Empresas (SIWEB)

API REST para gestión de proyectos empresariales multi-tenant, construida con **Express 5**, **TypeScript**, **Prisma ORM** y **PostgreSQL**.

---

## Tabla de contenidos

- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Modelo de datos](#modelo-de-datos)
- [Instalación y configuración](#instalación-y-configuración)
- [Scripts disponibles](#scripts-disponibles)
- [Variables de entorno](#variables-de-entorno)
- [Autenticación y autorización](#autenticación-y-autorización)
- [Endpoints de la API](#endpoints-de-la-api)
- [Ejemplos de uso](#ejemplos-de-uso)
- [Probar con REST Client](#probar-con-rest-client)

---

## Tecnologías

| Componente        | Tecnología              |
| ----------------- | ----------------------- |
| Runtime           | Node.js + TypeScript 5  |
| Framework HTTP    | Express 5               |
| ORM               | Prisma 7                |
| Base de datos     | PostgreSQL 16 (Docker)  |
| Autenticación     | JWT (jsonwebtoken)      |
| Hash contraseñas  | bcrypt                  |
| Validación        | Zod 4                   |
| Seguridad headers | Helmet                  |
| Logs HTTP         | Morgan                  |

---

## Arquitectura

```
backend/
├── prisma/
│   ├── schema.prisma          # Modelo de datos
│   └── migrations/            # Historial de migraciones
├── src/
│   ├── config/env.ts          # Carga y validación de variables de entorno
│   ├── db/prisma.ts           # Instancia singleton de PrismaClient
│   ├── middleware/
│   │   ├── auth.ts            # Middleware JWT (authRequired)
│   │   ├── rbac.ts            # Control de acceso por rol (requireRole, requireAdmin)
│   │   └── error.ts           # Manejo global de errores y 404
│   ├── modules/
│   │   ├── auth/              # Registro de empresa, login, perfil
│   │   ├── projects/          # CRUD de proyectos
│   │   ├── tasks/             # Mover tareas (Kanban)
│   │   ├── comments/          # Comentarios en tareas
│   │   └── dashboard/         # KPIs y productividad
│   ├── utils/hash.ts          # Funciones de hash y comparación con bcrypt
│   ├── app.ts                 # Configuración de Express y rutas
│   └── server.ts              # Punto de entrada (listen)
├── docker-compose.yml         # PostgreSQL 16 Alpine en Docker
├── api.http                   # Colección de peticiones para REST Client
├── .env.example               # Plantilla de variables de entorno
├── package.json
└── tsconfig.json
```

Cada módulo sigue el patrón: **routes → controller → service → Prisma**.

---

## Modelo de datos

```
┌───────────┐       ┌───────────┐       ┌───────────┐
│  Company  │1────N│   User    │1────N│  Comment  │
│           │       │           │       │           │
│ id        │       │ id        │       │ id        │
│ name      │       │ name      │       │ body      │
│ createdAt │       │ email     │       │ taskId    │
└─────┬─────┘       │ role      │       │ authorId  │
      │             │ companyId │       │ companyId │
      │1            └─────┬─────┘       └───────────┘
      │                   │ assignee           ▲
      │N                  │                    │N
┌─────┴─────┐       ┌─────┴─────┐             │
│  Project  │1────N│   Task    │─────────────┘
│           │       │           │
│ id        │       │ id        │
│ name      │       │ title     │
│ status    │       │ status    │  (BACKLOG, IN_PROGRESS, REVIEW, DONE)
│ startDate │       │ priority  │  (HIGH, MEDIUM, LOW)
│ endDate   │       │ progress  │  (0..100)
│ companyId │       │ orderIndex│
└───────────┘       │ dueDate   │
                    │ companyId │
                    │ projectId │
                    └───────────┘
```

### Enumeraciones

| Enum         | Valores                                |
| ------------ | -------------------------------------- |
| `Role`       | `ADMIN`, `MEMBER`, `GUEST`             |
| `TaskStatus` | `BACKLOG`, `IN_PROGRESS`, `REVIEW`, `DONE` |
| `Priority`   | `HIGH`, `MEDIUM`, `LOW`                |

### Multi-tenancy

Todos los recursos incluyen un campo `companyId`. Las consultas filtran automáticamente por la empresa del usuario autenticado, garantizando aislamiento de datos entre empresas.

---

## Instalación y configuración

### Prerrequisitos

- **Node.js** >= 18
- **Docker** y **Docker Compose** (para PostgreSQL)
- **npm**

### Paso a paso

```bash
# 1. Ir a la carpeta del backend
cd Aplicacion-Web-Empresas/backend

# 2. Instalar dependencias
npm install

# 3. Levantar PostgreSQL con Docker
npm run db:up

# 4. Crear archivo de entorno
cp .env.example .env
# Editar .env con tus valores (ver sección Variables de entorno)

# 5. Generar el cliente de Prisma
npm run prisma:generate

# 6. Ejecutar migraciones (crea las tablas)
npm run prisma:migrate

# 7. Iniciar el servidor en modo desarrollo
npm run dev
```

El servidor arrancará en `http://localhost:3000` (o el puerto configurado en `.env`).

---

## Scripts disponibles

| Script               | Comando                    | Descripción                                 |
| -------------------- | -------------------------- | ------------------------------------------- |
| `npm run dev`        | `ts-node-dev ...`          | Inicia el servidor con hot-reload           |
| `npm run build`      | `tsc`                      | Compila TypeScript a JavaScript (`dist/`)   |
| `npm start`          | `node dist/server.js`      | Inicia la versión compilada (producción)    |
| `npm run prisma:generate` | `prisma generate`    | Genera/actualiza el cliente de Prisma       |
| `npm run prisma:migrate`  | `prisma migrate dev` | Crea y aplica migraciones de BD             |
| `npm run prisma:studio`   | `prisma studio`      | Abre la interfaz visual de Prisma (BD)      |
| `npm run db:up`      | `docker compose up -d`     | Levanta el contenedor de PostgreSQL         |
| `npm run db:down`    | `docker compose down`      | Detiene el contenedor de PostgreSQL         |

---

## Variables de entorno

Crear un archivo `.env` en la raíz de `backend/` basándose en `.env.example`:

| Variable        | Descripción                          | Ejemplo                                              |
| --------------- | ------------------------------------ | ---------------------------------------------------- |
| `DATABASE_URL`  | URL de conexión a PostgreSQL         | `postgresql://postgres:postgres@localhost:5432/app_empresas` |
| `JWT_SECRET`    | Clave secreta para firmar tokens JWT | `mi_clave_secreta_muy_larga`                         |
| `JWT_EXPIRES_IN`| Tiempo de expiración del token       | `7d`                                                 |
| `PORT`          | Puerto del servidor                  | `3000`                                               |

> **Nota:** Si usas el `docker-compose.yml` incluido, el usuario y contraseña por defecto de PostgreSQL son `postgres` / `postgres` y la base de datos es `app_empresas`.

---

## Autenticación y autorización

### JWT (JSON Web Token)

1. El usuario hace **login** con email y contraseña.
2. El servidor responde con un **token JWT** firmado.
3. Para acceder a rutas protegidas, se envía el token en la cabecera:
   ```
   Authorization: Bearer <token>
   ```
4. El payload del token contiene: `id`, `companyId`, `role`, `email`.
5. Por defecto, el token expira en **7 días**.

### Control de acceso por rol (RBAC)

| Rol      | Permisos                                                  |
| -------- | --------------------------------------------------------- |
| `ADMIN`  | Acceso total: crear, editar y eliminar proyectos; crear comentarios; ver dashboard |
| `MEMBER` | Ver proyectos; mover tareas; crear comentarios; ver dashboard |
| `GUEST`  | Solo lectura: ver proyectos y tareas; ver dashboard       |

---

## Endpoints de la API

Base URL: `http://localhost:3000`

### Salud

| Método | Ruta      | Auth | Descripción   |
| ------ | --------- | ---- | ------------- |
| `GET`  | `/health` | No   | Health check  |

**Respuesta:** `{ "ok": true }`

### Autenticación (`/auth`)

| Método | Ruta                    | Auth | Descripción                         |
| ------ | ----------------------- | ---- | ----------------------------------- |
| `POST` | `/auth/register-company`| No   | Registrar empresa y usuario admin   |
| `POST` | `/auth/login`           | No   | Iniciar sesión                      |
| `GET`  | `/auth/me`              | Sí   | Obtener perfil del usuario actual   |

### Proyectos (`/projects`)

| Método   | Ruta             | Auth | Rol     | Descripción            |
| -------- | ---------------- | ---- | ------- | ---------------------- |
| `GET`    | `/projects`      | Sí   | Todos   | Listar proyectos       |
| `GET`    | `/projects/:id`  | Sí   | Todos   | Obtener proyecto por ID|
| `POST`   | `/projects`      | Sí   | ADMIN   | Crear proyecto         |
| `PATCH`  | `/projects/:id`  | Sí   | ADMIN   | Actualizar proyecto    |
| `DELETE` | `/projects/:id`  | Sí   | ADMIN   | Eliminar proyecto      |

### Tareas (`/tasks`)

| Método  | Ruta                | Auth | Rol   | Descripción                       |
| ------- | ------------------- | ---- | ----- | --------------------------------- |
| `PATCH` | `/tasks/:id/move`   | Sí   | Todos | Mover tarea (status + orderIndex) |

### Comentarios (`/comments`)

| Método | Ruta                         | Auth | Rol            | Descripción                |
| ------ | ---------------------------- | ---- | -------------- | -------------------------- |
| `GET`  | `/comments/by-task/:taskId`  | Sí   | Todos          | Listar comentarios de tarea|
| `POST` | `/comments`                  | Sí   | ADMIN o MEMBER | Crear comentario           |

### Dashboard (`/dashboard`)

| Método | Ruta                       | Auth | Query params          | Descripción                  |
| ------ | -------------------------- | ---- | --------------------- | ---------------------------- |
| `GET`  | `/dashboard/summary`       | Sí   | `projectId?`          | KPIs y resumen de tareas     |
| `GET`  | `/dashboard/productivity`  | Sí   | `projectId?`, `days?` | Productividad por usuario    |

---

## Ejemplos de uso

### 1. Registrar una empresa

```bash
curl -X POST http://localhost:3000/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Mi Empresa",
    "adminName": "Juan Admin",
    "adminEmail": "juan@miempresa.com",
    "adminPassword": "contraseña_segura_123"
  }'
```

**Respuesta (201):**
```json
{
  "company": { "id": "clxxx...", "name": "Mi Empresa" },
  "admin": { "id": "clyyy...", "email": "juan@miempresa.com" }
}
```

### 2. Iniciar sesión

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@miempresa.com",
    "password": "contraseña_segura_123"
  }'
```

**Respuesta (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 3. Crear un proyecto (requiere token de ADMIN)

```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu_token>" \
  -d '{
    "name": "Proyecto Alpha",
    "description": "Primer proyecto de prueba",
    "startDate": "2026-03-01T00:00:00Z",
    "endDate": "2026-06-01T00:00:00Z"
  }'
```

**Respuesta (201):**
```json
{
  "project": {
    "id": "clzzz...",
    "name": "Proyecto Alpha",
    "description": "Primer proyecto de prueba",
    "status": "ACTIVE",
    "companyId": "clxxx..."
  }
}
```

### 4. Listar proyectos

```bash
curl http://localhost:3000/projects \
  -H "Authorization: Bearer <tu_token>"
```

### 5. Mover una tarea (Kanban)

```bash
curl -X PATCH http://localhost:3000/tasks/<taskId>/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu_token>" \
  -d '{
    "status": "IN_PROGRESS",
    "orderIndex": 0
  }'
```

### 6. Crear un comentario en una tarea

```bash
curl -X POST http://localhost:3000/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu_token>" \
  -d '{
    "taskId": "<taskId>",
    "body": "Este es un comentario de prueba"
  }'
```

### 7. Ver el dashboard (KPIs)

```bash
# Resumen general
curl http://localhost:3000/dashboard/summary \
  -H "Authorization: Bearer <tu_token>"

# Filtrado por proyecto
curl "http://localhost:3000/dashboard/summary?projectId=<projectId>" \
  -H "Authorization: Bearer <tu_token>"

# Productividad por usuario (últimos 30 días)
curl "http://localhost:3000/dashboard/productivity?days=30" \
  -H "Authorization: Bearer <tu_token>"
```

---

## Probar con REST Client

El archivo `api.http` incluido contiene todas las peticiones listas para usar con la extensión **REST Client** de VS Code/Cursor.

1. Abrir `api.http` en el editor.
2. Ejecutar "Registrar empresa" para crear una empresa y un admin.
3. Ejecutar "Login" para obtener el token.
4. Copiar el token en la variable `@token` al inicio del archivo.
5. Ejecutar cualquier petición autenticada.

---

## Estructura de respuestas de error

```json
{
  "message": "Descripción del error"
}
```

| Código | Significado                                |
| ------ | ------------------------------------------ |
| `400`  | Datos de entrada inválidos (validación Zod)|
| `401`  | No autenticado / token inválido o expirado |
| `403`  | Sin permisos (rol insuficiente)            |
| `404`  | Recurso no encontrado                      |
| `500`  | Error interno del servidor                 |
