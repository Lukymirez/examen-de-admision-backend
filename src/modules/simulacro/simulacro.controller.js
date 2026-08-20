import Pregunta from '../pregunta/pregunta.model.js';
import Usuario from '../usuario/usuario.model.js';
import IntentoSimulacro from './simulacro.model.js';

const MATERIAS = ['matematica', 'razonamiento', 'comunicacion', 'historia', 'cultura', 'geografia', 'ciencias'];

// Cantidad de preguntas que se intenta traer POR MATERIA en cada simulacro.
// Si el banco no tiene suficientes preguntas SIN USAR en una materia, se
// toman las que haya disponibles (incluso 0) — el simulacro simplemente
// sale más corto en esa materia hasta que los docentes suban más preguntas.
const PREGUNTAS_POR_MATERIA = 6;

const MAX_INTENTOS_POR_DIA = 2;

const mezclarArreglo = (arreglo) => {
  const copia = [...arreglo];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

/** Quita indiceCorrecta antes de mandar las preguntas al frontend. */
const ocultarRespuestas = (intento) => {
  const obj = intento.toObject ? intento.toObject() : intento;
  return {
    ...obj,
    preguntas: obj.preguntas.map(({ indiceCorrecta, ...resto }) => resto),
  };
};

const inicioDeHoy = () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
};

/**
 * POST /api/simulacro/iniciar — Postulante inicia un nuevo intento.
 *
 * Reglas aplicadas:
 * - Máximo 2 intentos por día (calendario, no 24h corridas).
 * - Ninguna pregunta se repite entre NINGÚN intento anterior del alumno
 *   (se revisa todo su historial, no solo el del día).
 * - Las preguntas y sus alternativas salen en orden aleatorio en cada
 *   intento, para dificultar que alguien copie mirando la posición.
 * - Si ya tiene un intento sin terminar, lo retoma en vez de crear uno
 *   nuevo (evita duplicados si cierra la pestaña a medias).
 */
