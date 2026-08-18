import { Router } from 'express';

import { crearCarrera, listarCarreras, validarCarrera } from './carrera.controller.js';
import { verificarToken, permitirRoles } from '../../middleware/auth.middleware.js';

const router = Router();

// Pública: el Home y el formulario de registro la usan para listar carreras
router.get('/', listarCarreras);

// Protegida: solo administrador/comité pueden crear carreras
router.post('/', verificarToken, permitirRoles('administrador', 'comite'), validarCarrera, crearCarrera);

export default router;
