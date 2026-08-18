import { body, validationResult } from 'express-validator';

import Pregunta from './pregunta.model.js';
import Convocatoria from '../convocatoria/convocatoria.model.js';

const MATERIAS_VALIDAS = ['matematica', 'razonamiento', 'comunicacion', 'historia', 'cultura', 'geografia', 'ciencias'];

const reglasUnaPregunta = (prefijo = '') => [
  body(`${prefijo}materia`).isIn(MATERIAS_VALIDAS).withMessage('Materia inválida.'),
  body(`${prefijo}enunciado`).trim().notEmpty().withMessage('El enunciado es obligatorio.'),
  body(`${prefijo}alternativas`).isArray({ min: 4, max: 4 }).withMessage('Debes enviar exactamente 4 alternativas.'),
  body(`${prefijo}respuestaCorrecta`).isInt({ min: 0, max: 3 }).withMessage('respuestaCorrecta debe ser un índice entre 0 y 3.'),
];

export const validarPreguntaUnica = reglasUnaPregunta();

export const validarLotePreguntas = [
  body('preguntas').isArray({ min: 1 }).withMessage('Debes enviar al menos 1 pregunta.'),
  ...reglasUnaPregunta('preguntas.*.'),
];

/** Quita la respuestaCorrecta de un documento antes de enviarlo (confidencialidad). */
const ocultarRespuesta = (pregunta) => {
  const obj = pregunta.toObject ? pregunta.toObject() : pregunta;
  const { respuestaCorrecta, ...resto } = obj;
  return resto;
};

/**
 * POST /api/preguntas — Docente/Comité sube UNA pregunta.
 */
export const crearPregunta = async (req, res) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { materia, enunciado, alternativas, respuestaCorrecta, dificultad } = req.body;
    const nuevaPregunta = await Pregunta.create({
      materia,
      enunciado,
      alternativas,
      respuestaCorrecta,
      dificultad,
      autorId: req.usuario.id,
    });

    return res.status(201).json({ mensaje: 'Pregunta registrada como borrador.', pregunta: ocultarRespuesta(nuevaPregunta) });
  } catch (error) {
    console.error(`[Pregunta] Error al crear: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al crear la pregunta.' });
  }
};

/**
 * POST /api/preguntas/lote — Docente/Comité sube VARIAS preguntas de una vez
 * (ej: las 20 preguntas obligatorias de su materia).
 */
export const crearPreguntasLote = async (req, res) => {
  try {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const documentos = req.body.preguntas.map((p) => ({
      materia: p.materia,
      enunciado: p.enunciado,
      alternativas: p.alternativas,
      respuestaCorrecta: p.respuestaCorrecta,
      dificultad: p.dificultad || 'medio',
      autorId: req.usuario.id,
    }));

    const creadas = await Pregunta.insertMany(documentos);

    return res.status(201).json({
      mensaje: `${creadas.length} preguntas registradas como borrador.`,
      preguntas: creadas.map(ocultarRespuesta),
    });
  } catch (error) {
    console.error(`[Pregunta] Error al crear lote: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al crear las preguntas.' });
  }
};

/**
 * GET /api/preguntas/mias — el Docente ve SUS propias preguntas y su
 * progreso de subida por materia (sin exponer respuestaCorrecta, no la
 * necesita para revisar lo que ya subió).
 */
