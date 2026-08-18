import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Esquema de Postulante (HU-01, HU-03).
 * Representa al postulante registrado en un proceso de admisión,
 * asociado a una carrera y a una convocatoria específicas.
 */
const postulanteSchema = new Schema(
  {
    dni: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
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
    carreraId: {
      type: Schema.Types.ObjectId,
      ref: 'Carrera',
      required: true,
    },
    convocatoriaId: {
      type: Schema.Types.ObjectId,
      ref: 'Convocatoria',
      required: true,
    },
    estadoPago: {
      type: String,
      enum: ['pendiente', 'pagado', 'rechazado'],
      default: 'pendiente',
    },
    codigoPostulante: {
      type: String,
      unique: true,
      sparse: true, // permite null/ausente hasta que se genere tras el pago (HU-03)
    },
    foto: {
      type: String, // ruta o URL del archivo cargado (gestionado vía multer)
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Postulante = model('Postulante', postulanteSchema);

export default Postulante;
