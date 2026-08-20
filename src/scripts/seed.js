import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import Usuario from '../modules/usuario/usuario.model.js';
import Convocatoria from '../modules/convocatoria/convocatoria.model.js';
import Carrera from '../modules/carrera/carrera.model.js';
import Pregunta from '../modules/pregunta/pregunta.model.js';

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
  {
    nombres: 'Teodora',
    apellidos: 'Tesorería',
    dni: '00000004',
    email: 'tesoreria@admision.test',
    passwordPlano: 'Tesoreria1234!',
    rol: 'tesoreria',
  },
  {
    nombres: 'Carlos',
    apellidos: 'Comité',
    dni: '00000005',
    email: 'comite@admision.test',
    passwordPlano: 'Comite1234!',
    rol: 'comite',
  },
  {
    nombres: 'Sara',
    apellidos: 'Secretaría',
    dni: '00000006',
    email: 'secretaria@admision.test',
    passwordPlano: 'Secretaria1234!',
    rol: 'secretaria',
  },
];

// Pago de ejemplo, ya aprobado, para que el postulante de prueba quede
// COMPLETAMENTE consistente: pago visible como "aprobado" en su matrícula,
// verificado por Tesorería, Y con la postulación realmente habilitada por
// ese motivo (no por un atajo forzado).
const PAGO_SEED_POSTULANTE = {
  numeroOperacion: 'SEED-000001',
  fecha: new Date(),
  monto: 150,
  sede: 'Agencia San Miguel (dato de prueba)',
  ventanilla: '01',
  voucherUrl: '/uploads/matricula/seed-voucher-demo.png',
  estado: 'aprobado',
  verificadoTesoreria: true,
  fechaVerificacionTesoreria: new Date(),
};

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

