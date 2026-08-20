import { Router } from 'express';

import {
  registrarUsuario,
  verificarCorreo,
  reenviarVerificacion,
  loginUsuario,
  listarPostulantes,
  listarDocentes,
  listarPagos,
  verificarPagoTesoreria,
  validarPago,
  miCarrera,
  actualizarSegundaOpcion,
  miMatricula,
  actualizarMiMatricula,
  agregarPago,
  eliminarPago,
  validarRegistro,
  validarLogin,
} from './usuario.controller.js';
import { verificarToken, permitirRoles } from '../../middleware/auth.middleware.js';

const router = Router();

// Registro: crea la cuenta como "usuario temporal" y envía correo de verificación real
router.post('/registro', validarRegistro, registrarUsuario);

// Verificación de correo mediante el token recibido por email
router.get('/verificar/:token', verificarCorreo);

// Reenvío del correo de verificación (si expiró o no llegó)
router.post('/reenviar-verificacion', reenviarVerificacion);

// Login: solo permitido si la cuenta ya fue verificada
router.post('/login', validarLogin, loginUsuario);

// Panel administrativo: seguimiento de postulantes y docentes
router.get('/postulantes', verificarToken, permitirRoles('administrador'), listarPostulantes);
router.get('/docentes', verificarToken, permitirRoles('administrador', 'comite'), listarDocentes);

// Administrador: revisar y aprobar/rechazar pagos (HU-17/CU-08). Al aprobar
// lo suficiente, habilita la postulación y genera el código único (HU-02/HU-03).
// Tesorería y Administrador pueden VER los pagos.
router.get('/pagos', verificarToken, permitirRoles('administrador', 'tesoreria'), listarPagos);

// Tesorería solo puede marcar como "verificado contra el banco" — no habilita nada.
router.put('/pagos/:postulanteId/:indice/verificar', verificarToken, permitirRoles('tesoreria'), verificarPagoTesoreria);

// Administrador es el ÚNICO que aprueba/rechaza — y por lo tanto, el único
// que puede habilitar la postulación y generar el código único.
router.put('/pagos/:postulanteId/:indice', verificarToken, permitirRoles('administrador'), validarPago);

// Postulante: ver/editar su carrera y segunda opción
router.get('/mi-carrera', verificarToken, permitirRoles('postulante'), miCarrera);
router.put('/mi-carrera', verificarToken, permitirRoles('postulante'), actualizarSegundaOpcion);

// Postulante: completar documentos y pago de matrícula
router.get('/mi-matricula', verificarToken, permitirRoles('postulante'), miMatricula);
router.put('/mi-matricula', verificarToken, permitirRoles('postulante'), actualizarMiMatricula);
router.post('/mi-matricula/pago', verificarToken, permitirRoles('postulante'), agregarPago);
router.delete('/mi-matricula/pago/:indice', verificarToken, permitirRoles('postulante'), eliminarPago);

export default router;
