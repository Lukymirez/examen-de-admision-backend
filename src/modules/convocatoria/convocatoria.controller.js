import { body, validationResult } from 'express-validator';

import Convocatoria from './convocatoria.model.js';

export const validarConvocatoria = [
  body('nombre').trim().notEmpty().withMessage('El nombre de la convocatoria es obligatorio.'),
  body('modalidad')
    .isIn(['ordinario', 'CEPRE', 'traslado', 'EBR/EBA'])
    .withMessage('Modalidad inválida.'),
  body('fechaInicio').isISO8601().withMessage('fechaInicio debe ser una fecha válida.'),
  body('fechaFin').isISO8601().withMessage('fechaFin debe ser una fecha válida.'),
];

/**
 * HU-07: Configurar convocatoria.
 */
export const crearConvocatoria = async (req, res) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const nuevaConvocatoria = await Convocatoria.create(req.body);
    return res.status(201).json({ mensaje: 'Convocatoria creada correctamente.', convocatoria: nuevaConvocatoria });
  } catch (error) {
    console.error(`[Convocatoria] Error al crear: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al crear la convocatoria.' });
  }
};

/**
 * Lista las convocatorias publicadas. Usado por el Home del frontend.
 */
export const listarConvocatorias = async (req, res) => {
  try {
    const filtro = req.query.estado ? { estado: req.query.estado } : {};
    const convocatorias = await Convocatoria.find(filtro).sort({ fechaInicio: -1 });
    return res.status(200).json({ convocatorias });
  } catch (error) {
    console.error(`[Convocatoria] Error al listar: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al listar convocatorias.' });
  }
};
