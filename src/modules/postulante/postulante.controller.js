import { body, validationResult } from 'express-validator';

import Postulante from './postulante.model.js';
import Carrera from '../carrera/carrera.model.js';
import Convocatoria from '../convocatoria/convocatoria.model.js';

/**
 * Reglas de validación de entrada para el registro de un postulante.
 * Se ejecutan como middleware antes del controlador (ver postulante.routes.js).
 */
export const validarRegistroPostulante = [
  body('dni')
    .trim()
    .notEmpty()
    .withMessage('El DNI es obligatorio.')
    .isLength({ min: 8, max: 8 })
    .withMessage('El DNI debe tener 8 dígitos.')
    .isNumeric()
    .withMessage('El DNI solo debe contener números.'),
  body('nombres').trim().notEmpty().withMessage('Los nombres son obligatorios.'),
  body('apellidos').trim().notEmpty().withMessage('Los apellidos son obligatorios.'),
  body('carreraId').notEmpty().withMessage('La carrera es obligatoria.').isMongoId().withMessage('El ID de carrera no es válido.'),
  body('convocatoriaId')
    .notEmpty()
    .withMessage('La convocatoria es obligatoria.')
    .isMongoId()
    .withMessage('El ID de convocatoria no es válido.'),
];

/**
 * HU-01: Registra e inscribe a un postulante en un proceso de admisión.
 * Deja el registro con estadoPago "pendiente" (ver postulante.model.js),
 * a la espera de la confirmación del Sistema de Pagos (HU-02, HU-17).
 */
export const registrarPostulante = async (req, res) => {
  try {
    // 1. Validar el formato de los datos de entrada
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { dni, nombres, apellidos, carreraId, convocatoriaId } = req.body;

    // 2. Validar que la convocatoria exista y esté publicada
    const convocatoria = await Convocatoria.findById(convocatoriaId);
    if (!convocatoria) {
      return res.status(404).json({ mensaje: 'La convocatoria indicada no existe.' });
    }
    if (convocatoria.estado !== 'publicada') {
      return res
        .status(400)
        .json({ mensaje: 'La convocatoria no está publicada; no se aceptan inscripciones.' });
    }

    // 3. Validar que la carrera exista y pertenezca a esa convocatoria
    const carrera = await Carrera.findById(carreraId);
    if (!carrera) {
      return res.status(404).json({ mensaje: 'La carrera indicada no existe.' });
    }
    if (carrera.convocatoriaId.toString() !== convocatoriaId) {
      return res
        .status(400)
        .json({ mensaje: 'La carrera indicada no pertenece a la convocatoria indicada.' });
    }

    // 4. Validar que no exista ya un postulante con el mismo DNI
    const postulanteExistente = await Postulante.findOne({ dni });
    if (postulanteExistente) {
      return res.status(409).json({ mensaje: 'Ya existe un postulante registrado con este DNI.' });
    }

    // 5. Crear el registro (estadoPago queda "pendiente" por defecto)
    const nuevoPostulante = await Postulante.create({
      dni,
      nombres,
      apellidos,
      carreraId,
      convocatoriaId,
    });

    return res.status(201).json({
      mensaje: 'Registro creado exitosamente. Pendiente de pago para confirmar inscripción.',
      postulante: nuevoPostulante,
    });
  } catch (error) {
    console.error(`[Postulante] Error al registrar: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al procesar el registro.' });
  }
};
