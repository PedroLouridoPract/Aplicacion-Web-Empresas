# Siweb – Frontend

Frontend React (React Router 7) para la gestión de proyectos. Se conecta al backend API para auth, proyectos, tareas, dashboard y usuarios.

## Conectar al backend

1. **Copia la configuración de entorno** (si no existe ya `.env`):
   ```bash
   cp .env.example .env
   ```

2. **Edita `.env`** y pon la URL de tu API:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```
   - En **desarrollo local**: si el backend corre en el puerto 3000, `http://localhost:3000` es correcto.
   - Si el backend usa otro puerto, cámbialo (ej: `http://localhost:4000`).
   - En **producción**: usa la URL pública del API (ej: `https://api.midominio.com`).

3. **Reinicia el servidor de desarrollo** después de cambiar `.env`:
   ```bash
   npm run dev
   ```

El frontend usa esta URL para todas las peticiones: login, proyectos, tareas, dashboard, usuarios, etc.

---

# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
