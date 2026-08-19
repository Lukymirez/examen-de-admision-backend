import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Esquema de Usuario (autenticación).
 * Cubre login, verificación de correo electrónico y control de roles (RBAC).
 *
 * Flujo de "usuario temporal":
 * 1. Al registrarse, la cuenta se crea con estado "temporal" (emailVerificado: false)
 *    y NO puede iniciar sesión todavía.
 * 2. Se envía un correo real (Nodemailer) con un enlace que contiene un token
 *    de verificación de un solo uso y con expiración.
 * 3. Al verificar el correo, la cuenta pasa a estado "activo" y ya puede
 *    iniciar sesión con normalidad (ver usuario.controller.js).
 */
const usuarioSchema = new Schema(
  {
    nombres: {
      type: String,
      required: true,
      trim: true,
    },
    apellidos: {
      type: String,
      required: true,
      trim: true,
    },
    dni: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // nunca se devuelve por defecto en las consultas
    },
    // --- Datos personales (CU-03 del Diagrama de Casos de Uso) ---
    fechaNacimiento: {
      type: Date,
    },
    sexo: {
      type: String,
      enum: ['masculino', 'femenino', 'otro'],
    },
    direccion: {
      type: String,
      trim: true,
    },
    telefono: {
      type: String,
      trim: true,
    },
    estadoCivil: {
      type: String,
      enum: ['soltero', 'casado', 'viudo', 'divorciado'],
    },
    // --- Datos académicos (CU-04 del Diagrama de Casos de Uso) ---
    colegio: {
      type: String,
      trim: true,
    },
    anioEgreso: {
      type: Number,
    },
    modalidadIngreso: {
      type: String,
      enum: ['ordinario', 'CEPRE', 'traslado', 'EBR/EBA'],
    },
    carreraId: {
      type: Schema.Types.ObjectId,
      ref: 'Carrera',
    },
    sede: {
      type: String,
      trim: true,
    },
    turno: {
      type: String,
      enum: ['diurno', 'nocturno'],
    },
    rol: {
      type: String,
      enum: ['postulante', 'docente', 'comite', 'administrador'],
      default: 'postulante',
    },
    estado: {
      type: String,
      enum: ['temporal', 'activo', 'suspendido'],
      default: 'temporal',
    },
    emailVerificado: {
      type: Boolean,
      default: false,
    },
    tokenVerificacion: {
      type: String,
      select: false,
    },
    tokenVerificacionExpira: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const Usuario = model('Usuario', usuarioSchema);

export default Usuario;