// Banco de preguntas de arranque, transcritas y resueltas a partir de los
// simulacros reales del instituto (PRE Araoz Pinto). Es un subconjunto
// verificado con alta confianza — no las 160 preguntas completas de ambos
// simulacros — pensado para poder probar el flujo de examen de inmediato.
// Los docentes pueden seguir ampliando el banco desde su panel.
const PREGUNTAS_INICIALES = [
  // --- RAZONAMIENTO VERBAL ---
  { materia: 'razonamiento', enunciado: 'Sinónimo de HIGIENE', alternativas: ['Limpio', 'Aseo', 'Blancura', 'Adorno', 'Transparencia'], respuestaCorrecta: 1 },
  { materia: 'razonamiento', enunciado: 'Sinónimo de OCASO', alternativas: ['Casualidad', 'Oriente', 'Oculto', 'Puesta', 'Bruma'], respuestaCorrecta: 3 },
  { materia: 'razonamiento', enunciado: 'Sinónimo de PERJUDICIAL', alternativas: ['Dañar', 'Perjuicio', 'Consecuente', 'Causal', 'Nocivo'], respuestaCorrecta: 4 },
  { materia: 'razonamiento', enunciado: 'Sinónimo de DEVASTAR', alternativas: ['Desbastar', 'Asolar', 'Anegar', 'Destrucción', 'Desolación'], respuestaCorrecta: 1 },
  { materia: 'razonamiento', enunciado: 'Sinónimo de ESOTÉRICO', alternativas: ['Eximio', 'Endosado', 'Oculto', 'Encíclica', 'Zodiacal'], respuestaCorrecta: 2 },
  { materia: 'razonamiento', enunciado: 'Sinónimo de TEDIO', alternativas: ['Odio', 'Asaz', 'Hastío', 'Diversión', 'Estupor'], respuestaCorrecta: 2 },
  { materia: 'razonamiento', enunciado: 'Antónimo de AHORRAR', alternativas: ['Emplear', 'Derrochar', 'Vender', 'Usar', 'Gastar'], respuestaCorrecta: 1 },
  { materia: 'razonamiento', enunciado: 'Antónimo de PÉSIMO', alternativas: ['Bueno', 'Apto', 'Óptimo', 'Mejoría', 'Acto'], respuestaCorrecta: 2 },
  { materia: 'razonamiento', enunciado: 'Antónimo de SIEMPRE', alternativas: ['Negativo', 'Inconstancia', 'Jamás', 'Infrecuencia', 'Irregularidad'], respuestaCorrecta: 2 },
  { materia: 'razonamiento', enunciado: 'Antónimo de AFECTO', alternativas: ['Antipatía', 'Rechazo', 'Defecto', 'Cólera', 'Odio'], respuestaCorrecta: 4 },
  { materia: 'razonamiento', enunciado: 'Analogía — PAJA : PAJAR', alternativas: ['Árbol : aserradero', 'Cal : calera', 'Uva : lagar', 'Hierba : herbario', 'Grano : granero'], respuestaCorrecta: 4 },
  { materia: 'razonamiento', enunciado: 'Analogía — PLUVIÓMETRO : LLUVIA', alternativas: ['Temperatura : termómetro', 'Anemómetro : viento', 'Tiempo : cronómetro', 'Odómetro : longitud', 'Fotómetro : sonido'], respuestaCorrecta: 1 },
  { materia: 'razonamiento', enunciado: 'Analogía — PULSERA : MUÑECA', alternativas: ['Vidrio : ventana', 'Caja : frente', 'Corcho : botella', 'Collar : cuello', 'Lentes : ojos'], respuestaCorrecta: 3 },

  // --- COMUNICACIÓN / LITERATURA ---
  { materia: 'comunicacion', enunciado: 'El pícaro (personaje de la novela picaresca) es:', alternativas: ['Una persona distraída', 'Un animal silvestre', 'Una persona astuta', 'Una persona poco confiable', 'Alguien que constantemente miente'], respuestaCorrecta: 2 },
  { materia: 'comunicacion', enunciado: 'En el Siglo de Oro español se cultivaron tres tipos de novela: la pastoril, la caballeresca y la:', alternativas: ['Histórica', 'Psicológica', 'Científica', 'Autobiográfica', 'Picaresca'], respuestaCorrecta: 4 },
  { materia: 'comunicacion', enunciado: 'Está constituido por la narración oral o escrita de hechos grandiosos, donde los personajes realizan hazañas heroicas y presentan poderes sobrehumanos. ¿A qué género literario hace referencia?', alternativas: ['Teatro', 'Dramático', 'Lírico', 'Épico', 'Narrativo'], respuestaCorrecta: 3 },

  // --- HISTORIA ---
  { materia: 'historia', enunciado: 'Reemplazó como inca del Tahuantinsuyo a Túpac Huallpa, siendo coronado por Pizarro en Sacsawara, Cusco.', alternativas: ['Manco Inca', 'Tito Cusi Yupanqui', 'Toparpa', 'Sairi Túpac', 'Atahualpa'], respuestaCorrecta: 0 },
  { materia: 'historia', enunciado: 'En la organización político-social del Imperio Incaico, el jefe del ayllu recibía el nombre de:', alternativas: ['Tucuyricuc', 'Tutricut', 'Hatunruna', 'Curaca', 'Apocuna'], respuestaCorrecta: 3 },
  { materia: 'historia', enunciado: 'De acuerdo con el avance de los estudios arqueológicos, el edificio ceremonial más antiguo del Perú fue construido en el valle de:', alternativas: ['Zaña', 'Supe', 'Chicama', 'Paramonga', 'Cahuachi'], respuestaCorrecta: 1 },

  // --- GEOGRAFÍA ---
  { materia: 'geografia', enunciado: '¿Cuánto tarda la Tierra para dar una vuelta completa sobre su propio eje?', alternativas: ['24 horas', '12 horas', 'Un mes', '365 días', '23 horas'], respuestaCorrecta: 0 },
  { materia: 'geografia', enunciado: 'Es la circunferencia más grande de la Tierra:', alternativas: ['Línea Internacional de Fecha', 'Línea ecuatorial', 'Circunferencia polar', 'Meridiano de Greenwich', 'Trópico de Capricornio'], respuestaCorrecta: 1 },

  // --- CULTURA GENERAL / ECONOMÍA ---
  { materia: 'cultura', enunciado: 'El maullido de los gatos, las feromonas, danzas y otros movimientos de los animales son ejemplos de:', alternativas: ['Comunicación Verbal', 'Comunicación No Verbal', 'Comunicación No Humana', 'Comunicación Humana', 'Canales de comunicación'], respuestaCorrecta: 2 },
  { materia: 'cultura', enunciado: '"Si es cierto que todo bien económico tiene un valor de uso, pero todo lo que tiene valor de uso no es un bien económico". Un buen ejemplo de esta afirmación es:', alternativas: ['Un cuadro de pintura', 'Una bebida gaseosa', 'Un automóvil', 'El aire natural', 'Un saco de arroz'], respuestaCorrecta: 3 },
  { materia: 'cultura', enunciado: 'Es materia prima:', alternativas: ['Conserva de pescado', 'Atún', 'Aceite', 'Madera', 'Pez'], respuestaCorrecta: 3 },
  { materia: 'cultura', enunciado: 'Es materia bruta:', alternativas: ['Árbol', 'Hoja', 'Madera', 'Mueble', 'Pescado'], respuestaCorrecta: 0 },

  // --- MATEMÁTICA (Aritmética / Álgebra / Geometría / Razonamiento Matemático) ---
  { materia: 'matematica', enunciado: 'Una esfera se suelta desde 80 m de altura. Calcular el tiempo que demora en caer y la velocidad con la cual impacta en el piso (g = 10 m/s²).', alternativas: ['12 s, 20 m/s', '16 s, 5 m/s', '10 s, 8 m/s', '4 s, 40 m/s', '3 s, 30 m/s'], respuestaCorrecta: 3 },
  { materia: 'matematica', enunciado: 'Si con 6 tapitas de Kiko (gaseosa de medio litro) puedo canjear una llena, ¿cuántas gaseosas canjearía como máximo con 62 tapitas?', alternativas: ['15', '12', '14', '17', '22'], respuestaCorrecta: 1 },
  { materia: 'matematica', enunciado: 'Calcular la suma de los ángulos interiores de un octágono regular.', alternativas: ['900°', '1080°', '108°', '1821°', '1008°'], respuestaCorrecta: 1 },
  { materia: 'matematica', enunciado: 'Determinar la cuarta diferencial de los números que se presentan a continuación: 632, 541 y 214.', alternativas: ['108', '113', '123', '256', '305'], respuestaCorrecta: 2 },

  // --- CIENCIAS (Física / Química / Biología) ---
  { materia: 'ciencias', enunciado: 'El tritio (³₁H) tiene:', alternativas: ['2 protones y un neutrón', '1 neutrón y un protón', '3 protones', '1 protón y 2 neutrones', '3 neutrones'], respuestaCorrecta: 3 },
  { materia: 'ciencias', enunciado: 'Moneda energética de la célula, es la fuente de energía inmediata para el trabajo celular.', alternativas: ['UTP', 'ARN', 'GTP', 'ATP', 'ADP'], respuestaCorrecta: 3 },
  { materia: 'ciencias', enunciado: 'La importancia ecológica de las plantas es la de:', alternativas: ['Ser productoras de la cadena alimenticia', 'Ser desintegradoras de materia orgánica', 'Ser consumidoras primarias', 'Ser consumidoras secundarias', 'Ser descomponedoras'], respuestaCorrecta: 0 },
  { materia: 'ciencias', enunciado: '¿Cuál bioelemento es considerado primario u organógeno?', alternativas: ['Oxígeno', 'Níquel', 'Calcio', 'Magnesio', 'Manganeso'], respuestaCorrecta: 0 },
  { materia: 'ciencias', enunciado: 'La información genética está almacenada en el:', alternativas: ['ADN', 'ARNm', 'ATP', 'ARNr', 'ARNt'], respuestaCorrecta: 0 },
  { materia: 'ciencias', enunciado: 'Polisacárido estructural presente en el exoesqueleto de los artrópodos:', alternativas: ['Celulosa', 'Glicerol', 'Glucosa', 'Quitina', 'Aminoácido'], respuestaCorrecta: 3 },
  { materia: 'ciencias', enunciado: 'La principal función de la membrana plasmática es:', alternativas: ['Protección', 'Transporte de sustancias', 'Transcripción', 'Dar forma celular', 'Síntesis de proteínas'], respuestaCorrecta: 1 },
  { materia: 'ciencias', enunciado: 'Un elemento tiene configuración electrónica terminada en 5p3. Hallar su número atómico.', alternativas: ['50', '51', '52', '53', '54'], respuestaCorrecta: 1 },
  { materia: 'ciencias', enunciado: '¿Qué unión NO representa un enlace iónico?', alternativas: ['K y O', 'Na y Cl', 'O y H', 'Ca y O', 'Li y F'], respuestaCorrecta: 2 },
  { materia: 'ciencias', enunciado: 'Es un ejemplo de mezcla heterogénea:', alternativas: ['Agua con sacarosa disuelta', 'Agua con cloruro de sodio disuelto', 'Agua con H disuelto', 'Agua potable', 'Sangre'], respuestaCorrecta: 4 },

  // --- SEGUNDO LOTE (verificación adicional) ---
  { materia: 'razonamiento', enunciado: '"El abad aún no llegaba al monasterio." La palabra subrayada puede reemplazarse por:', alternativas: ['Custodio', 'Desamparado', 'Prior', 'Jurista', 'Mediador'], respuestaCorrecta: 2 },
  { materia: 'razonamiento', enunciado: '"Nuestro amor ha sido acrisolado por la mano de Dios." La palabra subrayada puede reemplazarse por:', alternativas: ['Perfeccionado', 'Depurado', 'Purificado', 'Aseado', 'Acerado'], respuestaCorrecta: 2 },
  { materia: 'razonamiento', enunciado: 'Analogía — PALEONTÓLOGO : FÓSILES', alternativas: ['Espeleólogo : cavernas', 'Ruinas : arqueólogo', 'Herpetología : reptiles', 'Psicólogo : mente', 'Histólogo : historia'], respuestaCorrecta: 0 },
  { materia: 'razonamiento', enunciado: 'Analogía — DICIEMBRE : ABRIL', alternativas: ['Navidad : verano', 'Sagitario : aries', 'Viernes : jueves', 'Tierra : Marte', 'Rojo : azul'], respuestaCorrecta: 1 },
  { materia: 'razonamiento', enunciado: 'Analogía — MANGO : PEPA', alternativas: ['Espaldar : silla', 'Timón : carro', 'Alumno : mano', 'Huevo : yema', 'Perro : pata'], respuestaCorrecta: 3 },
  { materia: 'razonamiento', enunciado: 'Analogía — ZAPATERO : LEZNA', alternativas: ['Betún : escobilla', 'Badilejo : albañil', 'Escultor : cincel', 'Marte : planeta', 'Serrucho : carpintero'], respuestaCorrecta: 2 },
  { materia: 'razonamiento', enunciado: 'Completa: "Nada hay en la ___ que no haya pasado por los ___".', alternativas: ['Vida - recuerdos', 'Mente - test', 'Inteligencia - sentidos', 'Existencias - hombres', 'Humanidad - inventos'], respuestaCorrecta: 2 },
  { materia: 'razonamiento', enunciado: 'Completa: "Una vela ___ puede ___ cien mil velas apagadas; cien mil velas ___ nunca podrán ___ una sola vela".', alternativas: ['prendida–apagar / prendidas–apagar', 'apagada–apagar / apagadas–encender', 'apagada–prender / prendidas–apagar', 'prendida–prender / apagadas–encender', 'prendida–apagar / prendidas–encender'], respuestaCorrecta: 3 },

  { materia: 'cultura', enunciado: 'Todos nacemos con la capacidad de adquirir el lenguaje. Por lo que este es:', alternativas: ['Ni aprendido, ni olvidado', 'Universal e innato', 'Inmutable', 'Aprendido y olvidado', 'Solo doblemente articulado'], respuestaCorrecta: 1 },

  { materia: 'matematica', enunciado: 'Siguiendo el patrón de la secuencia de figuras triangulares (Fig. 1, Fig. 2, Fig. 3, ...), halle el número de bolitas en la figura 10.', alternativas: ['59', '65', '66', '74', '48'], respuestaCorrecta: 2 },
  { materia: 'matematica', enunciado: 'Siguiendo el mismo patrón de figuras triangulares, halle el número de bolitas en la figura 50.', alternativas: ['1359', '1365', '1326', '1374', '1348'], respuestaCorrecta: 2 },
  { materia: 'matematica', enunciado: 'La cabeza de un pescado mide 30 cm, la cola mide 5 cm menos que la cabeza y el cuerpo mide tanto como la cabeza y la cola juntas. ¿Cuál es la longitud en cm del pescado?', alternativas: ['50 cm', '80 cm', '110 cm', '40 cm', '85 cm'], respuestaCorrecta: 2 },
  { materia: 'matematica', enunciado: 'Resuelve: (√3ˣ)³ = 9', alternativas: ['1/3', '3/4', '4/3', '2', '1/2'], respuestaCorrecta: 2 },
  { materia: 'matematica', enunciado: 'Halla "x" si: (2/5)^(3x-6) = 25/4', alternativas: ['3/4', '4/3', '1/2', '1/6', '2/9'], respuestaCorrecta: 1 },
  { materia: 'matematica', enunciado: 'De la figura mostrada, AB/2 = BC/3 = CD/5; AD = 30 cm. Calcular BC.', alternativas: ['4 cm', '5 cm', '6 cm', '9 cm', '12 cm'], respuestaCorrecta: 3 },
  { materia: 'matematica', enunciado: 'Sabiendo que tg(5x)·ctg(x+40°) = 1. Calcular: cos(3x)', alternativas: ['1', '1/2', '√3/2', '√3', '2/3'], respuestaCorrecta: 2 },

  // --- TERCER LOTE ---
  // Comprensión de lectura — Texto I (fragmento sobre el reconocimiento de Talissa)
  { materia: 'comunicacion', enunciado: 'Texto: "...sentí en mis brazos su cuerpecito frágil y débil... vi de pronto otra figura mucho más conocida: ¡Talissa era la pobre muchachita de tantas canciones populares!... me sentí como si reviviera un amor ya experimentado mil veces..." El texto narra fundamentalmente el modo en que:', alternativas: ['Se conocen Talissa y el narrador-personaje', 'La canción popular genera una relación amorosa', 'Talissa se rompe una pierna y es llevada al hospital', 'La pobre muchachita forma parte de una canción', 'El narrador sueña con su boda y la espera con ilusión'], respuestaCorrecta: 1 },
  { materia: 'comunicacion', enunciado: 'Del mismo texto (Talissa): dado que el narrador la lleva en brazos tras el accidente durante "un ensayo", y compara el reconocimiento con "tocar una partitura amorosa antiquísima", cabe deducir que el narrador es:', alternativas: ['Leñador', 'Músico', 'Enfermero', 'Deportista', 'Compositor'], respuestaCorrecta: 1 },
  { materia: 'comunicacion', enunciado: 'Del mismo texto (Talissa): el reconocimiento de Talissa como la "pequeña muchachita" de las canciones surge:', alternativas: ['En el primer instante de su reencuentro inesperado', 'Después de muchos años de haberse conocido', 'Del contacto con la fragilidad de su cuerpo femenino', 'Por el parecido físico de ella con una huérfana conocida', 'De la identificación de la canción popular como muy conocida'], respuestaCorrecta: 2 },
  { materia: 'comunicacion', enunciado: 'Del mismo texto (Talissa): el amor del narrador se origina en:', alternativas: ['La identificación de Talissa con la muchachita de las canciones', 'El primer encuentro amoroso del narrador con la niña Talissa', 'La ambulancia que llevó a Talissa al hospital', 'El tamaño y la fuerza física del narrador', 'La pierna rota de Talissa durante el ensayo'], respuestaCorrecta: 0 },

  // Comprensión de lectura — Texto II (sinopsis de "El amor en los tiempos del cólera")
  { materia: 'comunicacion', enunciado: 'Texto: "...Florentino Ariza y Fermina Daza se aman desde su juventud. Sin embargo, Florentino es un joven sin posición social y Fermina se casa con el doctor Urbino... Cincuenta años después, Fermina enviuda... Se trata de un amor maduro, senil pero por lo mismo auténtico y puro. El tema central es, sin duda, el amor; pero lo que se valora, sobre todo, es el amor ideal, más allá de todo." El tema central de la novela es:', alternativas: ['La pasión erótica', 'El amor erótico en la vejez', 'El amor ideal', 'El amor con sentido del humor', 'El amor de la juventud'], respuestaCorrecta: 2 },
  { materia: 'comunicacion', enunciado: 'Del mismo texto (El amor en los tiempos del cólera): con respecto a la novela, el autor presenta básicamente:', alternativas: ['Un tema social y político', 'Las magistrales condiciones de su estilo', 'Una historia melodramática', 'Las contradicciones de la historia', 'Su argumento y un ensayo crítico'], respuestaCorrecta: 4 },
  { materia: 'comunicacion', enunciado: 'Del mismo texto (El amor en los tiempos del cólera): la boda de Fermina con el doctor Urbino, es deducible, obedeció a presiones:', alternativas: ['Sociales', 'Sentimentales', 'Románticas', 'Profesionales', 'Revanchistas'], respuestaCorrecta: 0 },
  { materia: 'comunicacion', enunciado: 'Del mismo texto (El amor en los tiempos del cólera): del siguiente conjunto de enunciados, reconozca el que es incompatible con el texto.', alternativas: ['En su juventud, Fermina Daza no amaba a Florentino Ariza', 'Florentino vivió una intensa y superficial vida erótica', 'Fermina llevó una existencia apacible como madre de familia', 'El amor de Fermina y Florentino se reencuentra en la vejez', 'Florentino nunca olvidó su amor de juventud por Fermina'], respuestaCorrecta: 0 },

  // Matemática — problemas verificados con desarrollo completo
  { materia: 'matematica', enunciado: 'El largo de un rectángulo es el cuádruple del ancho. Si el largo tuviera 10 cm menos y el ancho se duplica, la figura se convertiría en un cuadrado. Hallar el área del rectángulo.', alternativas: ['4 cm²', '100 cm²', '40 cm²', '60 cm²', '190 cm²'], respuestaCorrecta: 1 },
  { materia: 'matematica', enunciado: 'Sofía, Katy, Ana y Luz reciben flores de sus enamorados. Sofía recibe el doble de flores que Ana. Luz recibió 4 flores menos que Ana. Katy recibió el triple de flores que Luz. Si en total las cuatro recibieron 61 flores, ¿cuántas flores recibió Katy?', alternativas: ['18', '21', '24', '15', '2'], respuestaCorrecta: 1 },
  { materia: 'matematica', enunciado: 'Dos secretarias deben escribir 600 cartas cada una. La primera escribe 15 cartas por hora y la segunda 13 cartas por hora. Cuando la primera termine su tarea, ¿cuántas cartas le faltarán escribir a la segunda?', alternativas: ['50', '80', '30', '40', '60'], respuestaCorrecta: 1 },

  // --- CUARTO LOTE ---
  { materia: 'matematica', enunciado: '¿Cuántas bolitas se contarán en la figura 20? (secuencia: figura 1 tiene 3 bolitas, figura 2 tiene 5, figura 3 tiene 7...)', alternativas: ['32', '20', '41', '23', '31'], respuestaCorrecta: 2 },
  { materia: 'matematica', enunciado: 'La razón geométrica de dos números vale 7/4 y su razón aritmética es 45. Determina el menor de los números.', alternativas: ['52', '65', '60', '45', '50'], respuestaCorrecta: 2 },
  { materia: 'matematica', enunciado: 'Si: P(3x-2) = 12x-5. Hallar: M = P(x+1) - P(x-1)', alternativas: ['7', '-1', '8', '1', '10'], respuestaCorrecta: 2 },
  { materia: 'matematica', enunciado: 'Reducir: E = cot(270°-x)/tg(-x) + csc(90°+x)/sec(-x)', alternativas: ['0', '2', '-2', '2tgx', '-2cotx'], respuestaCorrecta: 0 },
  { materia: 'matematica', enunciado: 'Calcular: E = sen150° + tg225° + cos300°', alternativas: ['0', '1', '2', '-1', '-2'], respuestaCorrecta: 2 },

  // --- QUINTO LOTE ---
  { materia: 'comunicacion', enunciado: 'Completa: "Los versos que hoy te escribo tienen un motivo ___ Tus fulgurantes ojos me han arrobado ___".', alternativas: ['gallardos – embelesado', 'brillantes – desafiado', 'resplandecientes – extasiado', 'implacables – maravillado', 'embrujado – hechizado'], respuestaCorrecta: 2 },
  { materia: 'comunicacion', enunciado: 'Del texto de Talissa: Talissa se convirtió de pronto en:', alternativas: ['Una muchacha huérfana y débil', 'La chica más frágil y débil del ensayo', 'Una compositora de canciones populares', 'La protagonista de una novela', 'Una bailarina profesional'], respuestaCorrecta: 0 },
  { materia: 'comunicacion', enunciado: 'Del texto de "El amor en los tiempos del cólera": de haber poseído Florentino una elevada posición social, probablemente Fermina:', alternativas: ['Habría sentido lo mismo por Urbino', 'Habría preferido a Urbino', 'Lo habría rechazado a él', 'Lo habría amado solo en la vejez', 'Se habría casado con él'], respuestaCorrecta: 4 },
  { materia: 'matematica', enunciado: 'Halle el total de palitos usados en la secuencia de figuras 1, 2, 3, ..., hasta la figura 16.', alternativas: ['232', '202', '240', '223', '312'], respuestaCorrecta: 2 },
  { materia: 'matematica', enunciado: 'El número de lapiceros rojos y azules de Raquel están en la relación de 3 a 5. Si en total tiene 80 lapiceros, ¿cuántos lapiceros rojos tiene Raquel?', alternativas: ['12', '14', '20', '17', '30'], respuestaCorrecta: 4 },
];

