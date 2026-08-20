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
 * GET /api/auth/mi-carrera — Postulante ve su carrera elegida (primera
 * opción, definida al registrarse) y su segunda opción (si ya la definió).
 * También devuelve la lista de carreras disponibles para poder elegir/
 * cambiar la segunda opción.
 */
export const miCarrera = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id)
      .populate('carreraId', 'nombre vacantes')
      .populate('segundaOpcionCarreraId', 'nombre vacantes')
      .select('carreraId segundaOpcionCarreraId turno modalidadIngreso sede');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    return res.status(200).json({
      primeraOpcion: usuario.carreraId,
      segundaOpcion: usuario.segundaOpcionCarreraId,
      turno: usuario.turno,
      modalidadIngreso: usuario.modalidadIngreso,
      sede: usuario.sede,
    });
  } catch (error) {
    console.error(`[Usuario] Error al obtener mi-carrera: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al obtener tu carrera.' });
  }
};

/**
 * PUT /api/auth/mi-carrera — Postulante define o cambia su SEGUNDA opción
 * de carrera (la primera queda fija desde el registro; para cambiarla
 * tendría que pasar por el área administrativa).
 */
export const actualizarSegundaOpcion = async (req, res) => {
  try {
    const { segundaOpcionCarreraId } = req.body;
    if (!segundaOpcionCarreraId) {
      return res.status(400).json({ mensaje: 'Debes indicar una carrera para la segunda opción.' });
    }

    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }
    if (String(usuario.carreraId) === String(segundaOpcionCarreraId)) {
      return res.status(400).json({ mensaje: 'La segunda opción debe ser distinta de tu primera opción.' });
    }

    usuario.segundaOpcionCarreraId = segundaOpcionCarreraId;
    await usuario.save();

    const actualizado = await Usuario.findById(usuario._id).populate('segundaOpcionCarreraId', 'nombre vacantes');

    return res.status(200).json({ mensaje: 'Segunda opción actualizada.', segundaOpcion: actualizado.segundaOpcionCarreraId });
  } catch (error) {
    console.error(`[Usuario] Error al actualizar segunda opción: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al actualizar tu segunda opción.' });
  }
};

const CAMPOS_MATRICULA_VALIDOS = ['fotoCarnetUrl', 'dniUrl', 'certificadoEstudiosUrl', 'declaracionJuradaUrl'];
const MONTO_EXAMEN_REQUERIDO = 150; // S/. 150.00, según el costo real informado por el instituto

/**
 * GET /api/auth/mi-matricula — Postulante ve el estado de sus documentos
 * y sus pagos registrados, con base en los requisitos reales de matrícula
 * del instituto (foto carné, DNI ambas caras, certificado de estudios,
 * declaraciones juradas, y el pago del examen S/.150 — que puede
 * registrarse en hasta 2 partes).
 */
export const miMatricula = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('matricula postulacionHabilitada codigoPostulante');
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const matricula = usuario.matricula || { pagos: [] };
    const documentosCompletados = CAMPOS_MATRICULA_VALIDOS.filter((campo) => Boolean(matricula[campo])).length;
    const montoTotalPagado = (matricula.pagos || []).reduce((sum, p) => sum + p.monto, 0);
    const pagoCompleto = montoTotalPagado >= MONTO_EXAMEN_REQUERIDO;

    return res.status(200).json({
      matricula,
      documentosCompletados,
      documentosTotales: CAMPOS_MATRICULA_VALIDOS.length,
      montoTotalPagado,
      montoRequerido: MONTO_EXAMEN_REQUERIDO,
      pagoCompleto,
      postulacionHabilitada: usuario.postulacionHabilitada,
      codigoPostulante: usuario.codigoPostulante,
      completo: documentosCompletados === CAMPOS_MATRICULA_VALIDOS.length && pagoCompleto,
    });
  } catch (error) {
    console.error(`[Usuario] Error al obtener mi-matricula: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al obtener tu matrícula.' });
  }
};

/**
 * PUT /api/auth/mi-matricula — Postulante guarda la URL de UN documento
 * (foto, DNI, certificado o declaración jurada) a la vez.
 */
export const actualizarMiMatricula = async (req, res) => {
  try {
    const { campo, url } = req.body;
    if (!CAMPOS_MATRICULA_VALIDOS.includes(campo)) {
      return res.status(400).json({ mensaje: 'Campo de matrícula inválido.' });
    }
    if (!url) {
      return res.status(400).json({ mensaje: 'Falta la URL del documento.' });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario.id,
      { [`matricula.${campo}`]: url },
      { new: true }
    ).select('matricula');

    return res.status(200).json({ mensaje: 'Documento guardado correctamente.', matricula: usuario.matricula });
  } catch (error) {
    console.error(`[Usuario] Error al actualizar mi-matricula: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al guardar el documento.' });
  }
};

