import mongoose  from 'mongoose';
const { Schema, model } = mongoose;

// Imagen para social media
const ImagenSchema = new Schema({
  url: { type: String, required: true },
  descripcion: { type: String },
  fecha: {type: Date, default: Date.now()}
});


// Serie dentro de un ejercicio
const SerieSchema = new Schema({
  cantidadSeries: { type: Number, required: true},
  repeticiones: { type: Number, required: true },
  peso: { type: Number },
  descanso: { type: Number }, // en segundos
});

// Ejercicio base
const EjercicioSchema = new Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
  ejecucion: { type: String },
  grupoMuscular: { type: Schema.Types.ObjectId, ref: 'GrupoMuscular', required: true}
});

// Grupo muscular base
const GrupoMuscularSchema = new Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
  ejercicios: [{ type: Schema.Types.ObjectId, ref: 'Ejercicio' }]
});

// Rutina completa
const RutinaSchema = new Schema({
  nivel: {
    type: String,
    enum: ['PUESTA_A_PUNTO', 'NIVEL_1', 'NIVEL_2', 'NIVEL_3'],
    default: 'PUESTA_A_PUNTO'
  },
  ejercicios: [{ type: Schema.Types.ObjectId, ref: 'Ejercicio' }],
  nombre: { type: String, required: true },
  series: [SerieSchema],
  grupoMuscular: { type: Schema.Types.ObjectId, ref: 'GrupoMuscular' },
});

// Registro de entrenamiento realizado
const GrupoMuscularRealizadoSchema = new Schema({
  grupoMuscular: { type: Schema.Types.ObjectId, ref: 'GrupoMuscular' },
  fechaRealizacion: { type: Date, default: Date.now() },
  ejerciciosCompletados: [{ type: Schema.Types.ObjectId, ref: 'Ejercicio' }]
});

// Pago mensual
const PagoMensualidadSchema = new Schema({
  clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
  fechaPago: { type: Date, required: true },
  monto: { type: Number },
  metodo: { type: String },
  estado: { type: String } // Ej: "Pagado", "Pendiente", "Vencido"
});

// Cliente principal
const ClienteSchema = new Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  edad: { type: Number },
  fechaNacimiento: { type: Date },
  dni: { type: String, required: true, unique: true },
  peso: { type: Number },
  altura: { type: Number },
  email: { type: String, required: true, unique: true },
  contrasena: { type: String, required: true },
  telefono: { type: String },
  apodo: { type: String },
  socialMedia: [ImagenSchema],
  rutina: [{ type: Schema.Types.ObjectId, ref: 'Rutina' }],
  fechaHabilitacion: { type: Date },
  pagos: [{ type: Schema.Types.ObjectId, ref: 'PagoMensualidad' }],
  gruposMuscularesRealizados: [GrupoMuscularRealizadoSchema],
  confirmado: {
        type: Boolean,
        default: false
  },
  avatar: {
    type: String,
  },
  idioma: { type: String, default: 'es'},
  tema: { type: String, default: 'oscuro'}
});

export const Cliente = model('Cliente', ClienteSchema);
export const Rutina = model('Rutina', RutinaSchema);
export const GrupoMuscular = model('GrupoMuscular', GrupoMuscularSchema);
export const Ejercicio = model('Ejercicio', EjercicioSchema);
export const PagoMensualidad = model('PagoMensualidad', PagoMensualidadSchema);
export const Serie = model('Serie', SerieSchema);
export const GrupoMRealizado = model('GrupoMuscularRealizado', GrupoMuscularRealizadoSchema);