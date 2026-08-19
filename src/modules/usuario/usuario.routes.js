import { Router } from 'express';

import {
  registrarUsuario,
  verificarCorreo,
  reenviarVerificacion,
  loginUsuario,
  listarPostulantes,
  listarDocentes,
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

export default router;