export const listarMisPreguntas = async (req, res) => {
  try {
    const preguntas = await Pregunta.find({ autorId: req.usuario.id }).sort({ materia: 1, createdAt: -1 });

    const progresoPorMateria = MATERIAS_VALIDAS.reduce((acc, materia) => {
      acc[materia] = preguntas.filter((p) => p.materia === materia).length;
      return acc;
    }, {});

    return res.status(200).json({
      preguntas: preguntas.map(ocultarRespuesta),
      progresoPorMateria,
    });
  } catch (error) {
    console.error(`[Pregunta] Error al listar propias: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al listar tus preguntas.' });
  }
};

/**
 * GET /api/preguntas — Comité/Administrador ven TODAS las preguntas
 * (con autor y respuestaCorrecta incluidos) para poder validarlas.
 * Acepta ?materia= y ?estado= como filtros opcionales.
 */
export const listarTodas = async (req, res) => {
  try {
    const filtro = {};
    if (req.query.materia) filtro.materia = req.query.materia;
    if (req.query.estado) filtro.estado = req.query.estado;

    const preguntas = await Pregunta.find(filtro)
      .populate('autorId', 'nombres apellidos email')
      .sort({ materia: 1, createdAt: -1 });

    return res.status(200).json({ preguntas });
  } catch (error) {
    console.error(`[Pregunta] Error al listar todas: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al listar las preguntas.' });
  }
};

/**
 * PUT /api/preguntas/:id/validar — el Comité aprueba o rechaza una pregunta.
 * Solo las preguntas "validada" entran al sorteo del examen (ver
 * generarExamenAleatorio).
 */
export const validarPregunta = async (req, res) => {
  try {
    const { estado } = req.body; // 'validada' | 'rechazada'
    if (!['validada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ mensaje: 'El estado debe ser "validada" o "rechazada".' });
    }

    const pregunta = await Pregunta.findByIdAndUpdate(
      req.params.id,
      { estado, validadaPor: req.usuario.id },
      { new: true }
    );

    if (!pregunta) {
      return res.status(404).json({ mensaje: 'Pregunta no encontrada.' });
    }

    return res.status(200).json({ mensaje: `Pregunta marcada como ${estado}.`, pregunta });
  } catch (error) {
    console.error(`[Pregunta] Error al validar: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al validar la pregunta.' });
  }
};

/** Similitud simple por superposición de palabras (índice de Jaccard). */
const similitudJaccard = (textoA, textoB) => {
  const palabrasA = new Set(textoA.split(' ').filter(Boolean));
  const palabrasB = new Set(textoB.split(' ').filter(Boolean));
  const interseccion = [...palabrasA].filter((palabra) => palabrasB.has(palabra)).length;
  const union = new Set([...palabrasA, ...palabrasB]).size;
  return union === 0 ? 0 : interseccion / union;
};

const UMBRAL_DUPLICADO = 0.75;

/**
 * GET /api/preguntas/duplicados — Comité/Administrador: detecta posibles
 * preguntas repetidas ENTRE DISTINTOS DOCENTES dentro de una misma materia,
 * comparando el texto normalizado del enunciado (similitud > 75%).
 * Acepta ?materia= para acotar la revisión (recomendado, evita O(n²) grande).
 */
export const detectarDuplicados = async (req, res) => {
  try {
    const filtro = {};
    if (req.query.materia) filtro.materia = req.query.materia;

    const preguntas = await Pregunta.find(filtro).populate('autorId', 'nombres apellidos email');

    const posiblesDuplicados = [];
    for (let i = 0; i < preguntas.length; i += 1) {
      for (let j = i + 1; j < preguntas.length; j += 1) {
        const a = preguntas[i];
        const b = preguntas[j];
        // Solo interesa alertar si son de DIFERENTES docentes — entre las
        // propias preguntas de un mismo docente no aplica esta alerta.
        if (String(a.autorId?._id) === String(b.autorId?._id)) continue;

        const similitud = similitudJaccard(a.enunciadoNormalizado, b.enunciadoNormalizado);
        if (similitud >= UMBRAL_DUPLICADO) {
          posiblesDuplicados.push({
            similitud: Math.round(similitud * 100),
            preguntaA: { id: a._id, enunciado: a.enunciado, autor: a.autorId },
            preguntaB: { id: b._id, enunciado: b.enunciado, autor: b.autorId },
          });
        }
      }
    }

    return res.status(200).json({ posiblesDuplicados });
  } catch (error) {
    console.error(`[Pregunta] Error al detectar duplicados: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al detectar duplicados.' });
  }
};

const mezclarArreglo = (arreglo) => {
  const copia = [...arreglo];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

/**
 * POST /api/preguntas/generar-examen — SOLO Comité.
 * Arma el examen tomando una cantidad aleatoria de preguntas VALIDADAS por
 * cada materia, desde el pool combinado de todos los docentes.
 *
 * Body esperado: { cantidadPorMateria: { matematica: 10, razonamiento: 7, ... } }
 * (el número de preguntas por materia lo decide el Comité según el diseño
 * del examen; el ejemplo del enunciado — 3+7+10 tomadas de distintos
 * docentes — surge naturalmente porque se sortea sobre el pool combinado,
 * no por docente).
 *
 * El Comité SÍ ve la respuestaCorrecta aquí (la necesita para imprimir la
 * cartilla el día del examen). El administrador la ve por separado y con
 * restricción de fecha — ver cartillaRespuestas más abajo.
 */
export const generarExamenAleatorio = async (req, res) => {
  try {
    const { cantidadPorMateria } = req.body;
    if (!cantidadPorMateria || typeof cantidadPorMateria !== 'object') {
      return res.status(400).json({ mensaje: 'Debes indicar cantidadPorMateria, ej: { "matematica": 10 }.' });
    }

    const examen = [];
    for (const [materia, cantidad] of Object.entries(cantidadPorMateria)) {
      if (!MATERIAS_VALIDAS.includes(materia)) continue;

      const poolValidado = await Pregunta.find({ materia, estado: 'validada' }).populate('autorId', 'nombres apellidos');
      const seleccionadas = mezclarArreglo(poolValidado).slice(0, cantidad);
      examen.push(...seleccionadas);
    }

    return res.status(200).json({
      mensaje: `Examen generado con ${examen.length} preguntas.`,
      totalPreguntas: examen.length,
      examen: mezclarArreglo(examen), // orden final también aleatorio, no agrupado por materia
    });
  } catch (error) {
    console.error(`[Pregunta] Error al generar examen: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al generar el examen.' });
  }
};

/**
 * GET /api/preguntas/cartilla/:convocatoriaId — cartilla de respuestas
 * correctas de TODAS las preguntas validadas.
 *
 * Regla de confidencialidad: el Comité puede verla en cualquier momento
 * (la necesita para imprimir), pero un Administrador SOLO puede verla
 * después de la fecha del examen de esa convocatoria, para evitar que la
 * respuesta correcta se filtre antes de tiempo.
 */
export const cartillaRespuestas = async (req, res) => {
  try {
    if (req.usuario.rol === 'administrador') {
      const convocatoria = await Convocatoria.findById(req.params.convocatoriaId);
      if (!convocatoria) {
        return res.status(404).json({ mensaje: 'Convocatoria no encontrada.' });
      }
      if (new Date() < new Date(convocatoria.fechaExamen)) {
        return res.status(403).json({
          mensaje: 'La cartilla de respuestas solo está disponible para el Administrador después de la fecha del examen.',
        });
      }
    }
    // Comité: sin restricción de fecha (la necesita para imprimir el examen).

    const preguntas = await Pregunta.find({ estado: 'validada' }).populate('autorId', 'nombres apellidos');
    return res.status(200).json({ preguntas });
  } catch (error) {
    console.error(`[Pregunta] Error al obtener la cartilla: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al obtener la cartilla de respuestas.' });
  }
};
