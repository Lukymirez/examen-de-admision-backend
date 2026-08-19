import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Banco de preguntas (HU-09 / HU-10), subidas por Docentes y validadas por
 * el Comité. Cada pregunta pertenece a una "materia" (Matemática, Historia,
 * etc.) — la selección aleatoria para armar el examen se hace agrupando por
 * materia (ver pregunta.controller.js -> generarExamenAleatorio).
 *
 * Confidencialidad: la respuestaCorrecta NUNCA se envía al frontend salvo
 * en los endpoints explícitamente protegidos para el Comité/Administrador,
 * y solo después de la fecha del examen (ver validación en el controlador).
 */
const preguntaSchema = new Schema(
  {
    materia: {
      type: String,
      required: true,
      enum: ['matematica', 'razonamiento', 'comunicacion', 'historia', 'cultura', 'geografia', 'ciencias'],
    },
    enunciado: {
      type: String,
      required: true,
      trim: true,
    },
    alternativas: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => arr.length === 4,
        message: 'Cada pregunta debe tener exactamente 4 alternativas.',
      },
    },
    respuestaCorrecta: {
      type: Number, // índice (0-3) dentro de "alternativas"
      required: true,
      min: 0,
      max: 3,
    },
    dificultad: {
      type: String,
      enum: ['facil', 'medio', 'dificil'],
      default: 'medio',
    },
    // URL de una imagen de apoyo (diagramas, gráficos, fórmulas) — opcional.
    // Útil para preguntas de Matemática, Ciencias, etc. que requieren un
    // elemento visual para poder responder.
    imagenUrl: {
      type: String,
      default: null,
    },
    autorId: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    estado: {
      type: String,
      enum: ['borrador', 'validada', 'rechazada'],
      default: 'borrador',
    },
    validadaPor: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      default: null,
    },
    // Normalización simple del enunciado, usada para detectar posibles
    // preguntas duplicadas entre distintos docentes (ver detectarDuplicados).
    enunciadoNormalizado: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

preguntaSchema.pre('save', function normalizarEnunciado(next) {
  this.enunciadoNormalizado = this.enunciado
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-z0-9 ]/g, '') // quita signos de puntuación
    .replace(/\s+/g, ' ')
    .trim();
  next();
});

const Pregunta = model('Pregunta', preguntaSchema);

export default Pregunta;
