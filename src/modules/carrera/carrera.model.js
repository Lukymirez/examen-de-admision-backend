import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Esquema mínimo de Carrera.
 * Representa una carrera ofertada dentro de una Convocatoria específica,
 * con su número de vacantes disponibles.
 */
const carreraSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    vacantes: {
      type: Number,
      required: true,
      min: 0,
    },
    convocatoriaId: {
      type: Schema.Types.ObjectId,
      ref: 'Convocatoria',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Carrera = model('Carrera', carreraSchema);

export default Carrera;
