import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import multer from 'multer';

const CARPETA_UPLOADS = path.join(process.cwd(), 'uploads', 'preguntas');
fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });

const TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const TAMANO_MAXIMO_MB = 5;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CARPETA_UPLOADS),
  filename: (req, file, cb) => {
    const nombreUnico = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, nombreUnico);
  },
});

const filtroArchivo = (req, file, cb) => {
  if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
    return cb(new Error('Formato de imagen no permitido. Usa PNG, JPG o WEBP.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter: filtroArchivo,
  limits: { fileSize: TAMANO_MAXIMO_MB * 1024 * 1024 },
});

/** Middleware de Express para el campo "imagen" del formulario (multipart/form-data). */
export const subirImagenMiddleware = upload.single('imagen');

/**
 * POST /api/uploads/imagen — Docente/Comité suben una imagen de apoyo para
 * una pregunta (diagramas, gráficos, fórmulas). Devuelve la URL pública para
 * guardarla luego en Pregunta.imagenUrl.
 */
export const subirImagen = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ mensaje: 'No se recibió ninguna imagen.' });
  }

  const url = `/uploads/preguntas/${req.file.filename}`;
  return res.status(201).json({ mensaje: 'Imagen subida correctamente.', url });
};