const ejecutarSeed = async () => {
  await connectDB();

  const generarCodigoPostulanteSeed = async () => {
    const anio = new Date().getFullYear().toString().slice(-2);
    const total = await Usuario.countDocuments({ codigoPostulante: { $ne: null } });
    return `P${anio}-${String(total + 1).padStart(5, '0')}`;
  };

  console.log('\n[Seed] Creando/actualizando usuarios de prueba...\n');

  let docenteId = null;

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

    // Al postulante de prueba le insertamos un pago YA aprobado y verificado
    // (dato de ejemplo), para que el flujo completo quede consistente:
    // matrícula muestra "aprobado", y la postulación queda habilitada con
    // su código — igual que pasaría con un pago real revisado por el equipo.
    if (datos.rol === 'postulante' && usuario.matricula.pagos.length === 0) {
      usuario.matricula.pagos.push(PAGO_SEED_POSTULANTE);
      usuario.postulacionHabilitada = true;
      usuario.codigoPostulante = usuario.codigoPostulante || (await generarCodigoPostulanteSeed());
      await usuario.save();
      console.log(`   └─ Pago de ejemplo aprobado, postulación habilitada, código: ${usuario.codigoPostulante}`);
    }

    // Guardamos la referencia del docente de prueba: será el "autor" del
    // banco de preguntas inicial, y también quien las valida (simula al
    // Comité aprobando su propio contenido, solo para tener datos de prueba).
    if (datos.rol === 'docente') {
      docenteId = usuario._id;
    }
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

  console.log('\n[Seed] Creando/actualizando banco de preguntas inicial (simulacros reales)...\n');

  let contadorPreguntas = 0;
  for (const datos of PREGUNTAS_INICIALES) {
    await Pregunta.findOneAndUpdate(
      { enunciado: datos.enunciado, autorId: docenteId },
      {
        materia: datos.materia,
        enunciado: datos.enunciado,
        alternativas: datos.alternativas,
        respuestaCorrecta: datos.respuestaCorrecta,
        autorId: docenteId,
        estado: 'validada', // listas de inmediato para el sorteo del examen
        validadaPor: docenteId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    contadorPreguntas += 1;
  }
  console.log(`✅ ${contadorPreguntas} preguntas cargadas/actualizadas, repartidas en las 7 materias, ya validadas.`);

  console.log('\n[Seed] Listo. Usa las credenciales de arriba para iniciar sesión, y ya deberían aparecer las 9 carreras en el formulario de registro.\n');

  await mongoose.disconnect();
  process.exit(0);
};

ejecutarSeed().catch((error) => {
  console.error('[Seed] Error al ejecutar el seed:', error.message);
  process.exit(1);
});

