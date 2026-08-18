import { Router } from 'express';

import { registrarPostulante, validarRegistroPostulante } from './postulante.controller.js';

const router = Router();

/**
 * POST /api/postulantes
 * HU-01: Registro e inscripción de un postulante.
 */
router.post('/', validarRegistroPostulante, registrarPostulante);

export default router;
