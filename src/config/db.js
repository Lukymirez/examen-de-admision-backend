import mongoose from 'mongoose';

/**
 * Establece la conexión con MongoDB Atlas usando la URI definida
 * en la variable de entorno MONGO_URI.
 * Si la conexión falla, se detiene el proceso (fail-fast) para evitar
 * que el servidor quede corriendo sin acceso a la base de datos.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[MongoDB] Conectado correctamente: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Error de conexión: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
