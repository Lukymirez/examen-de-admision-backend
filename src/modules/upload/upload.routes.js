import { Router } from 'express';

import { subirImagen, subirImagenMiddleware } from './upload.controller.js';
import { verificarToken, permitirRoles } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/imagen', verificarToken, permitirRoles('docente', 'comite'), subirImagenMiddleware, subirImagen);

export default router;
