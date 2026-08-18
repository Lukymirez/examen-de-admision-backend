import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Esquema mínimo de Convocatoria.
 * Representa un proceso de admisión (ordinario, CEPRE, traslado, EBR/EBA)
 * con sus fechas de vigencia y estado de publicación.
 * Se ampliará más adelante con reglas de examen (duración, N° de preguntas, etc.)
 * según el Módulo de Convocatoria del documento de arquitectura.
 */
const convocatoriaSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    modalidad: {
      type: String,
      enum: ['ordinario', 'CEPRE', 'traslado', 'EBR/EBA'],
      required: true,
    },
    fechaInicio: {
      type: Date,
      required: true,
    },
    fechaFin: {
      type: Date,
      required: true,
    },
    estado: {
      type: String,
      enum: ['borrador', 'publicada', 'cerrada'],
      default: 'borrador',
    },
  },
  {
    timestamps: true,
  }
);

const Convocatoria = model('Convocatoria', convocatoriaSchema);

export default Convocatoria;