/**
 * POST /api/auth/mi-matricula/pago — Registra un pago del examen (voucher
 * del Banco de la Nación), con los datos que permiten detectar duplicados:
 * número de operación, fecha, monto, sede y ventanilla.
 *
 * El número de operación es el dato REALMENTE único e irrepetible de un
 * voucher bancario — se verifica que nadie más (ni el mismo postulante dos
 * veces) lo haya registrado antes, para evitar que un mismo voucher se
 * reutilice para "pagar" dos matrículas distintas.
 */
export const agregarPago = async (req, res) => {
  try {
    const { numeroOperacion, fecha, monto, sede, ventanilla, voucherUrl } = req.body;

    if (!numeroOperacion || !fecha || !monto || !sede || !voucherUrl) {
      return res.status(400).json({
        mensaje: 'Faltan datos del voucher: número de operación, fecha, monto, sede y el archivo son obligatorios.',
      });
    }

    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }
    if ((usuario.matricula.pagos || []).length >= 2) {
      return res.status(400).json({ mensaje: 'Ya registraste el máximo de 2 pagos permitidos.' });
    }

    // Detección de duplicados: ¿ese número de operación ya fue usado por
    // CUALQUIER postulante (incluido uno mismo) en un pago anterior?
    const numeroOperacionNormalizado = numeroOperacion.trim();
    const yaExiste = await Usuario.findOne({ 'matricula.pagos.numeroOperacion': numeroOperacionNormalizado });
    if (yaExiste) {
      return res.status(409).json({
        mensaje: 'Este número de operación ya fue registrado anteriormente. Si crees que es un error, contacta al área administrativa — no se puede reutilizar el mismo voucher.',
      });
    }

    usuario.matricula.pagos.push({
      numeroOperacion: numeroOperacionNormalizado,
      fecha,
      monto,
      sede,
      ventanilla: ventanilla || null,
      voucherUrl,
    });
    await usuario.save();

    const montoTotalPagado = usuario.matricula.pagos.reduce((sum, p) => sum + p.monto, 0);

    return res.status(201).json({
      mensaje: 'Pago registrado correctamente.',
      pagos: usuario.matricula.pagos,
      montoTotalPagado,
      pagoCompleto: montoTotalPagado >= MONTO_EXAMEN_REQUERIDO,
    });
  } catch (error) {
    console.error(`[Usuario] Error al registrar pago: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al registrar el pago.' });
  }
};

/**
 * DELETE /api/auth/mi-matricula/pago/:indice — Elimina un pago registrado
 * por error, por su posición (0 o 1) en el arreglo.
 */
export const eliminarPago = async (req, res) => {
  try {
    const indice = Number(req.params.indice);
    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }
    if (Number.isNaN(indice) || indice < 0 || indice >= usuario.matricula.pagos.length) {
      return res.status(400).json({ mensaje: 'Pago no encontrado.' });
    }

    usuario.matricula.pagos.splice(indice, 1);
    await usuario.save();

    return res.status(200).json({ mensaje: 'Pago eliminado.', pagos: usuario.matricula.pagos });
  } catch (error) {
    console.error(`[Usuario] Error al eliminar pago: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al eliminar el pago.' });
  }
};

/**
 * Genera el código único de postulante (HU-03), formato: P26-00001.
 * Se llama automáticamente al habilitarse la postulación (ver validarPago).
 */
const generarCodigoPostulante = async () => {
  const anio = new Date().getFullYear().toString().slice(-2);
  const totalConCodigo = await Usuario.countDocuments({ codigoPostulante: { $ne: null } });
  const secuencial = String(totalConCodigo + 1).padStart(5, '0');
  return `P${anio}-${secuencial}`;
};

/**
 * GET /api/auth/pagos — Administrador Y Tesorería pueden ver los pagos
 * registrados (Tesorería los revisa contra su propio sistema bancario;
 * Administración decide si aprobar/rechazar con esa información).
 */
