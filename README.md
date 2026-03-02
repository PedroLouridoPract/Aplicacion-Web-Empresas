# 📊 Siweb Project Manager

Aplicación web empresarial para la gestión integral de proyectos, tareas y productividad de equipos.

Combina funcionalidades tipo:

- 🟦 **Trello** (Vista Kanban)
- 🟪 **Asana** (Gestión estructurada empresarial)
- 🟩 **Dashboard ejecutivo con métricas**

Todo desarrollado internamente.

---

## 🚀 Descripción General

Siweb Project Manager es una plataforma multi-empresa que permite:

- Organizar proyectos  
- Gestionar tareas  
- Visualizar el trabajo del equipo  
- Medir productividad  
- Analizar el estado general de la empresa  

Cada empresa tiene sus propios datos completamente aislados.

---

## 🏢 Arquitectura del Sistema

La aplicación está dividida en:

### 🔹 Frontend
- React
- React Router v7
- Interfaz moderna e interactiva
- Vista Kanban
- Dashboard con métricas
- Tabla ejecutiva para reuniones

### 🔹 Backend
- Node.js
- API REST
- Control de permisos y roles
- Sistema multi-tenant (aislamiento por empresa)
- Base de datos relacional

---

## 🧠 ¿Cómo funciona la aplicación?

### 1️⃣ Empresas

Cada empresa tiene:

- Sus usuarios
- Sus proyectos
- Sus tareas

🔒 Una empresa **NO puede ver datos de otra**.

---

### 2️⃣ Proyectos

Cada proyecto contiene:

- Nombre
- Descripción
- Fechas
- Estado

Ejemplo:

Empresa: Agencia Marketing  
Proyecto: Lanzamiento nueva web  

---

### 3️⃣ Tareas

Cada proyecto contiene tareas como:

- Diseñar home  
- Hacer SEO  
- Preparar campaña Ads  

Cada tarea incluye:

- Título
- Descripción
- Responsable
- Fecha límite
- Prioridad (alta / media / baja)
- Estado
- Progreso (%)
- Comentarios

---

### 4️⃣ Vista Kanban

Tablero visual con columnas:

| Backlog | En proceso | En revisión | Finalizado |

Las tareas pueden moverse entre columnas.

Cuando una tarea cambia de columna:
- Se actualiza automáticamente su estado.

---

### 5️⃣ Vista Tabla Ejecutiva

Diseñada para reuniones y seguimiento estratégico.

Agrupa tareas en:

- Atrasadas
- Esta semana
- Próxima semana

Cada fila muestra:

- Tarea
- Responsable
- Estado
- Prioridad
- Barra de progreso
- Fecha límite

---

### 6️⃣ Dashboard Ejecutivo

Panel superior con métricas clave:

- Tareas atrasadas
- Tareas por estado
- Productividad por usuario
- Gráficas de rendimiento

Diseñado para supervisión gerencial.

---

## 👥 Sistema de Roles

Control de permisos basado en roles:

### 👑 Admin
- Gestiona usuarios
- Crea / elimina proyectos
- Acceso completo al dashboard

### 👤 Miembro
- Edita sus propias tareas
- Actualiza progreso y estado

### 👀 Invitado
- Solo lectura

---

## 🧱 Arquitectura Técnica

### Base de Datos

Tablas principales:

- Company
- User
- Project
- Task
- Comment

Cada registro incluye `company_id` para garantizar aislamiento de datos.

---

### Backend

Responsable de:

- Autenticación (JWT)
- Control de permisos
- Validaciones
- Lógica de negocio
- Endpoints REST
- Métricas agregadas para dashboard

---

### Frontend

Responsable de:

- Interfaz de usuario
- Visualización Kanban
- Filtros y tablas
- Consumo de API
- Experiencia interactiva

---

## 🔐 Seguridad

- Aislamiento por empresa (multi-tenant)
- Middleware de permisos
- Validaciones de rol
- Autenticación con token
- Protección de rutas

---

## 📦 Funcionalidades MVP

- Registro de empresa
- Login de usuario
- CRUD de proyectos
- CRUD de tareas
- Vista Kanban
- Vista Tabla Ejecutiva
- Dashboard con métricas
- Gestión básica de usuarios

---

## 📈 Futuras mejoras

- Drag & Drop avanzado
- Notificaciones en tiempo real
- Sistema de etiquetas
- Subtareas
- Reportes exportables
- Integración con herramientas externas

---

## 🛠️ Tecnologías

### Frontend
- React
- React Router v7
- Vite

### Backend
- Node.js
- Express / NestJS
- PostgreSQL
- JWT

---


