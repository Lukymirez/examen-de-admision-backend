import { Router } from 'express';

import { subirImagen, subirImagenMiddleware, subirDocumento, subirDocumentoMiddleware } from './upload.controller.js';
import { verificarToken, permitirRoles } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/imagen', verificarToken, permitirRoles('docente', 'comite'), subirImagenMiddleware, subirImagen);
router.post('/documento', verificarToken, permitirRoles('postulante'), subirDocumentoMiddleware, subirDocumento);

export default router;
