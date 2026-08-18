import { body, validationResult } from 'express-validator';

import Carrera from './carrera.model.js';

export const validarCarrera = [
  body('nombre').trim().notEmpty().withMessage('El nombre de la carrera es obligatorio.'),
  body('vacantes').isInt({ min: 0 }).withMessage('Las vacantes deben ser un número mayor o igual a 0.'),
  body('convocatoriaId').isMongoId().withMessage('El ID de convocatoria no es válido.'),
];

export const crearCarrera = async (req, res) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const nuevaCarrera = await Carrera.create(req.body);
    return res.status(201).json({ mensaje: 'Carrera creada correctamente.', carrera: nuevaCarrera });
  } catch (error) {
    console.error(`[Carrera] Error al crear: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al crear la carrera.' });
  }
};

/**
 * Lista las carreras, opcionalmente filtradas por convocatoria.
 * Usado por el Home ("ventanas de carreras") y por el formulario de registro.
 */
export const listarCarreras = async (req, res) => {
  try {
    const filtro = req.query.convocatoriaId ? { convocatoriaId: req.query.convocatoriaId } : {};
    const carreras = await Carrera.find(filtro).sort({ nombre: 1 });
    return res.status(200).json({ carreras });
  } catch (error) {
    console.error(`[Carrera] Error al listar: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al listar carreras.' });
  }
};
