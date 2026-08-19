import crypto from 'crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

import Usuario from './usuario.model.js';
import { enviarCorreoVerificacion } from '../../services/email.service.js';

const TOKEN_EXPIRA_HORAS = 24;

/**
 * Reglas de validación para el registro de usuario/postulante.
 */
export const validarRegistro = [
  body('nombres').trim().notEmpty().withMessage('Los nombres son obligatorios.'),
  body('apellidos').trim().notEmpty().withMessage('Los apellidos son obligatorios.'),
  body('dni')
    .trim()
    .notEmpty()
    .withMessage('El DNI es obligatorio.')
    .isLength({ min: 8, max: 8 })
    .withMessage('El DNI debe tener 8 dígitos.')
    .isNumeric()
    .withMessage('El DNI solo debe contener números.'),
  body('email').trim().notEmpty().withMessage('El correo es obligatorio.').isEmail().withMessage('El correo no tiene un formato válido.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres.'),
  // Datos personales (CU-03)
  body('fechaNacimiento').notEmpty().withMessage('La fecha de nacimiento es obligatoria.').isISO8601().withMessage('Fecha de nacimiento inválida.'),
  body('sexo').isIn(['masculino', 'femenino', 'otro']).withMessage('Selecciona una opción válida.'),
  body('direccion').trim().notEmpty().withMessage('La dirección es obligatoria.'),
  body('telefono').trim().notEmpty().withMessage('El teléfono es obligatorio.'),
  body('estadoCivil').isIn(['soltero', 'casado', 'viudo', 'divorciado']).withMessage('Selecciona una opción válida.'),
  // Datos académicos (CU-04)
  body('colegio').trim().notEmpty().withMessage('El colegio de procedencia es obligatorio.'),
  body('anioEgreso').isInt({ min: 1970, max: new Date().getFullYear() }).withMessage('Año de egreso inválido.'),
  body('modalidadIngreso').isIn(['ordinario', 'CEPRE', 'traslado', 'EBR/EBA']).withMessage('Selecciona una modalidad válida.'),
  body('carreraId').notEmpty().withMessage('Debes elegir una carrera.').isMongoId().withMessage('La carrera seleccionada no es válida.'),
  body('sede').trim().notEmpty().withMessage('La sede es obligatoria.'),
  body('turno').isIn(['diurno', 'nocturno']).withMessage('Selecciona un turno válido.'),
];

