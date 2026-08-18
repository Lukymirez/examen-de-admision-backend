import jwt from 'jsonwebtoken';

/**
 * Verifica que la petición traiga un JWT válido en el header Authorization.
 * Formato esperado: "Authorization: Bearer <token>"
 */
export const verificarToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ mensaje: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const verificado = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = verificado; // { id, rol, email }
    next();
  } catch (error) {
    return res.status(400).json({ mensaje: 'Token inválido o expirado.' });
  }
};

/**
 * Restringe el acceso a los roles indicados.
 * Uso: router.post('/ruta', verificarToken, permitirRoles('comite', 'administrador'), controlador)
 */
export const permitirRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        mensaje: 'Acceso prohibido: no tienes los permisos necesarios para esta acción.',
      });
    }
    next();
  };
};
