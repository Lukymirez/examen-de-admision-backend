import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Un intento de simulacro/práctica del postulante.
 *
 * Guarda una "foto" (snapshot) de las preguntas EN EL ORDEN Y CON LAS
 * ALTERNATIVAS YA MEZCLADAS que se le mostraron a el alumno en ese intento
 * — así, aunque el banco de preguntas original cambie después, la
 * calificación de este intento sigue siendo consistente, y nunca hace
 * falta volver a exponer la respuesta correcta al frontend salvo para
 * calificar internamente en el backend.
 */
const preguntaSnapshotSchema = new Schema(
  {
    preguntaId: { type: Schema.Types.ObjectId, ref: 'Pregunta', required: true },
    materia: { type: String, required: true },
    enunciado: { type: String, required: true },
    imagenUrl: { type: String, default: null },
    alternativas: { type: [String], required: true }, // ya mezcladas para este intento
    indiceCorrecta: { type: Number, required: true }, // índice dentro de "alternativas" ya mezcladas
  },
  { _id: false }
);

const respuestaSchema = new Schema(
  {
    preguntaId: { type: Schema.Types.ObjectId, ref: 'Pregunta', required: true },
    indiceSeleccionada: { type: Number, required: true },
  },
  { _id: false }
);

const intentoSimulacroSchema = new Schema(
  {
    postulanteId: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    numeroIntento: {
      type: Number,
      required: true, // secuencial por postulante (1, 2, 3, ...) — historial completo, no solo del día
    },
    preguntas: {
      type: [preguntaSnapshotSchema],
      required: true,
    },
    respuestas: {
      type: [respuestaSchema],
      default: [],
    },
    aciertos: {
      type: Number,
      default: null, // se calcula al finalizar
    },
    errores: {
      type: Number,
      default: null,
    },
    estado: {
      type: String,
      enum: ['en_progreso', 'finalizado'],
      default: 'en_progreso',
    },
  },
  {
    timestamps: true, // createdAt sirve para el conteo de intentos por día
  }
);

const IntentoSimulacro = model('IntentoSimulacro', intentoSimulacroSchema);

export default IntentoSimulacro;
