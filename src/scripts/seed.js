import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import Usuario from '../modules/usuario/usuario.model.js';
import Convocatoria from '../modules/convocatoria/convocatoria.model.js';
import Carrera from '../modules/carrera/carrera.model.js';

/**
 * Script semillero (seed): crea 3 cuentas de prueba ya verificadas y activas,
 * más la convocatoria y las carreras reales del instituto — para que el
 * formulario de registro (que necesita elegir una carrera) tenga datos con
 * los que trabajar desde el primer momento.
 *
 * Uso:
 *   yarn seed
 *   (o: node src/scripts/seed.js)
 *
 * Es seguro correrlo varias veces: si un registro ya existe, lo actualiza
 * en vez de duplicarlo.
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

// Carreras reales del Instituto Superior Tecnológico Público María Rosario
// Araoz Pinto (San Miguel, Lima). Las vacantes son un valor de ejemplo —
// ajústalas desde el panel administrativo cuando esté disponible.
const CARRERAS_REALES = [
  { nombre: 'Administración de Empresas', vacantes: 40 },
  { nombre: 'Contabilidad', vacantes: 40 },
  { nombre: 'Construcción Civil', vacantes: 30 },
  { nombre: 'Desarrollo de Sistemas de Información', vacantes: 40 },
  { nombre: 'Diseño Gráfico', vacantes: 30 },
  { nombre: 'Diseño Publicitario', vacantes: 30 },
  { nombre: 'Secretariado Ejecutivo', vacantes: 30 },
  { nombre: 'Mecánica Automotriz', vacantes: 30 },
  { nombre: 'Mecánica de Producción', vacantes: 30 },
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

  console.log('\n[Seed] Creando/actualizando convocatoria y carreras...\n');

  const convocatoria = await Convocatoria.findOneAndUpdate(
    { nombre: 'Admisión Ordinaria 2026-II' },
    {
      nombre: 'Admisión Ordinaria 2026-II',
      modalidad: 'ordinario',
      fechaInicio: new Date('2026-08-01'),
      fechaFin: new Date('2026-09-15'),
      fechaExamen: new Date('2026-09-20'),
      estado: 'publicada',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`✅ Convocatoria     → ${convocatoria.nombre} (${convocatoria.estado})`);

  for (const datos of CARRERAS_REALES) {
    const carrera = await Carrera.findOneAndUpdate(
      { nombre: datos.nombre, convocatoriaId: convocatoria._id },
      { nombre: datos.nombre, vacantes: datos.vacantes, convocatoriaId: convocatoria._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ Carrera          → ${carrera.nombre} (${carrera.vacantes} vacantes)`);
  }

  console.log('\n[Seed] Listo. Usa las credenciales de arriba para iniciar sesión, y ya deberían aparecer las 9 carreras en el formulario de registro.\n');

  await mongoose.disconnect();
  process.exit(0);
};

ejecutarSeed().catch((error) => {
  console.error('[Seed] Error al ejecutar el seed:', error.message);
  process.exit(1);
});

