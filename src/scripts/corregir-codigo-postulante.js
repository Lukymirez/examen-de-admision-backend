import 'dotenv/config';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import Usuario from '../modules/usuario/usuario.model.js';

/**
 * Script de una sola vez (corregir-codigo-postulante.js).
 *
 * Antes de esta corrección, el campo codigoPostulante tenía "default: null"
 * en el esquema, lo que hacía que Mongoose guardara explícitamente
 * "codigoPostulante: null" en TODOS los usuarios nuevos (admin, docente,
 * tesorería, comité, secretaría...). Un índice único "sparse" no ignora
 * ese null explícito — solo ignora cuando el campo está completamente
 * AUSENTE — por eso el segundo usuario sin código chocaba con el primero
 * (error E11000 duplicate key).
 *
 * Este script quita el campo por completo (no lo deja en null, lo borra)
 * de cualquier usuario que lo tenga en null, para que el índice sparse
 * vuelva a funcionar como se espera. Es seguro correrlo aunque ya no haga
 * falta — si no encuentra ningún documento afectado, no hace nada.
 *
 * Uso: yarn fix-codigo (o: node src/scripts/corregir-codigo-postulante.js)
 */
const ejecutar = async () => {
  await connectDB();

  const resultado = await Usuario.updateMany(
    { codigoPostulante: null },
    { $unset: { codigoPostulante: '' } }
  );

  console.log(`\n✅ Corregidos ${resultado.modifiedCount} usuario(s) que tenían codigoPostulante: null explícito.\n`);

  await mongoose.disconnect();
  process.exit(0);
};

ejecutar().catch((error) => {
  console.error('[Corregir código] Error:', error.message);
  process.exit(1);
});
