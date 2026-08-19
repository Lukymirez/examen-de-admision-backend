import { Router } from 'express';

import { iniciarSimulacro, finalizarSimulacro, misResultados } from './simulacro.controller.js';
import { verificarToken, permitirRoles } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(verificarToken, permitirRoles('postulante'));

router.post('/iniciar', iniciarSimulacro);
router.post('/:id/finalizar', finalizarSimulacro);
router.get('/mis-resultados', misResultados);

export default router;
