# Guía de Instalación y Herramientas — Sistema de Examen de Admisión

Este documento reúne **todo lo que se necesita instalar y configurar** para trabajar en este proyecto, ya sea como parte del equipo de desarrollo o como referencia para un futuro despliegue en un entorno de cliente. La idea es que cualquier persona nueva pueda quedar lista para trabajar sin tener que buscar cada herramienta por su cuenta.

---

## 1. Software obligatorio

| Herramienta | Uso en el proyecto | Enlace de descarga |
|---|---|---|
| **Node.js** (versión LTS más reciente) | Entorno de ejecución de JavaScript en el servidor | https://nodejs.org |
| **Yarn** | Gestor de paquetes del proyecto (no se usa npm) | Se instala con `npm install -g yarn` una vez tengas Node.js |
| **Git** | Control de versiones | https://git-scm.com |
| **Visual Studio Code** | Editor de código recomendado por el equipo | https://code.visualstudio.com |
| **Cuenta de MongoDB Atlas** | Base de datos en la nube (plan gratuito M0 alcanza para desarrollo) | https://www.mongodb.com/cloud/atlas |
| **Cuenta de GitHub** con acceso al repositorio | Para poder clonar, subir ramas y crear Pull Requests | Pedir acceso al administrador del repositorio |

## 2. Software recomendado (no obligatorio, pero facilita el trabajo)

| Herramienta | Para qué sirve | Enlace |
|---|---|---|
| **Insomnia** (o Postman / Thunder Client) | Probar los endpoints de la API sin necesidad de un frontend | https://insomnia.rest |
| **MongoDB Compass** | Ver y editar visualmente los datos de MongoDB Atlas, sin depender solo de la interfaz web | https://www.mongodb.com/products/compass |

## 3. Extensiones recomendadas para VS Code

Instalar desde la pestaña de Extensiones (`Ctrl+Shift+X`):

| Extensión | Motivo |
|---|---|
| **ESLint** | Detecta errores y malas prácticas de JavaScript en tiempo real |
| **Prettier - Code formatter** | Formatea el código de forma consistente entre todo el equipo |
| **DotENV** | Resalta la sintaxis de los archivos `.env` |
| **GitLens** | Facilita ver el historial y autoría de cambios directamente en el editor |
| **MongoDB for VS Code** | Permite conectarse y explorar la base de datos Atlas sin salir del editor |
| **Thunder Client** (alternativa a Insomnia) | Cliente REST integrado directamente en VS Code |

---

## 4. Dependencias del proyecto (ya definidas en `package.json`)

Estas se instalan automáticamente al ejecutar `yarn install` — no es necesario instalarlas una por una. Se documentan aquí para que quede claro qué hace cada una y por qué está en el proyecto.

### Dependencias de producción

| Paquete | Función dentro del proyecto |
|---|---|
| `express` | Framework para construir la API REST |
| `mongoose` | Modelado de datos y conexión con MongoDB |
| `cors` | Habilita peticiones entre distintos orígenes (frontend ↔ backend) |
| `bcryptjs` | Cifrado de contraseñas (para autenticación futura) |
| `jsonwebtoken` | Generación y verificación de tokens de sesión (JWT) |
| `multer` | Manejo de carga de archivos (ej. fotos de postulantes, certificados) |
| `dotenv` | Carga variables de entorno desde el archivo `.env` |
| `helmet` | Añade cabeceras HTTP de seguridad por defecto |
| `morgan` | Registra en consola cada petición que recibe el servidor |
| `express-validator` | Valida y sanitiza los datos que llegan en las peticiones |

### Dependencias de desarrollo

| Paquete | Función dentro del proyecto |
|---|---|
| `nodemon` | Reinicia el servidor automáticamente al guardar cambios en el código |

---

## 5. Pasos para dejar el proyecto funcionando desde cero

1. **Clonar el repositorio:**
   ```
   git clone https://github.com/alepaolo2003-a23p/Examen-de-Admision.git
   ```
   (También puede hacerse desde VS Code: `Ctrl+Shift+P` → "Git: Clone" → pegar la URL.)

2. **Instalar las dependencias:**
   ```
   yarn install
   ```

3. **Configurar las variables de entorno:**
   - Copiar el archivo `.env.example` y renombrar la copia a `.env`.
   - Completar `MONGO_URI` con la cadena de conexión real de MongoDB Atlas (ver sección 6).
   - Definir `PORT` (por defecto `3000`) y `JWT_SECRET`.

4. **Levantar el servidor en modo desarrollo:**
   ```
   yarn dev
   ```

5. **Verificar que todo funciona:**
   - En consola debe aparecer `[Server] Escuchando en el puerto 3000` y `[MongoDB] Conectado correctamente`.
   - Probar en el navegador o en Insomnia: `GET http://localhost:3000/api/health` debe responder `200 OK`.

## 6. Configuración de MongoDB Atlas (resumen)

1. Crear una cuenta en Atlas y un clúster gratuito (M0).
2. En **Database Access**, crear un usuario de base de datos con su contraseña.
3. En **Network Access**, permitir la IP desde la que te conectas (o `0.0.0.0/0` solo en entornos de prueba).
4. En **Connect → Drivers**, copiar la cadena de conexión y pegarla en `MONGO_URI` dentro de `.env`, agregando el nombre de la base de datos después del último `/` (ej. `.../admision_2026?retryWrites=true&w=majority`).

## 7. Flujo de trabajo en equipo

El detalle completo de cómo crear ramas, hacer commits y subir Pull Requests desde VS Code está documentado en **`CONTRIBUTING.md`**. Este documento (`GUIA_INSTALACION.md`) cubre únicamente la parte de *qué instalar*; `CONTRIBUTING.md` cubre *cómo colaborar* una vez que el entorno ya está funcionando.

---

## 8. Nota para un futuro despliegue en producción / entrega a cliente

Cuando el proyecto esté listo para desplegarse fuera del entorno de desarrollo del equipo, se deberá documentar además:

- Proveedor de hosting elegido para el backend (ej. Render, Railway, un VPS propio).
- Clúster de MongoDB Atlas de producción (separado del clúster de pruebas del equipo).
- Variables de entorno de producción (nunca las mismas credenciales que en desarrollo).
- Proceso de build y despliegue continuo (CI/CD), si se llega a implementar.

Esta sección se completará más adelante, cuando el proyecto esté listo para esa etapa.
