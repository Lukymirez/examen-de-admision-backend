# Guía de Contribución para el Equipo

Somos un equipo de 8 desarrolladores. Para mantener el código escalable y evitar conflictos, sigue estrictamente estas reglas. Todo el flujo de Git se hace desde la interfaz de **VS Code** (panel de "Source Control"), sin necesidad de escribir comandos en la terminal.

---

## 🌿 1. Reglas de Ramas (Branches)

**NUNCA trabajes directo en la rama `main`.** Siempre crea una rama nueva antes de tocar código:

- Tareas nuevas o módulos: `feature/nombre-del-modulo` (Ej: `feature/modulo-postulante`)
- Corrección de errores: `fix/nombre-del-error`

### Cómo crear una rama desde VS Code

1. Abre el panel de Control de Código Fuente: `Ctrl + Shift + G` (ícono de la ramita en la barra lateral izquierda).
2. En la **esquina inferior izquierda** de la ventana, haz clic sobre el nombre de la rama actual (normalmente dice `main`).
3. En el menú que aparece arriba, selecciona **"Create new branch..."**.
4. Escribe el nombre siguiendo la convención (ej. `feature/modulo-carrera`) y presiona Enter.
5. Verifica que la esquina inferior izquierda ahora muestre tu nueva rama — ahí es donde vas a trabajar.

---

## 💾 2. Reglas de Commits

Tus commits deben explicar QUÉ hiciste de forma clara. Usa estos prefijos en el mensaje:

- `feat:` Para código o funcionalidades nuevas.
- `fix:` Para reparar un bug.
- `docs:` Para actualizar documentación.

### Cómo hacer un commit desde VS Code

1. Con tu rama de trabajo activa, haz tus cambios de código normalmente y guarda los archivos (`Ctrl + S`).
2. Abre el panel de Source Control (`Ctrl + Shift + G`). Verás la lista de archivos modificados bajo **"Changes"**.
3. **Antes de continuar, revisa esa lista con cuidado.** NUNCA deben aparecer ahí las carpetas/archivos `node_modules/` ni `.env` (si aparecen, avisa al equipo antes de seguir — puede ser que el `.gitignore` no esté funcionando, y `.env` contiene contraseñas reales).
4. Pasa el mouse sobre la palabra **"Changes"** y haz clic en el ícono **"+"** que aparece a la derecha, para mandar todos los archivos a **"Staged Changes"**. (Si prefieres subir solo algunos archivos, usa el "+" individual de cada uno en vez del general.)
5. En la caja de texto de arriba, escribe tu mensaje de commit con el prefijo correspondiente, por ejemplo:
   ```
   feat: agregar modulo de carrera con modelo, controlador y rutas
   ```
6. Haz clic en el botón azul **"Commit"**.

---

## 🔀 3. Reglas de Pull Requests (PR)

1. Sube tu rama a GitHub: en VS Code, después de hacer commit, el botón de arriba cambiará a **"Publish Branch"** (la primera vez) o **"Sync Changes"** (las siguientes veces). Haz clic ahí.
   - Si VS Code te pide iniciar sesión en GitHub, sigue el flujo que te muestre (se abre el navegador para autorizar).
2. Ve a `https://github.com/alepaolo2003-a23p/Examen-de-Admision` en tu navegador.
3. Verás un banner amarillo indicando que tu rama tiene cambios recientes, con un botón **"Compare & pull request"**. Haz clic ahí.
4. Escribe un título claro (ej. "Módulo de Carrera") y una breve descripción de qué incluye el PR.
5. Clic en **"Create pull request"**.
6. Pide a un compañero que revise tu código (**1 aprobación requerida** antes de mergear). Mientras el equipo se termina de incorporar al repositorio, se permite auto-mergear como excepción temporal, pero la meta es siempre tener revisión cruzada.
7. Una vez aprobado, haz clic en **"Merge pull request"** → **"Confirm merge"** (esto se hace en GitHub, no en VS Code).
8. Puedes borrar la rama remota desde el mismo botón que aparece tras el merge (**"Delete branch"**) — no afecta tu copia local.

### Cómo actualizar tu `main` local después de un merge

1. En VS Code, haz clic en el nombre de tu rama (esquina inferior izquierda) y selecciona `main`.
2. Haz clic en el ícono de sincronización (flechas circulares) junto al nombre de la rama, o usa el menú "..." → **"Pull"**, para traer los cambios recién mergeados de GitHub a tu `main` local.
3. (Opcional) Borra tu rama de feature ya mergeada: menú de ramas → clic derecho sobre ella → **"Delete Branch"**.

---

## ⚠️ 4. Antes de empezar a trabajar cada día

1. Cambia a `main` en VS Code (esquina inferior izquierda).
2. Haz **Pull** (ícono de sincronización) para traer los últimos cambios del equipo.
3. Recién ahí, crea tu nueva rama `feature/...` desde `main` actualizado (Sección 1).

Esto evita trabajar sobre una versión vieja del código y reduce los conflictos al mergear.