export const validarLogin = [
  body('email').trim().notEmpty().isEmail().withMessage('El correo no es válido.'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria.'),
];

/**
 * POST /api/auth/registro
 * Crea la cuenta como "usuario temporal" (emailVerificado: false, estado: 'temporal')
 * y envía el correo real de verificación mediante Nodemailer.
 */
export const registrarUsuario = async (req, res) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const {
      nombres,
      apellidos,
      dni,
      email,
      password,
      fechaNacimiento,
      sexo,
      direccion,
      telefono,
      estadoCivil,
      colegio,
      anioEgreso,
      modalidadIngreso,
      carreraId,
      sede,
      turno,
    } = req.body;

    const existente = await Usuario.findOne({ $or: [{ email: email.toLowerCase() }, { dni }] });
    if (existente) {
      return res.status(409).json({
        mensaje:
          existente.email === email.toLowerCase()
            ? 'Ya existe una cuenta registrada con este correo.'
            : 'Ya existe una cuenta registrada con este DNI.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const tokenVerificacion = crypto.randomBytes(32).toString('hex');
    const tokenVerificacionExpira = new Date(Date.now() + TOKEN_EXPIRA_HORAS * 60 * 60 * 1000);

    const nuevoUsuario = await Usuario.create({
      nombres,
      apellidos,
      dni,
      email: email.toLowerCase(),
      password: passwordHash,
      fechaNacimiento,
      sexo,
      direccion,
      telefono,
      estadoCivil,
      colegio,
      anioEgreso,
      modalidadIngreso,
      carreraId,
      sede,
      turno,
      estado: 'temporal',
      emailVerificado: false,
      tokenVerificacion,
      tokenVerificacionExpira,
    });

    try {
      await enviarCorreoVerificacion({ destinatario: nuevoUsuario.email, nombre: nombres, token: tokenVerificacion });
    } catch (errorCorreo) {
      // La cuenta ya quedó creada; el usuario puede pedir un reenvío si el correo falla.
      console.error(`[Email] Error al enviar verificación: ${errorCorreo.message}`);
    }

    return res.status(201).json({
      mensaje: 'Cuenta creada como usuario temporal. Revisa tu correo para verificar tu cuenta antes de iniciar sesión.',
      usuario: {
        id: nuevoUsuario._id,
        email: nuevoUsuario.email,
        estado: nuevoUsuario.estado,
      },
    });
  } catch (error) {
    console.error(`[Usuario] Error al registrar: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al procesar el registro.' });
  }
};

/**
 * GET /api/auth/verificar/:token
 * Activa la cuenta (usuario temporal -> usuario activo) si el token es válido y no expiró.
 */
export const verificarCorreo = async (req, res) => {
  try {
    const { token } = req.params;

    const usuario = await Usuario.findOne({
      tokenVerificacion: token,
      tokenVerificacionExpira: { $gt: new Date() },
    }).select('+tokenVerificacion +tokenVerificacionExpira');

    if (!usuario) {
      return res.status(400).json({ mensaje: 'El enlace de verificación es inválido o expiró. Solicita uno nuevo.' });
    }

    usuario.emailVerificado = true;
    usuario.estado = 'activo';
    usuario.tokenVerificacion = undefined;
    usuario.tokenVerificacionExpira = undefined;
    await usuario.save();

    return res.status(200).json({ mensaje: 'Correo verificado correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error(`[Usuario] Error al verificar correo: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al verificar el correo.' });
  }
};

/**
 * POST /api/auth/reenviar-verificacion
 * Genera un nuevo token y reenvía el correo, por si el enlace expiró o no llegó.
 */
export const reenviarVerificacion = async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await Usuario.findOne({ email: (email || '').toLowerCase() });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'No existe una cuenta con ese correo.' });
    }
    if (usuario.emailVerificado) {
      return res.status(400).json({ mensaje: 'Este correo ya fue verificado. Puedes iniciar sesión.' });
    }

    const tokenVerificacion = crypto.randomBytes(32).toString('hex');
    usuario.tokenVerificacion = tokenVerificacion;
    usuario.tokenVerificacionExpira = new Date(Date.now() + TOKEN_EXPIRA_HORAS * 60 * 60 * 1000);
    await usuario.save();

    await enviarCorreoVerificacion({ destinatario: usuario.email, nombre: usuario.nombres, token: tokenVerificacion });

    return res.status(200).json({ mensaje: 'Se reenvió el correo de verificación.' });
  } catch (error) {
    console.error(`[Usuario] Error al reenviar verificación: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al reenviar la verificación.' });
  }
};

/**
 * POST /api/auth/login
 * Solo permite iniciar sesión si la cuenta ya fue verificada (estado 'activo').
 * Devuelve un JWT para las siguientes peticiones autenticadas.
 */
export const loginUsuario = async (req, res) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { email, password } = req.body;

    const usuario = await Usuario.findOne({ email: email.toLowerCase() }).select('+password');
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    if (!usuario.emailVerificado || usuario.estado === 'temporal') {
      return res.status(403).json({
        mensaje: 'Tu cuenta es temporal y aún no fue verificada. Revisa tu correo electrónico.',
        emailVerificado: false,
      });
    }

    if (usuario.estado === 'suspendido') {
      return res.status(403).json({ mensaje: 'Tu cuenta está suspendida. Contacta al administrador.' });
    }

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso.',
      token,
      usuario: {
        id: usuario._id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error(`[Usuario] Error al iniciar sesión: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al iniciar sesión.' });
  }
};
