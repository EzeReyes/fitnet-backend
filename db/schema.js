import { gql} from 'graphql-tag';

const typeDefs = gql`

    scalar Upload

    enum NivelRutina {
        PUESTA_A_PUNTO
        NIVEL_1
        NIVEL_2
        NIVEL_3
    }

    type Cliente {
        id: ID!
        nombre: String!
        apellido: String!
        edad: Int
        fechaNacimiento: String
        dni: String!
        peso: Float
        altura: Float
        email: String!
        contrasena: String!
        telefono: String
        apodo: String
        socialMedia: [Imagen!]!
        rutina: [Rutina]
        fechaHabilitacion: String
        pagos: [ID!]!
        gruposMuscularesRealizados: [GrupoMuscularRealizado]
        confirmado: Boolean
        avatar: String
        idioma: String
        tema: String
    }

    input ClienteInput {
        nombre: String!
        apellido: String!
        email: String!
        contrasena: String!
        dni: String!
    }


    type Imagen {
        id: ID!
        url: String!
        descripcion: String
        fecha: String
    }

    input ImagenInput {
        url: String!
        descripcion: String
        fecha: String
    }

    type Pago {
        id: ID!
        metodoPago: String!
        fecha: String!
        monto: Float!
        estado: String! # ej: "Pagado", "Pendiente", "Vencido"
        clienteId: ID!
    }

    input PagoInput {
        metodoPago: String!
        fecha: String!
        monto: Float!
        estado: String! # ej: "Pagado", "Pendiente", "Vencido"
        clienteId: ID!
    }

    type GrupoMuscularRealizado {
        id: ID!
        grupoMuscular: GrupoMuscular!
        fechaRealizacion: String!
        ejerciciosCompletados: [Ejercicio!]!
    }

    type Rutina {
        id: ID!
        nombre: String!
        grupoMuscular: GrupoMuscular!
        ejercicios: [Ejercicio!]
        nivel: NivelRutina!
        series: [Serie!]
    }

    input RutinaInput {
        nombre: String!
        grupoMuscular: ID!
        ejercicios: [ID!]
        nivel: NivelRutina!
        series: [SerieInput!]
    }

    type GrupoMuscular {
        id: ID!
        nombre: String!
        descripcion: String
        ejercicios: [Ejercicio!]
    }

    type Ejercicio {
        id: ID!
        nombre: String!
        descripcion: String!
        ejecucion: String!
        grupoMuscular: GrupoMuscular!
    }

    input EjercicioInput {
        nombre: String!
        descripcion: String!
        ejecucion: String!
        grupoMuscular: ID!
    }

    type Serie {
        id: ID!
        cantidadSeries: Int!
        repeticiones: Int!
        peso: Int!
        descanso: Int # en segundos
    }

    input SerieInput {
        cantidadSeries: Int!
        repeticiones: Int!
        peso: Int
        descanso: Int
    }

    type LoginResponse {
        mensaje: String!
        token: String!
    }

    type ConfirmResponse {
        success: Boolean
        message: String
    }

    type Sesion {
        autenticado: Boolean!
        usuario: Cliente
    }

    type Query {
        obtenerClientes: [Cliente]
        obtenerCliente(email: String!, contrasena: String!): String
        obtenerClientePorId(id: ID!): Cliente
        obtenerRutinas: [Rutina]
        obtenerRutina(id: ID!): Rutina
        obtenerRutinaCliente(clienteId: ID!): [Rutina]
        obtenerEjercicios(limit: Int, offset: Int): [Ejercicio]
        obtenerTodosLosEjercicios: [Ejercicio]
        obtenerGruposMusculares: [GrupoMuscular]
        obtenerGrupoMuscular(id: ID!): GrupoMuscular
        obtenerEjercicio(id: ID!): Ejercicio
        verificarSesion: Sesion!       
        mostrarPagos: [Pago!]!
        mostrarPago(id: ID!): Pago! 
    }

    type Mutation {
        crearRutina(input: RutinaInput): Rutina
        eliminarRutina(id: ID!): String
        modificarRutina(id: ID!, input: RutinaInput): String
        editarEjercicioEnRutina(id: ID!, ejercicio: ID!, nuevoEjercicio: ID!): Rutina
        asignarRutina(idRutina: ID!, idCliente: ID!): String
        eliminarRutinaAsignadaACliente(idRutina: ID!, idCliente: ID!): String
        crearSerie(input: SerieInput): Serie
        editarSerie(id: ID!, serieId:ID!, input: SerieInput): Serie
        crearEjercicio(input: EjercicioInput): Ejercicio
        editarEjercicio(id: ID!, nombre: String!, descripcion: String!, ejecucion: String!): Ejercicio 
        crearGrupoMuscular(nombre: String!, descripcion: String, ejercicios: [ID!]): GrupoMuscular
        crearGrupoMuscularRealizado(grupoMuscular: ID!, fechaRealizacion: String!, ejerciciosCompletados: [ID!]!): GrupoMuscularRealizado
        crearCliente(input: ClienteInput): ID
        editarCliente(clienteId: ID!, nombre: String!, apellido: String!, telefono: String): String
        confirmarCuenta(token: String): ConfirmResponse
        login(email: String!, contrasena: String!): LoginResponse
        logout: String
        reset(email: String!): String
        cambioPass(token: String, contrasena: String): ConfirmResponse
        uploadAvatar(file: Upload!, user: ID!): Cliente
        modificarAjuste(clienteId: ID, idioma: String, tema: String): String
        crearPago(input: PagoInput!): Pago
    }
`
export default typeDefs;