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

// Banco de preguntas de arranque, transcritas de la clave oficial de
// respuestas de los simulacros reales del instituto (PRE Araoz Pinto).
// 156 de las 160 preguntas — se omitieron 4 con datos corrompidos en el
// documento fuente (opciones duplicadas/inconsistentes con la pregunta).
// Las que dependen de una figura/imagen quedan marcadas con
// "necesitaImagen: true" y entran como "borrador" hasta que se les
// adjunte la foto real desde el panel del docente/comité.
const PREGUNTAS_INICIALES = [
  { materia: "razonamiento", enunciado: "Sinónimo de ESOTÉRICO", alternativas: ["Eximio", "Endosado", "Oculto", "Encíclica", "Zodiacal"], respuestaCorrecta: 2 },
  { materia: "razonamiento", enunciado: "Sinónimo de TEDIO", alternativas: ["Odio", "Asaz", "Hastío", "Diversión", "Estupor"], respuestaCorrecta: 2 },
  { materia: "razonamiento", enunciado: "\"El abad aún no llegaba al monasterio.\" La palabra subrayada puede reemplazarse por:", alternativas: ["Custodio", "Desamparado", "Prior", "Jurista", "Mediador"], respuestaCorrecta: 2 },
  { materia: "razonamiento", enunciado: "\"Nuestro amor ha sido acrisolado por la mano de Dios.\" La palabra subrayada puede reemplazarse por:", alternativas: ["Perfeccionado", "Depurado", "Purificado", "Aseado", "Acerado"], respuestaCorrecta: 2 },
  { materia: "comunicacion", enunciado: "Completa: \"Los versos que hoy te escribo tienen un motivo ___ Tus fulgurantes ojos me han arrobado ___\".", alternativas: ["Gallardos – embelesado", "Brillantes – desafiado", "Resplandecientes – extasiado", "Implacables – maravillado", "Embrujado – hechizado"], respuestaCorrecta: 2 },
  { materia: "razonamiento", enunciado: "Analogía — PALEONTÓLOGO : FÓSILES", alternativas: ["Espeleólogo : cavernas", "Ruinas : arqueólogo", "Herpetología : reptiles", "Psicólogo : mente", "Histólogo : historia"], respuestaCorrecta: 0 },
  { materia: "razonamiento", enunciado: "Analogía — DICIEMBRE : ABRIL", alternativas: ["Navidad : verano", "Sagitario : aries", "Viernes : jueves", "Tierra : Marte", "Rojo : azul"], respuestaCorrecta: 1 },
  { materia: "razonamiento", enunciado: "Analogía — MANGO : PEPA", alternativas: ["Espaldar : silla", "Timón : carro", "Alumno : mano", "Huevo : yema", "Perro : pata"], respuestaCorrecta: 3 },
  { materia: "razonamiento", enunciado: "Analogía — ZAPATERO : LEZNA", alternativas: ["Betún : escobilla", "Badilejo : albañil", "Escultor : cincel", "Marte : planeta", "Serrucho : carpintero"], respuestaCorrecta: 2 },
  { materia: "razonamiento", enunciado: "Completa: \"Nada hay en la ___ que no haya pasado por los ___\".", alternativas: ["Vida - recuerdos", "Mente - test", "Inteligencia - sentidos", "Existencias - hombres", "Humanidad - inventos"], respuestaCorrecta: 2 },
  { materia: "razonamiento", enunciado: "Completa: \"Una vela ___ puede ___ cien mil velas apagadas; cien mil velas ___ nunca podrán ___ una sola vela\".", alternativas: ["prendida - apagar / prendidas - apagar", "apagada - apagar / apagadas - encender", "apagada - prender / prendidas - apagar", "prendida - prender / apagadas - encender", "prendida - apagar / prendidas - encender"], respuestaCorrecta: 3 },
  { materia: "razonamiento", enunciado: "Completa: \"Frente a una tormenta, el ___ ve solo el lado oscuro de la nube y se abate; el ___ ve ambos lados y se encoge de hombros; el ___ no ve las nubes, anda sobre ellas; pero el ___ ajusta las velas\".", alternativas: ["pobre - inseguro - presumido - pequeño", "asustado - tímido - invidente - materialista", "negativo - indiferente - positivo - derrotista", "teórico - hipotético - práctico - ideólogo", "pesimista - filósofo - optimista - realista"], respuestaCorrecta: 4 },
  { materia: "razonamiento", enunciado: "Término excluido — PECUARIO", alternativas: ["Ganado", "Joyería", "Pesca", "Agrícola", "Comercio"], respuestaCorrecta: 1 },
  { materia: "razonamiento", enunciado: "Término excluido — ADJETIVO (¿cuál no es una clase de palabra directamente relacionada?)", alternativas: ["Conjunción", "Pronombre", "Sustantivo", "Artículo", "Verbo"], respuestaCorrecta: 0 },
  { materia: "razonamiento", enunciado: "Término excluido — HIPOCORÍSTICO (nombre que NO es hipocorístico)", alternativas: ["Mañu", "Heraud", "Platón", "Velasco", "Goethe"], respuestaCorrecta: 0 },
  { materia: "razonamiento", enunciado: "Término excluido — POETA (¿cuál de estos autores NO es poeta?)", alternativas: ["Arguedas", "Vallejo", "Vargas Llosa", "Sabogal", "Valdelomar"], respuestaCorrecta: 3 },
  { materia: "comunicacion", enunciado: "Texto: \"...sentí en mis brazos su cuerpecito frágil y débil... vi de pronto otra figura mucho más conocida: ¡Talissa era la pobre muchachita de tantas canciones populares!... me sentí como si reviviera un amor ya experimentado mil veces...\" El texto narra fundamentalmente el modo en que:", alternativas: ["Se conocen Talissa y el narrador-personaje", "La canción popular genera una relación amorosa", "Talissa se rompe una pierna y es llevada al hospital", "La pobre muchachita forma parte de una canción", "El narrador sueña con su boda y la espera con ilusión"], respuestaCorrecta: 1 },
  { materia: "comunicacion", enunciado: "Del texto de Talissa: Talissa se convirtió de pronto en:", alternativas: ["Una muchacha huérfana y débil", "La chica más frágil y débil del ensayo", "La realización de una figura popular", "Una muchacha inválida y taciturna", "La esposa del fornido personaje"], respuestaCorrecta: 2 },
  { materia: "comunicacion", enunciado: "Del texto de Talissa: dado que el narrador la lleva en brazos tras el accidente \"durante un ensayo\", cabe deducir que el narrador es:", alternativas: ["Leñador", "Músico", "Enfermero", "Deportista", "Compositor"], respuestaCorrecta: 1 },
  { materia: "comunicacion", enunciado: "Del texto de Talissa: el reconocimiento de Talissa como la \"pequeña muchachita\" surge:", alternativas: ["En el primer instante de su reencuentro inesperado", "Después de muchos años de haberse conocido", "Del contacto con la fragilidad de su cuerpo femenino", "Por el parecido físico de ella con una huérfana conocida", "De la identificación de la canción como popular"], respuestaCorrecta: 2 },
  { materia: "comunicacion", enunciado: "Del texto de Talissa: el amor del narrador se origina en:", alternativas: ["La identificación de Talissa con la muchachita de las canciones", "El primer encuentro amoroso del narrador con la niña Talissa", "El momento en que tuvo que defender el honor de la muchacha", "Su afán de conquistar a todas las chicas del ensayo musical", "La imposibilidad real de relacionarse con el género opuesto"], respuestaCorrecta: 0 },
  { materia: "comunicacion", enunciado: "Texto: \"...Florentino Ariza y Fermina Daza se aman desde su juventud. Sin embargo, Florentino es un joven sin posición social y Fermina se casa con el doctor Urbino... lo que se valora, sobre todo, es el amor ideal, más allá de las contingencias de la pasión erótica.\" El tema central de la novela es:", alternativas: ["La pasión erótica", "El amor erótico en la vejez", "El amor ideal", "El amor con sentido del humor", "El amor de la juventud"], respuestaCorrecta: 2 },
  { materia: "comunicacion", enunciado: "Del mismo texto (El amor en los tiempos del cólera): con respecto a la novela, el autor presenta básicamente:", alternativas: ["Un tema social y político", "Las magistrales condiciones de su estilo", "Una historia melodramática", "Las contradicciones de la historia", "Su argumento y un ensayo crítico"], respuestaCorrecta: 4 },
  { materia: "comunicacion", enunciado: "Del mismo texto: de haber poseído Florentino una elevada posición social, probablemente Fermina:", alternativas: ["Habría sentido lo mismo por Urbino", "Habría preferido a Urbino", "Lo habría rechazado a él", "Lo habría amado solo en la vejez", "Se habría casado con él"], respuestaCorrecta: 4 },
  { materia: "comunicacion", enunciado: "Del mismo texto: la boda de Fermina con el doctor Urbino, es deducible, obedeció a presiones:", alternativas: ["Sociales", "Sentimentales", "Románticas", "Profesionales", "Revanchistas"], respuestaCorrecta: 0 },
  { materia: "comunicacion", enunciado: "Del mismo texto: del siguiente conjunto de enunciados, reconozca el que es incompatible con el texto.", alternativas: ["En su juventud, Fermina Daza no amaba a Florentino Ariza", "La intensa vida erótica de Florentino fue superficial", "Florentino y Fermina se amaron desde que fueron jóvenes", "El hilo conductor de la novela es centralmente el amor", "La trama de la novela se aproxima mucho al melodrama"], respuestaCorrecta: 0 },
  { materia: "matematica", enunciado: "Halle el total de palitos de fósforo en una secuencia de figuras triangulares numeradas del 1 al 16.", alternativas: ["232", "202", "240", "223", "312"], respuestaCorrecta: 2, necesitaImagen: true },
  { materia: "matematica", enunciado: "¿Cuántas bolas hay en la figura 10? (Fig.1 = 3 esferas, Fig.2 = 6 esferas, Fig.3 = 10 esferas, formando pirámides)", alternativas: ["59", "65", "66", "74", "48"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "Halle el número de bolitas en la figura 20, siguiendo un arreglo triangular de círculos.", alternativas: ["259", "265", "210", "274", "248"], respuestaCorrecta: 2, necesitaImagen: true },
  { materia: "matematica", enunciado: "Jaime compró cierto número de ovejas por valor de 6000 dólares. Ha vendido de ellas, por valor de 1800 dólares, a 120 dólares cada oveja, perdiendo en cada una 30 dólares. ¿A cómo debe vender cada una de las restantes para ganar 600 dólares sobre lo pagado en la compra de todas (sacar 6600 dólares en la venta)?", alternativas: ["$180", "$192", "$172", "$1760", "$190"], respuestaCorrecta: 1 },
  { materia: "matematica", enunciado: "Halle la suma de todos los números que componen una matriz de 10x10 donde cada fila empieza en 1,2,3...10 y aumenta 1 por fila (fila i, columna j = i+j-1).", alternativas: ["788", "900", "1000", "2000", "2300"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "Calcule la cantidad de hexágonos formados por dos hexágonos simples en un panal de figuras yuxtapuestas.", alternativas: ["788", "900", "1000", "2000", "2300"], respuestaCorrecta: 2, necesitaImagen: true },
  { materia: "matematica", enunciado: "Cada día un empleado, para ir de su casa a su oficina, gasta S/. 2 y de regreso S/. 4. Si ya gastó S/. 78, ¿dónde se encuentra el empleado?", alternativas: ["En la oficina", "En la casa", "A mitad de camino a la casa", "A mitad de camino a la oficina", "No se puede determinar"], respuestaCorrecta: 1 },
  { materia: "matematica", enunciado: "Angie compra limones a 3 por 2 soles y los vende a 4 por 3 soles. ¿Cuántos limones debe vender para ganar 20 soles?", alternativas: ["120 limones", "150 limones", "180 limones", "360 limones", "240 limones"], respuestaCorrecta: 4 },
  { materia: "matematica", enunciado: "Calcule la suma de las cifras del resultado de (9999...997) x (9999...993), donde hay 101 cifras en cada factor.", alternativas: ["900", "905", "921", "807", "803"], respuestaCorrecta: 4 },
  { materia: "matematica", enunciado: "¿Cuántas bolitas se contarán en la figura 20, siguiendo un arreglo triangular (Fig.1=3, Fig.2=6, Fig.3=10)?", alternativas: ["921", "907", "903", "900", "905"], respuestaCorrecta: 2, necesitaImagen: true },
  { materia: "matematica", enunciado: "¿Cuántos palitos de fósforo se emplean en la figura 20, siguiendo un arreglo triangular de fósforos?", alternativas: ["32", "20", "41", "23", "31"], respuestaCorrecta: 2, necesitaImagen: true },
  { materia: "matematica", enunciado: "Si: √(1×2×3×4+1)=5, √(2×3×4×5+1)=11, √(3×4×5×6+1)=19. Hallar: √(10×11×12×13+1)", alternativas: ["131", "125", "144", "121", "110"], respuestaCorrecta: 0 },
  { materia: "matematica", enunciado: "¿Cuántas bolitas blancas habrá en la figura número 30, en un arreglo triangular con bolitas blancas y negras alternadas?", alternativas: ["332", "302", "310", "223", "312"], respuestaCorrecta: 4, necesitaImagen: true },
  { materia: "matematica", enunciado: "Siguiendo la secuencia mostrada en la figura (matrices cuadradas con flechas en su interior), halle el número total de flechas.", alternativas: ["332", "302", "310", "223", "312"], respuestaCorrecta: 1, necesitaImagen: true },
  { materia: "matematica", enunciado: "El número de lapiceros rojos y azules de Raquel están en una relación dada; si en total tiene 80 lapiceros, ¿cuántos lapiceros rojos tiene?", alternativas: ["50", "80", "110", "40", "85"], respuestaCorrecta: 3 },
  { materia: "matematica", enunciado: "Oscar tiene el doble de canicas que Moisés y el triple de canicas que tiene Julio. Si entre los tres amigos tienen 110 canicas, ¿cuántas canicas tiene Moisés?", alternativas: ["12", "14", "20", "17", "30"], respuestaCorrecta: 4 },
  { materia: "matematica", enunciado: "La suma de tres números impares consecutivos es 39. Hallar el mayor número impar.", alternativas: ["29", "18", "30", "24", "32"], respuestaCorrecta: 0 },
  { materia: "matematica", enunciado: "El largo de un rectángulo es el cuádruple del ancho. Si el largo tuviera 10 cm menos y el ancho se duplica, la figura se convertiría en un cuadrado. Hallar el área del rectángulo.", alternativas: ["4 cm²", "100 cm²", "40 cm²", "60 cm²", "45 cm²"], respuestaCorrecta: 1 },
  { materia: "matematica", enunciado: "Si subo los escalones de una escalera de 2 en 2, los pasos que daría serían el doble de los pasos que daría si subo de 3 en 3, disminuido en 5 pasos. ¿Cuántos escalones tiene la escalera?", alternativas: ["50", "80", "30", "40", "60"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "En un aula los alumnos están agrupados en bancas de 7 alumnos por banca. Si se les coloca en bancas de 4 alumnos por banca se necesitarían 3 bancas más. ¿Cuántos alumnos hay en el aula?", alternativas: ["50", "80", "30", "40", "60"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "Sofía, Katy, Ana y Luz reciben de sus enamorados cierta cantidad de flores. Sofía recibe el doble de flores que Ana, Luz recibió 4 flores menos que Ana, y Luz recibió el triple de flores que Katy. Si en total las cuatro recibieron 61 flores, ¿cuántas flores recibió Katy?", alternativas: ["28", "25", "39", "40", "30"], respuestaCorrecta: 4 },
  { materia: "matematica", enunciado: "Dos secretarias tienen que escribir 600 cartas cada una; la primera escribe 15 cartas por hora y la segunda 13 cartas por hora. Cuando la primera haya terminado su tarea, ¿cuántas cartas le faltarán escribir a la segunda?", alternativas: ["72", "84", "64", "60", "80"], respuestaCorrecta: 4 },
  { materia: "matematica", enunciado: "Treinta obreros en 20 días trabajando 8 horas diarias pueden hacer 600 m de zanja. ¿En cuántos días 24 obreros trabajando 10 horas diarias harán 450 m de zanja?", alternativas: ["20 días", "15 días", "16 días", "24 días", "32 días"], respuestaCorrecta: 1 },
  { materia: "matematica", enunciado: "Lenin decide repartir S/. 420 proporcionalmente a las edades de sus hijos (12 y 18 años), pero a la vez inversamente proporcional a lo que les falta a dichas edades para 20 años. ¿Cuánto recibió el mayor?", alternativas: ["S/. 320", "S/. 280", "S/. 368", "S/. 200", "S/. 360"], respuestaCorrecta: 4 },
  { materia: "matematica", enunciado: "Resuelve: (√3ˣ)³ = 9", alternativas: ["1/3", "3/4", "4/3", "2", "1/2"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "Halla \"x\" si: (2/5)^(3x-6) = 25/4", alternativas: ["3/4", "4/3", "1/2", "2", "1/2"], respuestaCorrecta: 1 },
  { materia: "matematica", enunciado: "De la figura mostrada, AB/2 = BC/3 = CD/5; AD = 30 cm. Calcular BC.", alternativas: ["4 cm", "5 cm", "6 cm", "9 cm", "12 cm"], respuestaCorrecta: 3 },
  { materia: "matematica", enunciado: "Hallar el valor de x, dadas dos rectas paralelas cruzadas por una secante con ángulos conjugados de (x²-11°) y 70°.", alternativas: ["4", "5", "6", "9", "12"], respuestaCorrecta: 3, necesitaImagen: true },
  { materia: "matematica", enunciado: "Sabiendo que tg(5x)·ctg(x+40°) = 1, hallar el valor de x.", alternativas: ["7°", "9°", "10°", "6°", "8°"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "Calcular: E = (4sen2° + 3cos88°)·csc2°", alternativas: ["14", "13", "11", "9", "7"], respuestaCorrecta: 4 },
  { materia: "comunicacion", enunciado: "Elemento de comunicación que se conforma por signos que se utilizan para elaborar y descifrar mensajes.", alternativas: ["Emisor", "Receptor", "Contexto", "Mensaje", "Código"], respuestaCorrecta: 4 },
  { materia: "cultura", enunciado: "Todos nacemos con la capacidad de adquirir el lenguaje. Por lo que este es:", alternativas: ["Ni aprendido, ni olvidado", "Universal e innato", "Inmutable", "Aprendido y olvidado", "Solo doblemente articulado"], respuestaCorrecta: 1 },
  { materia: "historia", enunciado: "De acuerdo con el avance de los estudios arqueológicos, en el Perú el más antiguo edificio ceremonial fue construido en el valle de:", alternativas: ["Zaña", "Supe", "Chicama", "Paramonga", "Cahuachi"], respuestaCorrecta: 1 },
  { materia: "historia", enunciado: "En la organización político-social del Imperio Incaico, el jefe del ayllu recibía el nombre de:", alternativas: ["Tucuyricuc", "Tutricut", "Hatunruna", "Curaca", "Apocuna"], respuestaCorrecta: 3 },
  { materia: "cultura", enunciado: "Es materia bruta:", alternativas: ["Conserva de pescado", "Atún", "Aceite", "Pez", "Pescado"], respuestaCorrecta: 3 },
  { materia: "cultura", enunciado: "Es materia prima:", alternativas: ["Árbol", "Hoja", "Madera", "Mueble", "Coca"], respuestaCorrecta: 2 },
  { materia: "geografia", enunciado: "El hombre ante el Universo es:", alternativas: ["Materia acabada y perfecta", "El único capaz de auscultarlo", "Algo muy insignificante", "El reflejo de la materia degenerada", "Sólo un accidente casual"], respuestaCorrecta: 2 },
  { materia: "geografia", enunciado: "Circunferencia más grande de la Tierra.", alternativas: ["Línea Internacional de la Fecha", "Línea ecuatorial", "Circunferencia polar", "Meridiano de Greenwich", "Trópico de Capricornio"], respuestaCorrecta: 1 },
  { materia: "comunicacion", enunciado: "Está constituido por la narración oral o escrita de hechos grandiosos, donde los personajes realizan hazañas heroicas y presentan poderes sobrehumanos. ¿A qué género literario hace referencia?", alternativas: ["Teatro", "Dramático", "Lírico", "Épico", "Narrativo"], respuestaCorrecta: 3 },
  { materia: "comunicacion", enunciado: "Según el tono expresivo, el fragmento poético \"Mataron a Federico / cuando la luz asomaba. / El pelotón de verdugos / no osó mirarle la cara...\" corresponde a la especie lírica denominada:", alternativas: ["Canción", "Madrigal", "Oda", "Himno", "Elegía"], respuestaCorrecta: 4 },
  { materia: "ciencias", enunciado: "Siendo homogénea la expresión x = w·A/(m·d), donde w=Trabajo y d=Densidad, calcular la fórmula dimensional de [x].", alternativas: ["M²L²T⁻¹", "M⁻¹L⁷T⁻²", "M²L²T⁻³", "M²L³T⁻⁴", "M²L⁻³T⁻⁵"], respuestaCorrecta: 1 },
  { materia: "ciencias", enunciado: "Determinar la fórmula dimensional de [f] en: f = (Calor·velocidad)/densidad", alternativas: ["MLT⁻¹", "L⁶T⁻³", "L³T⁻¹", "L⁻²T⁻¹", "L²T"], respuestaCorrecta: 1 },
  { materia: "ciencias", enunciado: "Es un ejemplo de mezcla heterogénea:", alternativas: ["Agua con sacarosa disuelta", "Agua con cloruro de sodio disuelto", "Agua potable", "Aire", "Sangre"], respuestaCorrecta: 4 },
  { materia: "ciencias", enunciado: "Marcar verdadero (V) o falso (F): I. Un átomo neutro tiene igual número de protones que de electrones. II. Las masas del protón y del electrón son iguales. III. Las partículas fundamentales del núcleo son protones y neutrones. IV. En el átomo solo se encuentran 3 partículas subatómicas.", alternativas: ["VVVV", "VVFF", "VFVF", "FFVV", "FFFF"], respuestaCorrecta: 2 },
  { materia: "ciencias", enunciado: "¿Qué unión NO representa un enlace iónico?", alternativas: ["K y O", "Na y Cl", "O y H", "Ca y O", "Li y F"], respuestaCorrecta: 2 },
  { materia: "ciencias", enunciado: "Un elemento tiene configuración electrónica terminada en 5p³. Hallar su número atómico.", alternativas: ["50", "51", "52", "53", "54"], respuestaCorrecta: 1 },
  { materia: "ciencias", enunciado: "¿Cuál bioelemento es considerado primario u organógeno?", alternativas: ["Oxígeno", "Níquel", "Calcio", "Magnesio", "Manganeso"], respuestaCorrecta: 0 },
  { materia: "ciencias", enunciado: "La información genética está almacenada en el:", alternativas: ["ADN", "ARNm", "ATP", "ARNr", "ARNt"], respuestaCorrecta: 0 },
  { materia: "ciencias", enunciado: "Polisacárido estructural presente en el exoesqueleto de los artrópodos:", alternativas: ["Celulosa", "Glicerol", "Glucosa", "Quitina", "Aminoácido"], respuestaCorrecta: 3 },
  { materia: "ciencias", enunciado: "La principal función de la membrana plasmática es:", alternativas: ["Protección", "Transporte de sustancias", "Transcripción", "Dar forma celular", "Síntesis de proteínas"], respuestaCorrecta: 1 },
  { materia: "razonamiento", enunciado: "Analogía — CAUDILLO : HUESTE", alternativas: ["Capitán : jugador", "Profesor : clase", "Director : orquesta", "Sacerdote : rito", "Entrenador : equipo"], respuestaCorrecta: 2 },
  { materia: "razonamiento", enunciado: "Analogía — ADUNAR : DUNA", alternativas: ["Agrupar : agrupación", "Amontonar : médano", "Esparcir : diversión", "Hacinar : cima", "Juntar : junta"], respuestaCorrecta: 1 },
  { materia: "razonamiento", enunciado: "Analogía — MADERA : ALACENA", alternativas: ["Plástico : balde", "Algodón : polo", "Madero : tronco", "Taza : porcelana", "Chompa : lana"], respuestaCorrecta: 1 },
  { materia: "razonamiento", enunciado: "Analogía — PLUVIÓMETRO : LLUVIA", alternativas: ["Temperatura : termómetro", "Anemómetro : viento", "Tiempo : cronómetro", "Odómetro : longitud", "Fotómetro : sonido"], respuestaCorrecta: 1 },
  { materia: "razonamiento", enunciado: "Analogía — PULSERA : MUÑECA", alternativas: ["Vidrio : ventana", "Caja : frente", "Corcho : botella", "Collar : cuello", "Lentes : ojos"], respuestaCorrecta: 3 },
  { materia: "razonamiento", enunciado: "Analogía — CANTANTE : ACTOR", alternativas: ["Orfebre : tallador", "Poeta : valle", "Músico : artista", "Abogado : contador", "Poeta : escultor"], respuestaCorrecta: 4 },
  { materia: "razonamiento", enunciado: "Analogía — ODRE : VINO", alternativas: ["Pelota : arco", "Balón : gas", "Agua : cántaro", "Gas : globo", "Botella : líquido"], respuestaCorrecta: 4 },
  { materia: "razonamiento", enunciado: "Analogía — DIFAMACIÓN : DELITO", alternativas: ["Alcohol : vicio", "Sentimiento : pasión", "Acción : movimiento", "Insolencia : conducta", "Comercio : venta"], respuestaCorrecta: 0 },
  { materia: "razonamiento", enunciado: "Analogía — PAJA : PAJAR", alternativas: ["Árbol : aserradero", "Cal : calera", "Uva : lagar", "Hierba : herbario", "Grano : granero"], respuestaCorrecta: 4 },
  { materia: "razonamiento", enunciado: "Analogía — ABEJORRO : ABEJA", alternativas: ["Oveja : ovino", "Caballo : poni", "Bacteria : virus", "Hormiga : rastrera", "Plata : rosal"], respuestaCorrecta: 1 },
  { materia: "razonamiento", enunciado: "Sinónimo de HIGIENE", alternativas: ["Limpio", "Aseo", "Blancura", "Adorno", "Transparencia"], respuestaCorrecta: 1 },
  { materia: "razonamiento", enunciado: "Sinónimo de OCASO", alternativas: ["Casualidad", "Oriente", "Oculto", "Puesta", "Bruma"], respuestaCorrecta: 3 },
  { materia: "razonamiento", enunciado: "Sinónimo de NOVEL", alternativas: ["Nuevo", "Joven", "Novato", "Reciente", "Insipiente"], respuestaCorrecta: 2 },
  { materia: "razonamiento", enunciado: "Sinónimo de PERJUDICIAL", alternativas: ["Dañar", "Perjuicio", "Consecuente", "Causal", "Nocivo"], respuestaCorrecta: 4 },
  { materia: "razonamiento", enunciado: "Sinónimo de DEVASTAR", alternativas: ["Desbastar", "Asolar", "Anegar", "Destrucción", "Desolación"], respuestaCorrecta: 1 },
  { materia: "razonamiento", enunciado: "Antónimo de AFECTO", alternativas: ["Antipatía", "Rechazo", "Defecto", "Cólera", "Odio"], respuestaCorrecta: 0 },
  { materia: "razonamiento", enunciado: "Antónimo de AHORRAR", alternativas: ["Emplear", "Derrochar", "Vender", "Usar", "Gastar"], respuestaCorrecta: 1 },
  { materia: "razonamiento", enunciado: "Antónimo de PÉSIMO", alternativas: ["Bueno", "Apto", "Óptimo", "Mejoría", "Acto"], respuestaCorrecta: 2 },
  { materia: "razonamiento", enunciado: "Antónimo de IRREFLEXIVO", alternativas: ["Intuitivo", "Acuático", "Pensado", "Imaginación", "Liberado"], respuestaCorrecta: 2 },
  { materia: "razonamiento", enunciado: "Antónimo de SIEMPRE", alternativas: ["Negativo", "Inconstancia", "Jamás", "Infrecuencia", "Irregularidad"], respuestaCorrecta: 2 },
  { materia: "razonamiento", enunciado: "Término excluido — ESTRENAR", alternativas: ["Debutar", "Inaugurar", "Iniciar", "Empezar", "Divulgar"], respuestaCorrecta: 4 },
  { materia: "razonamiento", enunciado: "Término excluido — ONOMATOPEYA", alternativas: ["Gritar", "Cacarear", "Otilar", "Balar", "Relinchar"], respuestaCorrecta: 0 },
  { materia: "razonamiento", enunciado: "Término excluido — VUELTA", alternativas: ["Regreso", "Retorno", "Venida", "Acaso", "Tornada"], respuestaCorrecta: 3 },
  { materia: "razonamiento", enunciado: "Término excluido — COLECTIVO", alternativas: ["Enjambre", "Manada", "Bandada", "Cardumen", "Establo"], respuestaCorrecta: 4 },
  { materia: "razonamiento", enunciado: "Término excluido — PELEA", alternativas: ["Riña", "Gresca", "Pugilato", "Reyerta", "Debate"], respuestaCorrecta: 4 },
  { materia: "matematica", enunciado: "Si con 6 tapitas de Kiko (gaseosa de medio litro) puedo canjear una llena, ¿cuántas gaseosas canjearía como máximo con 62 tapitas?", alternativas: ["15", "12", "14", "17", "22"], respuestaCorrecta: 1 },
  { materia: "matematica", enunciado: "¿Cuántas bolas hay en la figura 70, siguiendo un arreglo triangular?", alternativas: ["1259", "1265", "2556", "1274", "1248"], respuestaCorrecta: 2, necesitaImagen: true },
  { materia: "matematica", enunciado: "¿Cuántos cuadrados como mínimo se deben dibujar para que cada uno de 4 puntos quede en una sola región?", alternativas: ["4", "1", "2", "5", "3"], respuestaCorrecta: 2, necesitaImagen: true },
  { materia: "matematica", enunciado: "Luciana tendrá cinco veces la edad que hace 9 años tenía, dentro de 55 años. ¿Cuándo cumplirá 1 siglo de vida?", alternativas: ["Hace 75 años", "Dentro de 75 años", "Dentro de 71 años", "Ya los cumplió", "Hace 71 años"], respuestaCorrecta: 1 },
  { materia: "matematica", enunciado: "¿Cuántas líneas rectas se necesitan trazar como mínimo para unir todos los asteriscos de una cuadrícula, sin levantar el lápiz ni repasar una línea ya trazada?", alternativas: ["7", "5", "4", "6", "2"], respuestaCorrecta: 2, necesitaImagen: true },
  { materia: "matematica", enunciado: "¿Cuántas bolitas blancas y negras habrá en la figura 80, en una pirámide de círculos con colores alternados por piso?", alternativas: ["3332", "3362", "3321", "3323", "3363"], respuestaCorrecta: 2, necesitaImagen: true },
  { materia: "matematica", enunciado: "La hija de Luciano es la madre de mi hija. ¿Qué parentesco existe entre la madre de Luciano y la hija de la hija de Luciano?", alternativas: ["Es mi hijo", "Yo mismo", "Es mi cuñado", "Es mi bisnieta", "Es mi hermano"], respuestaCorrecta: 3 },
  { materia: "matematica", enunciado: "Angie compra limones a 3 por 5 soles y los vende a 7 por 9 soles. ¿Cuántos limones debe vender para ganar 40 soles?", alternativas: ["120 limones", "150 limones", "105 limones", "360 limones", "110 limones"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "Calcule la suma de las cifras del resultado de (9999...997) x (9999...993), donde hay 90 cifras en cada factor.", alternativas: ["800", "804", "921", "807", "803"], respuestaCorrecta: 1 },
  { materia: "matematica", enunciado: "¿Cuántas bolitas se contarán en la figura 50, siguiendo un arreglo piramidal?", alternativas: ["132", "120", "101", "123", "131"], respuestaCorrecta: 4, necesitaImagen: true },
  { materia: "matematica", enunciado: "¿Cuántos palitos de fósforo se emplean en la figura 80, en un arreglo triangular?", alternativas: ["262", "250", "240", "223", "241"], respuestaCorrecta: 4, necesitaImagen: true },
  { materia: "matematica", enunciado: "Si Javier es padre de Carlos, y Óscar es hijo de Jaime y a la vez hermano de Javier, ¿quién es el padre del tío del padre del hijo de Carlos?", alternativas: ["Jaime", "Carlos", "Javier", "Oscar", "Hermano de Carlos"], respuestaCorrecta: 0 },
  { materia: "matematica", enunciado: "¿Qué viene a ser de Cristiano Ronaldo la suegra de la esposa del único hermano del abuelo de la mamá de su hermana?", alternativas: ["Bisabuela", "Abuela", "Cuñada", "Tatarabuela", "Madre"], respuestaCorrecta: 3 },
  { materia: "matematica", enunciado: "A Cristiano Ronaldo le preguntaron por su edad, y respondió: \"Si al triple de la edad que tendré dentro de tres años le restan el triple de la edad que tuve hace tres años, obtendrán mi edad\". ¿Cuántos años faltan para que Cristiano cumpla 50 años?", alternativas: ["40", "36", "42", "39", "32"], respuestaCorrecta: 4 },
  { materia: "matematica", enunciado: "Si: √(1×2×3×4+1)=5, √(2×3×4×5+1)=11, √(3×4×5×6+1)=19. Hallar: √(15×16×17×18+1)", alternativas: ["271", "226", "321", "227", "224"], respuestaCorrecta: 0 },
  { materia: "matematica", enunciado: "¿Cuántas bolitas negras habrá en la figura 60, en una pirámide de círculos de 4 pisos?", alternativas: ["32", "62", "61", "23", "63"], respuestaCorrecta: 1, necesitaImagen: true },
  { materia: "matematica", enunciado: "Siguiendo la secuencia mostrada en la figura (matrices cuadradas con flechas crecientes), halle el número total de flechas.", alternativas: ["359", "399", "366", "374", "348"], respuestaCorrecta: 3, necesitaImagen: true },
  { materia: "matematica", enunciado: "La cabeza de un pescado mide 30 cm, la cola mide 5 cm menos que la cabeza y el cuerpo mide tanto como la cabeza y la cola juntas. ¿Cuál es la longitud en cm del pescado?", alternativas: ["50", "80", "110", "40", "85"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "El número de lapiceros rojos y azules de Raquel están en la relación de 3 a 5. Si en total tiene 80 lapiceros, ¿cuántos lapiceros rojos tiene?", alternativas: ["12", "14", "20", "17", "30"], respuestaCorrecta: 4 },
  { materia: "matematica", enunciado: "Oscar tiene el doble de canicas que Moisés y el triple de canicas que tiene Julio. Si entre los tres amigos tienen 110 canicas, ¿cuántas canicas tiene Moisés?", alternativas: ["29", "18", "30", "24", "32"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "Si el ayer del mañana del pasado mañana será viernes, ¿qué día de la semana será el mañana del pasado mañana del día que antecede al día que precede a hoy?", alternativas: ["Domingo", "Jueves", "Martes", "Miércoles", "Sábado"], respuestaCorrecta: 3 },
  { materia: "matematica", enunciado: "El largo de un rectángulo es el cuádruple del ancho. Si el largo tuviera 10 cm menos y el ancho se duplica, la figura se convertiría en un cuadrado. Hallar el área del rectángulo.", alternativas: ["4 cm²", "100 cm²", "40 cm²", "60 cm²", "45 cm²"], respuestaCorrecta: 1 },
  { materia: "matematica", enunciado: "Si subo los escalones de una escalera de 2 en 2, los pasos que daría serían el doble de los pasos que daría si subo de 3 en 3, disminuido en 5 pasos. ¿Cuántos escalones tiene la escalera?", alternativas: ["50", "80", "30", "40", "60"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "Sofía, Katy, Ana y Luz reciben de sus enamorados cierta cantidad de flores. Sofía recibe el doble de flores que Ana, Luz recibió 4 flores menos que Ana, y Katy recibió el triple de flores que Luz. Si en total las cuatro recibieron 61 flores, ¿cuántas flores recibió Katy?", alternativas: ["18", "21", "24", "15", "2"], respuestaCorrecta: 1 },
  { materia: "matematica", enunciado: "Sabiendo que el anteayer del ayer del mañana de hace 3 días fue sábado, ¿qué día será el mañana del ayer del pasado mañana del subsiguiente del posterior?", alternativas: ["Domingo", "Lunes", "Martes", "Jueves", "Domingo"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "La razón geométrica de dos números vale 7/4 y su razón aritmética es 45. Determina el menor de los números.", alternativas: ["52", "65", "60", "45", "50"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "Determinar la cuarta diferencial de los números que se presentan a continuación: 632, 541 y 214.", alternativas: ["108", "113", "123", "256", "305"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "Si: P(3x-2) = 12x-5. Hallar: M = P(x+1) - P(x-1)", alternativas: ["7", "-1", "8", "1", "10"], respuestaCorrecta: 2 },
  { materia: "matematica", enunciado: "Si el polinomio P(x) = (a+b-2)x³ + (a+c-3)x + (b+c-5) se anula para cualquier valor de \"x\". Calcular: \"a+b+c\"", alternativas: ["2", "3", "4", "5", "7"], respuestaCorrecta: 3 },
  { materia: "matematica", enunciado: "Calcular la suma de los ángulos interiores de un octágono regular.", alternativas: ["900°", "1080°", "108°", "1821°", "1008°"], respuestaCorrecta: 1 },
  { materia: "matematica", enunciado: "En el gráfico, calcular PS si: QM = RM, QP = 5 cm, RS = 9 cm.", alternativas: ["10 cm", "14 cm", "9 cm", "8 cm", "15 cm"], respuestaCorrecta: 1, necesitaImagen: true },
  { materia: "matematica", enunciado: "Reducir: E = cot(270°-x)/tg(-x) + csc(90°+x)/sec(-x)", alternativas: ["0", "2", "-2", "2tgx", "-2cotx"], respuestaCorrecta: 0 },
  { materia: "matematica", enunciado: "Calcular: E = sen150° + tg225° + cos300°", alternativas: ["0", "1", "2", "-1", "-2"], respuestaCorrecta: 2 },
  { materia: "cultura", enunciado: "El maullido de los gatos, las feromonas, danzas y otros sonidos o movimientos de los animales son ejemplos de:", alternativas: ["Comunicación Verbal", "Comunicación No Verbal", "Comunicación No Humana", "Comunicación Humana", "Canales de comunicación"], respuestaCorrecta: 2 },
  { materia: "comunicacion", enunciado: "¿Cuántos fonemas presenta la palabra \"Mariposas\"?", alternativas: ["8", "2", "5", "3", "9"], respuestaCorrecta: 4 },
  { materia: "historia", enunciado: "Es una característica propia del arcaico superior o de los horticultores sedentarios en la Historia del Perú:", alternativas: ["La presencia de la cunicultura", "Las técnicas de percusión y presión para el tallado de la piedra", "La construcción de los primeros centros ceremoniales", "La formación de las primeras aldeas", "La primera domesticación del perro"], respuestaCorrecta: 2 },
  { materia: "historia", enunciado: "Reemplazó como inca del Tahuantinsuyo a Túpac Huallpa, siendo coronado por Pizarro en Sacsawara, Cusco.", alternativas: ["Manco Inca", "Tito Cusi Yupanqui", "Toparpa", "Sairi Túpac", "Atahualpa"], respuestaCorrecta: 0 },
  { materia: "cultura", enunciado: "\"Si es cierto que todo bien económico tiene un valor de uso, pero todo lo que tiene valor de uso no es un bien económico\". Un buen ejemplo de esta afirmación es:", alternativas: ["Un cuadro de pintura", "Una bebida gaseosa", "Un automóvil", "El aire natural", "Un saco de arroz"], respuestaCorrecta: 3 },
  { materia: "cultura", enunciado: "Los bienes que sirven para producir otros bienes se llaman:", alternativas: ["Bienes libres", "Bienes económicos", "Bienes de capital", "Bienes de consumo", "Recursos naturales"], respuestaCorrecta: 2 },
  { materia: "geografia", enunciado: "¿Cuánto tarda la Tierra para completar una vuelta sobre su propio eje?", alternativas: ["24 horas", "12 horas", "Un mes", "365 días", "23 horas"], respuestaCorrecta: 0 },
  { materia: "geografia", enunciado: "En relación al relieve costero, relacione: I. Valles II. Desiertos III. Lomas, con: a. Sechura b. Atocongo c. Chicama. Indique la alternativa correcta.", alternativas: ["Ia, IIb, IIIc", "Ib, IIa, IIIc", "Ia, IIc, IIIb", "Ia, IIb, IIIa", "Ic, IIa, IIIb"], respuestaCorrecta: 4 },
  { materia: "geografia", enunciado: "Isla del Perú considerada como la más alta del litoral:", alternativas: ["Foca", "Lobos", "Pachacamac", "San Lorenzo", "Perica"], respuestaCorrecta: 3 },
  { materia: "geografia", enunciado: "El accidente geográfico que forma parte del escenario de la Reserva Nacional de Paracas se ubica en:", alternativas: ["La Libertad", "Ancash", "Piura", "Tumbes", "Ica"], respuestaCorrecta: 4 },
  { materia: "comunicacion", enunciado: "A partir del fragmento de \"El ingenioso hidalgo don Quijote de la Mancha\", marque la secuencia correcta (V o F): I. Se narra cómo se arma el hidalgo don Quijote. II. Se describe la figura del protagonista. III. El autor pretende ser muy exacto en los datos de la historia. IV. La narración corresponde a la primera parte de la obra.", alternativas: ["VVFF", "VFVF", "FFVV", "FVFV", "VVFV"], respuestaCorrecta: 3 },
  { materia: "comunicacion", enunciado: "El pícaro es:", alternativas: ["Una persona distraída", "Un animal silvestre", "Una persona astuta", "Una persona poco confiable", "Alguien que constantemente miente"], respuestaCorrecta: 2 },
  { materia: "comunicacion", enunciado: "En el Siglo de Oro se cultivaron tres tipos de novela: la pastoril, la caballeresca y la:", alternativas: ["Histórica", "Psicológica", "Científica", "Autobiográfica", "Picaresca"], respuestaCorrecta: 4 },
  { materia: "ciencias", enunciado: "Calcule la fórmula dimensional de \"a\" si: a = 4V²/(5R), donde V=Velocidad y R=Radio.", alternativas: ["LT⁻¹", "LT⁻²", "MLT⁻²", "ML³T⁻²", "M²L⁻¹T⁻²"], respuestaCorrecta: 3 },
  { materia: "ciencias", enunciado: "Una esfera se suelta desde 80 m de altura. Calcular el tiempo que demora en caer y la velocidad con la cual impacta en el piso (g=10 m/s²).", alternativas: ["12 s, 20 m/s", "16 s, 5 m/s", "10 s, 8 m/s", "4 s, 40 m/s", "3 s, 30 m/s"], respuestaCorrecta: 3 },
  { materia: "ciencias", enunciado: "Hallar el módulo de la resultante de dos vectores de magnitudes 5 y 3, formando un ángulo de 60° entre sí.", alternativas: ["3√3", "5", "7√2", "9", "10"], respuestaCorrecta: 2, necesitaImagen: true },
  { materia: "ciencias", enunciado: "Es un ejemplo de mezcla heterogénea:", alternativas: ["Agua con sacarosa disuelta", "Agua con cloruro de sodio disuelto", "Agua potable", "Aire", "Sangre"], respuestaCorrecta: 4 },
  { materia: "ciencias", enunciado: "Marcar verdadero (V) o falso (F): I. Un átomo neutro tiene igual número de protones que de electrones. II. Las masas del protón y del electrón son iguales. III. Las partículas fundamentales del núcleo son protones y neutrones. IV. En el átomo solo se encuentran 3 partículas subatómicas.", alternativas: ["VVVV", "VVFF", "VFVF", "FFVV", "FFFF"], respuestaCorrecta: 2 },
  { materia: "ciencias", enunciado: "El tritio (³₁H) tiene:", alternativas: ["2 protones y un neutrón", "1 neutrón y un protón", "3 protones", "1 protón y 2 neutrones", "3 neutrones"], respuestaCorrecta: 3 },
  { materia: "ciencias", enunciado: "Moneda energética de la célula, es la fuente de energía inmediata para el trabajo celular.", alternativas: ["UTP", "ARN", "GTP", "ATP", "ADP"], respuestaCorrecta: 3 },
  { materia: "ciencias", enunciado: "La importancia ecológica de las plantas es la de:", alternativas: ["Ser productoras de la cadena alimenticia", "Ser desintegradoras de materia orgánica", "Formar grandes colonias terrestres", "Formar grandes ecosistemas acuáticos", "Ser fuente de alimento a vertebrados"], respuestaCorrecta: 0 },
  { materia: "ciencias", enunciado: "¿Cuál de los siguientes organismos NO pertenece al Reino Animalia?", alternativas: ["Moluscos", "Bacterias", "Artrópodos", "Poríferos", "Anfibios"], respuestaCorrecta: 1 },
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

  let contadorValidadas = 0;
  let contadorPendientes = 0;
  for (const datos of PREGUNTAS_INICIALES) {
    // Las preguntas que dependen de una figura/imagen (patrones, secuencias,
    // gráficos geométricos) quedan como "borrador" hasta que se les adjunte
    // la imagen real desde el panel del docente — así no entran al sorteo
    // del examen sin su figura correspondiente.
    const estado = datos.necesitaImagen ? 'borrador' : 'validada';

    await Pregunta.findOneAndUpdate(
      { enunciado: datos.enunciado, autorId: docenteId },
      {
        materia: datos.materia,
        enunciado: datos.enunciado,
        alternativas: datos.alternativas,
        respuestaCorrecta: datos.respuestaCorrecta,
        autorId: docenteId,
        estado,
        validadaPor: datos.necesitaImagen ? null : docenteId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (datos.necesitaImagen) contadorPendientes += 1;
    else contadorValidadas += 1;
  }
  console.log(`✅ ${contadorValidadas} preguntas validadas y listas para el sorteo.`);
  console.log(`⏳ ${contadorPendientes} preguntas pendientes de imagen (quedaron como "borrador" — súbeles la foto desde el panel del docente/comité y luego valídalas).`);

  console.log('\n[Seed] Listo. Usa las credenciales de arriba para iniciar sesión, y ya deberían aparecer las 9 carreras en el formulario de registro.\n');

  await mongoose.disconnect();
  process.exit(0);
};

ejecutarSeed().catch((error) => {
  console.error('[Seed] Error al ejecutar el seed:', error.message);
  process.exit(1);
});

