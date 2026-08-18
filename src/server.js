import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import connectDB from './config/db.js';
import postulanteRoutes from './modules/postulante/postulante.routes.js';
import usuarioRoutes from './modules/usuario/usuario.routes.js';
import carreraRoutes from './modules/carrera/carrera.routes.js';
import convocatoriaRoutes from './modules/convocatoria/convocatoria.routes.js';
import preguntaRoutes from './modules/pregunta/pregunta.routes.js';

// Inicializar conexión a MongoDB Atlas
connectDB();

const app = express();

// Middlewares globales
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Ruta de salud del servicio
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'admision-2026-api' });
});

// Rutas de cada módulo (Feature-Based)
app.use('/api/postulantes', postulanteRoutes);
app.use('/api/auth', usuarioRoutes);
app.use('/api/carreras', carreraRoutes);
app.use('/api/convocatorias', convocatoriaRoutes);
app.use('/api/preguntas', preguntaRoutes);

// TODO: registrar aquí las rutas de los próximos módulos (simulacro/practica, resultados, etc.)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Server] Escuchando en el puerto ${PORT}`);
});