export const iniciarSimulacro = async (req, res) => {
  try {
    const postulanteId = req.usuario.id;

    // HU-02: la postulación debe estar habilitada (pago validado por
    // Administración) antes de poder practicar simulacros.
    const postulante = await Usuario.findById(postulanteId).select('postulacionHabilitada');
    if (!postulante?.postulacionHabilitada) {
      return res.status(403).json({
        mensaje: 'Tu postulación todavía no está habilitada. Completa el pago del examen en "Completar mi registro / matrícula" y espera a que el área administrativa lo valide.',
      });
    }

    const intentosHoy = await IntentoSimulacro.countDocuments({
      postulanteId,
      createdAt: { $gte: inicioDeHoy() },
    });
    if (intentosHoy >= MAX_INTENTOS_POR_DIA) {
      return res.status(403).json({
        mensaje: `Ya alcanzaste el máximo de ${MAX_INTENTOS_POR_DIA} simulacros por día. Vuelve mañana para seguir practicando.`,
      });
    }

    const intentoPendiente = await IntentoSimulacro.findOne({ postulanteId, estado: 'en_progreso' });
    if (intentoPendiente) {
      return res.status(200).json({ mensaje: 'Tienes un simulacro sin terminar, continuando donde quedaste.', intento: ocultarRespuestas(intentoPendiente) });
    }

    // Preguntas ya usadas en CUALQUIER intento anterior de este alumno (nunca se repiten).
    const intentosPrevios = await IntentoSimulacro.find({ postulanteId }).select('preguntas.preguntaId');
    const idsUsadas = new Set(
      intentosPrevios.flatMap((intento) => intento.preguntas.map((p) => String(p.preguntaId)))
    );

    const preguntasSeleccionadas = [];
    for (const materia of MATERIAS) {
      const pool = await Pregunta.find({
        materia,
        estado: 'validada',
        _id: { $nin: [...idsUsadas] },
      });
      const elegidas = mezclarArreglo(pool).slice(0, PREGUNTAS_POR_MATERIA);
      preguntasSeleccionadas.push(...elegidas);
    }

    if (preguntasSeleccionadas.length === 0) {
      return res.status(409).json({
        mensaje: 'No hay preguntas nuevas disponibles para un simulacro en este momento. Ya practicaste con todo el banco actual — vuelve cuando los docentes suban más preguntas.',
      });
    }

    // Snapshot: mezclamos también las alternativas de cada pregunta y
    // recalculamos dónde queda la respuesta correcta dentro del nuevo orden.
    const preguntasSnapshot = mezclarArreglo(preguntasSeleccionadas).map((pregunta) => {
      const indices = [0, 1, 2, 3, 4];
      const ordenMezclado = mezclarArreglo(indices);
      const alternativasMezcladas = ordenMezclado.map((i) => pregunta.alternativas[i]);
      const indiceCorrecta = ordenMezclado.indexOf(pregunta.respuestaCorrecta);

      return {
        preguntaId: pregunta._id,
        materia: pregunta.materia,
        enunciado: pregunta.enunciado,
        imagenUrl: pregunta.imagenUrl,
        alternativas: alternativasMezcladas,
        indiceCorrecta,
      };
    });

    const numeroIntento = intentosPrevios.length + 1;

    const nuevoIntento = await IntentoSimulacro.create({
      postulanteId,
      numeroIntento,
      preguntas: preguntasSnapshot,
    });

    return res.status(201).json({ mensaje: 'Simulacro iniciado.', intento: ocultarRespuestas(nuevoIntento) });
  } catch (error) {
    console.error(`[Simulacro] Error al iniciar: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al iniciar el simulacro.' });
  }
};

/**
 * POST /api/simulacro/:id/finalizar — Postulante entrega sus respuestas.
 * Responde SOLO con el número de aciertos y errores — nunca cuáles
 * preguntas fallaste ni cuál era la respuesta correcta, para no filtrar
 * el banco confidencial.
 */
export const finalizarSimulacro = async (req, res) => {
  try {
    const intento = await IntentoSimulacro.findById(req.params.id);
    if (!intento) {
      return res.status(404).json({ mensaje: 'Intento no encontrado.' });
    }
    if (String(intento.postulanteId) !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'Este simulacro no te pertenece.' });
    }
    if (intento.estado === 'finalizado') {
      return res.status(400).json({ mensaje: 'Este simulacro ya fue entregado anteriormente.' });
    }

    const { respuestas } = req.body; // [{ preguntaId, indiceSeleccionada }]
    const respuestasMap = new Map((respuestas || []).map((r) => [String(r.preguntaId), r.indiceSeleccionada]));

    let aciertos = 0;
    let errores = 0;
    for (const pregunta of intento.preguntas) {
      const seleccion = respuestasMap.get(String(pregunta.preguntaId));
      if (seleccion === pregunta.indiceCorrecta) {
        aciertos += 1;
      } else {
        errores += 1; // incluye preguntas sin responder
      }
    }

    intento.respuestas = respuestas || [];
    intento.aciertos = aciertos;
    intento.errores = errores;
    intento.estado = 'finalizado';
    await intento.save();

    return res.status(200).json({
      mensaje: 'Simulacro entregado correctamente.',
      resultado: {
        numeroIntento: intento.numeroIntento,
        aciertos,
        errores,
        total: intento.preguntas.length,
        porcentaje: Math.round((aciertos / intento.preguntas.length) * 100),
      },
    });
  } catch (error) {
    console.error(`[Simulacro] Error al finalizar: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al finalizar el simulacro.' });
  }
};

/**
 * GET /api/simulacro/mis-resultados — Postulante ve el HISTORIAL de sus
 * simulacros: solo aciertos/errores/porcentaje por intento (su progreso),
 * nunca las respuestas ni qué preguntas falló.
 */
export const misResultados = async (req, res) => {
  try {
    const intentos = await IntentoSimulacro.find({
      postulanteId: req.usuario.id,
      estado: 'finalizado',
    })
      .sort({ numeroIntento: 1 })
      .select('numeroIntento aciertos errores preguntas createdAt');

    const resultados = intentos.map((intento) => ({
      numeroIntento: intento.numeroIntento,
      fecha: intento.createdAt,
      aciertos: intento.aciertos,
      errores: intento.errores,
      total: intento.preguntas.length,
      porcentaje: Math.round((intento.aciertos / intento.preguntas.length) * 100),
    }));

    const intentosHoy = await IntentoSimulacro.countDocuments({
      postulanteId: req.usuario.id,
      createdAt: { $gte: inicioDeHoy() },
    });

    return res.status(200).json({
      resultados,
      intentosHoy,
      intentosRestantesHoy: Math.max(0, MAX_INTENTOS_POR_DIA - intentosHoy),
    });
  } catch (error) {
    console.error(`[Simulacro] Error al obtener resultados: ${error.message}`);
    return res.status(500).json({ mensaje: 'Error interno al obtener tus resultados.' });
  }
};
