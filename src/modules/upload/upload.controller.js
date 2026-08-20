import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import multer from 'multer';

const CARPETA_UPLOADS_PREGUNTAS = path.join(process.cwd(), 'uploads', 'preguntas');
fs.mkdirSync(CARPETA_UPLOADS_PREGUNTAS, { recursive: true });

const CARPETA_UPLOADS_MATRICULA = path.join(process.cwd(), 'uploads', 'matricula');
fs.mkdirSync(CARPETA_UPLOADS_MATRICULA, { recursive: true });

const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const TIPOS_DOCUMENTO = [...TIPOS_IMAGEN, 'application/pdf'];
const TAMANO_MAXIMO_MB = 5;

const crearStorage = (carpeta) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, carpeta),
    filename: (req, file, cb) => {
      const nombreUnico = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`;
      cb(null, nombreUnico);
    },
  });

const crearFiltro = (tiposPermitidos, mensajeError) => (req, file, cb) => {
  if (!tiposPermitidos.includes(file.mimetype)) {
    return cb(new Error(mensajeError));
  }
  cb(null, true);
};

const uploadImagen = multer({
  storage: crearStorage(CARPETA_UPLOADS_PREGUNTAS),
  fileFilter: crearFiltro(TIPOS_IMAGEN, 'Formato de imagen no permitido. Usa PNG, JPG o WEBP.'),
  limits: { fileSize: TAMANO_MAXIMO_MB * 1024 * 1024 },
});

const uploadDocumento = multer({
  storage: crearStorage(CARPETA_UPLOADS_MATRICULA),
  fileFilter: crearFiltro(TIPOS_DOCUMENTO, 'Formato no permitido. Usa PNG, JPG, WEBP o PDF.'),
  limits: { fileSize: TAMANO_MAXIMO_MB * 1024 * 1024 },
});

/** Middleware de Express para el campo "imagen" del formulario de preguntas. */
export const subirImagenMiddleware = uploadImagen.single('imagen');

/** Middleware de Express para el campo "documento" del formulario de matrícula. */
export const subirDocumentoMiddleware = uploadDocumento.single('documento');

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

/**
 * POST /api/uploads/documento — Postulante sube un documento de matrícula
 * (foto carné, DNI, certificado de estudios, declaración jurada, voucher
 * de pago). Devuelve la URL pública para guardarla en Usuario.matricula.
 */
export const subirDocumento = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ mensaje: 'No se recibió ningún documento.' });
  }

  const url = `/uploads/matricula/${req.file.filename}`;
  return res.status(201).json({ mensaje: 'Documento subido correctamente.', url });
};