export const listarPagos = async (req, res) => {
  try {
    const filtro = { 'matricula.pagos.0': { $exists: true } };
    if (req.query.estado) {
      filtro['matricula.pagos.estado'] = req.query.estado;
    }

    const postulantes = await Usuario.find(filtro)
      .select('nombres apellidos dni email matricula.pagos codigoPostulante postulacionHabilitada')
      .sort({ createdAt: -1 });

    return res.status(200).json({ postulantes });
  } catch (error) {
    console.error(`[Usuario] Error al listar pagos: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al listar los pagos.' });
  }
};

/**
 * PUT /api/auth/pagos/:postulanteId/:indice/verificar — Tesorería confirma
 * que el voucher es real, verificado contra su propio sistema bancario.
 * IMPORTANTE: esto NO aprueba el pago ni habilita nada — es solo una
 * bandera informativa para que Administración tome la decisión final.
 */
export const verificarPagoTesoreria = async (req, res) => {
  try {
    const { postulanteId, indice } = req.params;

    const postulante = await Usuario.findById(postulanteId);
    if (!postulante) {
      return res.status(404).json({ mensaje: 'Postulante no encontrado.' });
    }

    const i = Number(indice);
    if (Number.isNaN(i) || !postulante.matricula.pagos[i]) {
      return res.status(404).json({ mensaje: 'Pago no encontrado.' });
    }

    postulante.matricula.pagos[i].verificadoTesoreria = true;
    postulante.matricula.pagos[i].verificadoPorTesoreriaId = req.usuario.id;
    postulante.matricula.pagos[i].fechaVerificacionTesoreria = new Date();
    await postulante.save();

    return res.status(200).json({
      mensaje: 'Pago marcado como verificado por Tesorería. Queda pendiente de aprobación de Administración.',
      pagos: postulante.matricula.pagos,
    });
  } catch (error) {
    console.error(`[Usuario] Error al verificar pago (Tesorería): ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al verificar el pago.' });
  }
};

/**
 * PUT /api/auth/pagos/:postulanteId/:indice — SOLO Administrador aprueba o
 * rechaza un pago (CU-08). Esta es la única acción que puede habilitar la
 * postulación — la verificación de Tesorería es solo informativa, nunca
 * habilita nada automáticamente.
 */
export const validarPago = async (req, res) => {
  try {
    const { postulanteId, indice } = req.params;
    const { estado, comentario } = req.body; // 'aprobado' | 'rechazado'

    if (!['aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({ mensaje: 'El estado debe ser "aprobado" o "rechazado".' });
    }

    const postulante = await Usuario.findById(postulanteId);
    if (!postulante) {
      return res.status(404).json({ mensaje: 'Postulante no encontrado.' });
    }

    const i = Number(indice);
    if (Number.isNaN(i) || !postulante.matricula.pagos[i]) {
      return res.status(404).json({ mensaje: 'Pago no encontrado.' });
    }

    postulante.matricula.pagos[i].estado = estado;
    postulante.matricula.pagos[i].comentarioAdmin = comentario || null;

    let mensajeExtra = '';
    if (estado === 'aprobado' && !postulante.postulacionHabilitada) {
      const montoAprobado = postulante.matricula.pagos
        .filter((p) => p.estado === 'aprobado')
        .reduce((sum, p) => sum + p.monto, 0);

      if (montoAprobado >= MONTO_EXAMEN_REQUERIDO) {
        postulante.postulacionHabilitada = true;
        postulante.codigoPostulante = await generarCodigoPostulante();
        mensajeExtra = ` Postulación habilitada — código asignado: ${postulante.codigoPostulante}.`;
      }
    }

    await postulante.save();

    return res.status(200).json({
      mensaje: `Pago marcado como ${estado}.${mensajeExtra}`,
      postulacionHabilitada: postulante.postulacionHabilitada,
      codigoPostulante: postulante.codigoPostulante,
      pagos: postulante.matricula.pagos,
    });
  } catch (error) {
    console.error(`[Usuario] Error al validar pago: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al validar el pago.' });
  }
};

/**
 * GET /api/auth/postulantes — Administrador: lista de postulantes con la
 * carrera y el turno elegidos, para dar seguimiento al flujo de postulación.
 */
export const listarPostulantes = async (req, res) => {
  try {
    const filtro = { rol: 'postulante' };
    if (req.query.carreraId) filtro.carreraId = req.query.carreraId;
    if (req.query.turno) filtro.turno = req.query.turno;

    const postulantes = await Usuario.find(filtro)
      .populate('carreraId', 'nombre')
      .select('nombres apellidos dni email carreraId turno modalidadIngreso estado emailVerificado createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({ postulantes });
  } catch (error) {
    console.error(`[Usuario] Error al listar postulantes: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al listar postulantes.' });
  }
};

/**
 * GET /api/auth/docentes — Administrador/Comité: lista de docentes y
 * miembros del comité (sin su progreso de preguntas — eso lo da
 * GET /api/preguntas/progreso-docentes).
 */
export const listarDocentes = async (req, res) => {
  try {
    const docentes = await Usuario.find({ rol: { $in: ['docente', 'comite'] } })
      .select('nombres apellidos email rol estado createdAt')
      .sort({ nombres: 1 });

    return res.status(200).json({ docentes });
  } catch (error) {
    console.error(`[Usuario] Error al listar docentes: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al listar docentes.' });
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
