import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import Usuario from '../modules/usuario/usuario.model.js';

/**
 * Script semillero (seed): crea 3 cuentas de prueba ya verificadas y activas,
 * para no depender del envío real de correo mientras se prueba el sistema.
 *
 * Uso:
 *   yarn seed
 *   (o: node src/scripts/seed.js)
 *
 * Es seguro correrlo varias veces: si una cuenta ya existe (por email), la
 * actualiza en vez de duplicarla.
 */

const USUARIOS_PRUEBA = [
  {
    nombres: 'Ana',
    apellidos: 'Administradora',
    dni: '00000001',
    email: 'admin@admision.test',
    passwordPlano: 'Admin1234!',
    rol: 'administrador',
  },
  {
    nombres: 'Pedro',
    apellidos: 'Postulante',
    dni: '00000002',
    email: 'postulante@admision.test',
    passwordPlano: 'Postulante1234!',
    rol: 'postulante',
  },
  {
    nombres: 'Diana',
    apellidos: 'Docente',
    dni: '00000003',
    email: 'docente@admision.test',
    passwordPlano: 'Docente1234!',
    rol: 'docente',
  },
];

const ejecutarSeed = async () => {
  await connectDB();

  console.log('\n[Seed] Creando/actualizando usuarios de prueba...\n');

  for (const datos of USUARIOS_PRUEBA) {
    const passwordHash = await bcrypt.hash(datos.passwordPlano, 10);

    const usuario = await Usuario.findOneAndUpdate(
      { email: datos.email },
      {
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        dni: datos.dni,
        email: datos.email,
        password: passwordHash,
        rol: datos.rol,
        estado: 'activo', // se salta el paso de "usuario temporal"
        emailVerificado: true, // ya verificado, no necesita el correo real
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`✅ ${datos.rol.padEnd(14)} → ${usuario.email}  (password: ${datos.passwordPlano})`);
  }

  console.log('\n[Seed] Listo. Usa estas credenciales para iniciar sesión desde el frontend.\n');

  await mongoose.disconnect();
  process.exit(0);
};

ejecutarSeed().catch((error) => {
  console.error('[Seed] Error al crear los usuarios de prueba:', error.message);
  process.exit(1);
});
