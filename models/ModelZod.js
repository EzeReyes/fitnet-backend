import { z } from "zod";

// ---------------------------------------------------
// Imagen
// ---------------------------------------------------
export const ImagenSchemaZ = z.object({
  url: z.string(),
  descripcion: z.string().optional(),
  fecha: z.date().default(() => new Date()),
});

// ---------------------------------------------------
// Serie dentro de un ejercicio
// ---------------------------------------------------
export const SerieSchemaZ = z.object({
  cantidadSeries: z.number(),
  repeticiones: z.number(),
  peso: z.number().optional(),
  descanso: z.number().optional(),
});

// ---------------------------------------------------
// Ejercicio
// ---------------------------------------------------
export const EjercicioSchemaZ = z.object({
  nombre: z.string(),
  descripcion: z.string().optional(),
  ejecucion: z.string().optional(),
  grupoMuscular: z.string(), // ObjectId como string
});

// ---------------------------------------------------
// Grupo Muscular
// ---------------------------------------------------
export const GrupoMuscularSchemaZ = z.object({
  nombre: z.string(),
  descripcion: z.string().optional(),
  ejercicios: z.array(z.string()).default([]), // IDs
});

// ---------------------------------------------------
// Rutina
// ---------------------------------------------------
export const RutinaSchemaZ = z.object({
  nivel: z
    .enum(["PUESTA_A_PUNTO", "NIVEL_1", "NIVEL_2", "NIVEL_3"])
    .default("PUESTA_A_PUNTO"),
  ejercicios: z.array(z.string()).default([]),
  nombre: z.string(),
  series: z.array(SerieSchemaZ).default([]),
  grupoMuscular: z.string().optional(),
});

// ---------------------------------------------------
// Registro de entrenamiento realizado
// ---------------------------------------------------
export const GrupoMuscularRealizadoSchemaZ = z.object({
  grupoMuscular: z.string().optional(),
  fechaRealizacion: z.date().default(() => new Date()),
  ejerciciosCompletados: z.array(z.string()).default([]),
});

// ---------------------------------------------------
// Pago mensual
// ---------------------------------------------------
export const PagoMensualidadSchemaZ = z.object({
  clienteId: z.string(),
  fechaPago: z.date(),
  monto: z.number().optional(),
  metodo: z.string().optional(),
  estado: z.string().optional(),
});

// ---------------------------------------------------
// Cliente
// ---------------------------------------------------
export const ClienteSchemaZ = z.object({
  nombre: z.string(),
  apellido: z.string(),
  edad: z.number().optional(),
  fechaNacimiento: z.date().optional(),
  dni: z.string(),
  peso: z.number().optional(),
  altura: z.number().optional(),
  email: z.string().email(),
  contrasena: z.string(),
  telefono: z.string().optional(),
  apodo: z.string().optional(),
  socialMedia: z.array(ImagenSchemaZ).default([]),
  rutina: z.array(z.string()).default([]),
  fechaHabilitacion: z.date().optional(),
  pagos: z.array(z.string()).default([]),
  gruposMuscularesRealizados: z
    .array(GrupoMuscularRealizadoSchemaZ)
    .default([]),
  confirmado: z.boolean().default(false),
  avatar: z.string().optional(),
  idioma: z.string().default("es"),
  tema: z.string().default("oscuro"),
});
