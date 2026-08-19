import { Router } from 'express';

import {
  crearPregunta,
  crearPreguntasLote,
  listarMisPreguntas,
  listarTodas,
  validarPregunta,
  detectarDuplicados,
  progresoPorDocente,
  generarExamenAleatorio,
  cartillaRespuestas,
  editarPregunta,
  eliminarPregunta,
  validarPreguntaUnica,
  validarLotePreguntas,
} from './pregunta.controller.js';
import { verificarToken, permitirRoles } from '../../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas de este módulo requieren estar autenticado.
router.use(verificarToken);

// Docente y Comité pueden subir preguntas.
router.post('/', permitirRoles('docente', 'comite'), validarPreguntaUnica, crearPregunta);
router.post('/lote', permitirRoles('docente', 'comite'), validarLotePreguntas, crearPreguntasLote);

// Un Docente ve solo lo que él mismo subió.
router.get('/mias', permitirRoles('docente', 'comite'), listarMisPreguntas);

// Editar/eliminar una pregunta propia (solo mientras no esté "validada").
router.put('/:id', permitirRoles('docente', 'comite'), validarPreguntaUnica, editarPregunta);
router.delete('/:id', permitirRoles('docente', 'comite'), eliminarPregunta);

// Comité/Administrador: revisión, validación y generación del examen.
router.get('/', permitirRoles('comite', 'administrador'), listarTodas);
router.get('/duplicados', permitirRoles('comite', 'administrador'), detectarDuplicados);
router.get('/progreso-docentes', permitirRoles('comite', 'administrador'), progresoPorDocente);
router.put('/:id/validar', permitirRoles('comite'), validarPregunta);
router.post('/generar-examen', permitirRoles('comite'), generarExamenAleatorio);
router.get('/cartilla/:convocatoriaId', permitirRoles('comite', 'administrador'), cartillaRespuestas);

export default router;
