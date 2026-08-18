import { Router } from 'express';

import { crearConvocatoria, listarConvocatorias, validarConvocatoria } from './convocatoria.controller.js';
import { verificarToken, permitirRoles } from '../../middleware/auth.middleware.js';

const router = Router();

// Pública: el Home del frontend la usa para mostrar el proceso de admisión vigente
router.get('/', listarConvocatorias);

// Protegida: solo administrador/comité pueden crear convocatorias (HU-07)
router.post('/', verificarToken, permitirRoles('administrador', 'comite'), validarConvocatoria, crearConvocatoria);

export default router;
