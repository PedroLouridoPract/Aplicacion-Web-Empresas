# Frontend: API y checklist MVP

Referencia rápida del frontend frente a la especificación (solo frontend).

## Rutas y páginas

| Ruta | Página | Notas |
|------|--------|--------|
| `/login` | LoginPage | Login; falta flujo registro empresa (POST /auth/register-company) |
| `/dashboard` | DashboardPage | KPI cards + productividad por usuario |
| `/projects` | ProjectsPage | Lista + crear proyecto |
| `/projects/:id/kanban` | ProjectKanbanPage | Columnas por estado; mover tarea vía botones (pendiente drag & drop) |
| `/projects/:id/executive` | ProjectExecutivePage | Atrasadas / Esta semana / Próxima semana |
| `/users` | UsersPage | Solo Admin (RequireRole) |

## Endpoints que consume el frontend

- **Auth:** `POST /auth/login`, `GET /auth/me`
- **Projects:** `GET /projects`, `POST /projects`
- **Tasks:** `GET /projects/:projectId/tasks`, `PATCH /tasks/:id/move` (body: `{ status, order_index }`)
- **Executive:** `GET /projects/:projectId/executive` → `{ overdue, this_week, next_week }`
- **Dashboard:** `GET /dashboard/summary`, `GET /dashboard/productivity`
- **Users:** `GET /users`

Pendientes de usar cuando se implementen las pantallas/acciones:

- `POST /auth/register-company` (alta empresa + admin)
- `GET /projects/:id`, `PATCH /projects/:id`, `DELETE /projects/:id`
- `POST /projects/:projectId/tasks`, `GET /tasks/:id`, `PATCH /tasks/:id`, `DELETE /tasks/:id`
- `GET /tasks/:id/comments`, `POST /tasks/:id/comments`
- `POST /users`, `PATCH /users/:id` (gestión usuarios/roles)

## Checklist MVP Frontend

- [x] Pantalla Login + persistencia token + /me
- [ ] Login + selector/alta de empresa (registro empresa)
- [x] Layout con nav: Proyectos / Kanban / Tabla / Dashboard / Usuarios
- [x] Vista proyectos (lista + crear)
- [ ] Vista detalle proyecto (opcional: editar, fechas, estado)
- [x] Kanban por proyecto (cambio de estado)
- [ ] Kanban con drag & drop (@dnd-kit)
- [x] Tabla ejecutiva por proyecto (overdue, this_week, next_week)
- [x] Dashboard (cards KPIs + productividad)
- [ ] Dashboard con gráficas (tareas por estado, etc.)
- [x] Usuarios (lista, solo Admin)
- [ ] Usuarios: crear/editar/rol (POST/PATCH)
- [x] RequireAuth + RequireRole(admin) para /users
- [ ] Ocultar botones/acciones según rol (Member/Guest)
- [ ] Tareas: modal crear/editar, asignar, prioridad, progreso
- [ ] Comentarios en tarea (lista + crear)
- [ ] Estados de carga/errores consistentes + toasts

## Estructura actual

```
app/
  api/http.js          # apiFetch + token
  auth/
    AuthContext.jsx    # user, login, logout, /me
    ProtectedRoute.jsx
    RequireRole.jsx
  components/
    KanbanColumn.jsx
    TaskCard.jsx
  layouts/
    AppLayout.jsx      # sidebar + nav
  pages/
    LoginPage.jsx
    DashboardPage.jsx
    ProjectsPage.jsx
    ProjectKanbanPage.jsx
    ProjectExecutivePage.jsx
    UsersPage.jsx
  router/router.jsx    # createBrowserRouter + guards
  main.jsx
  app.css
```

Variable de entorno: `VITE_API_BASE_URL` (ej. `http://localhost:3000`).
