import { Cliente, Serie, Rutina, Ejercicio, GrupoMuscular, Pago, GrupoMRealizado  } from '../models/Model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { send } from '@emailjs/nodejs';
import fs from "fs";
import path from "path";


const resolvers = {
    Query: {
        obtenerClientes: async () => {
            const clientes = await Cliente.find({})
                .populate('rutina')
                .populate('pagos');
            return clientes;
        },
        obtenerCliente: async (_, {email, contrasena}) => {
        try {
        // Obtener el cliente por email
            const existeCliente = await Cliente.findOne({email});
            if(!existeCliente) {
                throw new Error('Ese cliente no existe!')
            }
            const contrasenaCorrecta = await bcrypt.compare(contrasena, existeCliente.contrasena);
            if(!contrasenaCorrecta) {
                throw new Error('Credenciales inválidas!');
            }
            return (`Bienvenido ${existeCliente.nombre} `)
        } catch(error) {
            throw new Error(`${error}`);
        }
        },
        obtenerClientePorId: async (_, {id}) => {
            const cliente = await Cliente.findById(id)
                .populate('rutina')
                .populate('pagos');
            if(!cliente) {
                throw new Error('Ese cliente no existe!');
            }
            return cliente;
        },
        obtenerTodosLosEjercicios: async () => {
            const ejercicios = await Ejercicio.find()
                .populate('grupoMuscular');
            return ejercicios;
        },
        obtenerEjercicios: async (_, {limit, offset}) => {
            const ejercicios = await Ejercicio.find()
                .skip(offset)
                .limit(limit)
                .populate('grupoMuscular');
            return ejercicios;
        },
        obtenerGruposMusculares: async () => {
            const gruposMusculares = await GrupoMuscular.find()
                .populate('ejercicios');
            return gruposMusculares;
        },
        obtenerGrupoMuscular: async (_, {id}) => {
            const grupoMuscular = await GrupoMuscular.findById(id);
            if(!grupoMuscular) {
                throw new Error('Ese Grupo Muscular no existe!');
            }
            return grupoMuscular;
        },
        obtenerEjercicio: async (_, {id}) => {
            const ejercicio = await Ejercicio.findById(id);
            if(!ejercicio) {
                throw new Error('Ese ejercicio no existe en la base de datos')
            }
            return ejercicio;
        },
        verificarSesion: async (_, __, { req }) => {
            const cookies = cookie.parse(req.headers.cookie || '');
            const token = cookies.authToken;

            if (!token) {
                return { autenticado: false, usuario: null };
            }

            try {
                const datos = await jwt.verify(token, process.env.JWT_SECRET);
                // Buscar el cliente por email

                const clienteEncontrado = await Cliente.findOne({email: datos.email});
                console.log(clienteEncontrado)
                return { autenticado: true, usuario: clienteEncontrado };

            } catch(error) {
                console.log(error)
                return { autenticado: false, usuario: null };
            }
        },
        obtenerRutinaCliente: async (_, { clienteId }) => {
        const rutinas = await Rutina.find({ clienteId })
            .populate("ejercicios")       // 👈 trae los documentos de Ejercicio
            .populate("grupoMuscular");   // 👈 trae el documento de GrupoMuscular
        return rutinas;
        },
        obtenerRutina: async (_, {id}) => {
            const rutina = await Rutina.findById(id)
                .populate("ejercicios")       // 👈 trae los documentos de Ejercicio
                .populate("grupoMuscular");   // 👈 trae el documento de GrupoMuscular
            if(!rutina) {
                throw new Error('Esa rutina no existe');
            }
            return rutina;
        },
        obtenerRutinas: async () => {
            const rutinas = await Rutina.find()
                .populate("ejercicios")       // 👈 trae los documentos de Ejercicio
                .populate("grupoMuscular");   // 👈 trae el documento de GrupoMuscular
            if(!rutinas) {
                throw new Error('No se encontraron rutinas');
            }
            return rutinas;
        },
        obtenerPagos: async () => {
        try{    
            const pagos = await Pago.find()
                .populate("clienteId");
            if(!pagos) {
                throw new Error('No hay pagos realizados');
            }
            return pagos;
        } catch(error) {
            throw new Error(error)
        }
        },
    },
    Mutation: {
        crearRutina: async (_, { input }) => {
            try {
            const { nombre, grupoMuscular, nivel, ejercicios, series } = input;

            if (!nombre) throw new Error('Deberá asignar un nombre a la rutina');
            const nombreExistente = await Rutina.findOne({ nombre });
            if (nombreExistente) throw new Error('Ya existe una rutina con ese nombre');
            if (!nivel) throw new Error('Deberá asignar un nivel');

            if(!ejercicios || !series) throw new Error('Debe especificar ejercicios y series');

            // Validar que el grupo muscular principal exista
            const grupo = await GrupoMuscular.findById(grupoMuscular);
            if (!grupo) throw new Error(`Grupo muscular con ID ${grupoMuscular} no encontrado`);


            // Verificar que todos los ejercicios pertenezcan al grupo muscular
            const ejerciciosInvalidos = ejercicios.filter(ejercicio => {
            const ejercicioId = ejercicio._id?.toString() || ejercicio.toString();
            return !grupo.ejercicios.some(ej => ej.toString() === ejercicioId);
            });

            if (ejerciciosInvalidos.length > 0) {
            const ids = ejerciciosInvalidos.map(e => e._id?.toString() || e.toString()).join(', ');
            throw new Error(`Los siguientes ejercicios no pertenecen al grupo muscular: ${ids}`);
            }


            const nuevaRutina = new Rutina({
                nombre,
                grupoMuscular,
                nivel,
                ejercicios,
                series
            });

            await nuevaRutina.save();

            return nuevaRutina;
        } catch(error) {
            throw new Error(`${error.message}`);
        }

        },
        eliminarRutina: async (_, {id}) => {
            const rutinaAEliminar = await Rutina.findById(id);
            if(!rutinaAEliminar) {
                throw new Error('Esa rutina no existe');
            }
            await Rutina.findByIdAndDelete(id);
            return 'Rutina eliminada con éxito';
        },
        modificarRutina: async (_, { id, input }) => {
            try {
                const { nombre, nivel, grupoMuscular, ejercicios, series } = input;

                const existeRutina = await Rutina.findById(id);
                if (!existeRutina) throw new Error('La rutina no existe');
                if (!nombre) throw new Error('Deberá asignar un nombre a la rutina');
                if (!nivel) throw new Error('Deberá asignar un nivel');
                if (!ejercicios || !series) throw new Error('Debe especificar ejercicios y series');

                // Validar grupo muscular
                const grupo = await GrupoMuscular.findById(grupoMuscular);
                if (!grupo) throw new Error(`Grupo muscular con ID ${grupoMuscular} no encontrado`);

                // Validar ejercicios
                const ejerciciosInvalidos = ejercicios.filter(ejercicioId =>
                !grupo.ejercicios.some(ej => ej.toString() === ejercicioId.toString())
                );
                if (ejerciciosInvalidos.length > 0) {
                throw new Error(`Los siguientes ejercicios no pertenecen al grupo muscular: ${ejerciciosInvalidos.join(', ')}`);
                }

                // Asignar valores
                existeRutina.nombre = nombre;
                existeRutina.nivel = nivel;
                existeRutina.ejercicios = ejercicios.map(ej => ej.toString()); // array de strings
                existeRutina.grupoMuscular = grupoMuscular; // ObjectId o string según tu modelo
                existeRutina.series = series;

                await existeRutina.save();
                return "Rutina modificada";
            } catch (error) {
                throw new Error(error.message);
            }
        },
        editarEjercicioEnRutina: async (_, { id, ejercicio, nuevoEjercicio }) => {
        const rutina = await Rutina.findById(id);
        if (!rutina) {
            throw new Error('La rutina no existe');
        }

        // Verificamos si el ejercicio está en la rutina
        const existeEjercicio = rutina.ejercicios.some(ejerciciosEnRutina => ejerciciosEnRutina.toString() === ejercicio);
        if (!existeEjercicio) {
            throw new Error('Ese ejercicio no existe en la rutina');
        }

        // Verificar que el ejercicio existe
        const ejercicioAModificarEsReal = await Ejercicio.findById(nuevoEjercicio);
        if(!ejercicioAModificarEsReal) {
            throw new Error('Ese ejercicio no existe');
        }
        
        // Evitar duplicados
        const ejercicioDuplicado = await rutina.ejercicios.some(ejercicioEnRutina => ejercicioEnRutina.toString() === nuevoEjercicio);
        if(ejercicioDuplicado) {
            throw new Error ('Ese ejercicio ya se encuentra en la rutina')
        }

        // Verificamos que el ejercicio corresponde a GrupoMuscular
        const esDelGrupoMuscular = await GrupoMuscular.findById(nuevoEjercicio.grupoMuscular);
        if(!esDelGrupoMuscular) {
            throw new Error('Ejercicio no pertenece al grupo muscular');
        }

        // Aquí iría la lógica para editar el ejercicio, por ejemplo:
        rutina.ejercicios = rutina.ejercicios.map(ejercicioEnRutina => ejercicioEnRutina.toString() === ejercicio ? nuevoEjercicio : ejercicioEnRutina);
        await rutina.save();

        return rutina;
        },
        asignarRutina: async (_, {idRutina, idCliente}) => {
        try {
        //Verificar si existe la rutina 
            const existeRutina = await Rutina.findById(idRutina);
            if(!existeRutina) throw new Error('La rutina no existe');
            
        // Verificar si el cliente existe
            const existeCliente = await Cliente.findById(idCliente);
            if(!existeCliente) throw new Error('Ese cliente no existe');


        // Verificar que esa rutina no exista entre las rutinas del cliente
            const clienteYaPoseeRutina = await existeCliente.rutina.some(rutinadeCliente => rutinadeCliente.toString() === idRutina);
            if(clienteYaPoseeRutina) throw new Error('Esa rutina ya se encuentra asignada al cliente');
            
            existeCliente.rutina.push(idRutina);
            await existeCliente.save();

            return `Rutina asignada a ${existeCliente.nombre} ${existeCliente.apellido} con éxito`
        } catch (error) {
            throw new Error(`Error: ${error.message}`);
        }
        },
        eliminarRutinaAsignadaACliente: async (_, {idRutina, idCliente}) => {
        try {
        //Verificar si existe la rutina 
            const existeRutina = await Rutina.findById(idRutina);
            if(!existeRutina) throw new Error('La rutina no existe');
            
        // Verificar si el cliente existe
            const existeCliente = await Cliente.findById(idCliente);
            if(!existeCliente) throw new Error('Ese cliente no existe');

        // Verificar que esa rutina no exista entre las rutinas del cliente
            const rutinaAsignadaACliente = await existeCliente.rutina.some(rutinadeCliente => rutinadeCliente.toString() === idRutina);
            if(!rutinaAsignadaACliente) throw new Error('Esa rutina no se encuentra asignada al cliente');            
            
        // Eliminar rutina del Cliente
        existeCliente.rutina.pull(idRutina);

        await existeCliente.save();

            return 'Rutina Eliminada con éxito!'
        } catch (error) {
            throw new Error(`Error: ${error.message}`);
        }
        },      
        crearSerie: async (_, {input}) => {
            const nuevaSerie = await new Serie(input);
            nuevaSerie.save();
            return nuevaSerie;
        },
        editarSerie: async (_, { id, serieId, input }) => {
            const ejercicioEnRutina = await ER.findById(id);
            if (!ejercicioEnRutina) {
                throw new Error('Ejercicio en rutina no encontrado');
            }

            const { cantidadSeries, repeticiones, peso, descanso } = input;

            if (!cantidadSeries || !repeticiones) {
                throw new Error('Faltan campos obligatorios');
            }

            const existeSerie = ejercicioEnRutina.series.id(serieId); // ← forma correcta de buscar subdocumento por _id

            if (!existeSerie) {
                throw new Error('La serie no se encuentra creada');
            }

            // Actualizar campos
            existeSerie.cantidadSeries = cantidadSeries;
            existeSerie.repeticiones = repeticiones;
            existeSerie.peso = peso;
            existeSerie.descanso = descanso;

            await ejercicioEnRutina.save(); // ← guardar el documento padre

            return existeSerie;
        },
        crearEjercicio: async (_, {input}) => {
            const { nombre, grupoMuscular } = input;
            if(!nombre) {
                throw new Error('Debe ingresar un nombre');
            }
            const ejercicioEncontrado = await Ejercicio.findOne({nombre});
            if(ejercicioEncontrado) {
                throw new Error('Ese ejercicio ya existe');
            }
            const grupoMuscularEncontrado = await GrupoMuscular.findById(grupoMuscular);
            if(!grupoMuscularEncontrado) {
                throw new Error('Ese grupo muscular no existe')
            }
            const nuevoEjercicio = await new Ejercicio(input);
            await nuevoEjercicio.save();
            grupoMuscularEncontrado.ejercicios.push(nuevoEjercicio._id);
            await grupoMuscularEncontrado.save();
            return nuevoEjercicio;
        },
        editarEjercicio: async(_, {id, nombre, descripcion, ejecucion}) => {
            const ejercicioExiste = await Ejercicio.findById(id);
            if(!ejercicioExiste) {
                throw new Error('Ese ejercicio no existe');
            }
            if(!nombre || !descripcion || !ejecucion) {
                throw new Error('Faltan asignar datos al ejercicio');
            }


            ejercicioExiste.nombre = nombre;
            ejercicioExiste.descripcion = descripcion;
            ejercicioExiste.ejecucion = ejecucion;
            await ejercicioExiste.save();
            return ejercicioExiste;
        },
        crearGrupoMuscular: async (_, { nombre, descripcion, ejercicios }) => {
        if (!nombre) throw new Error('El nombre es obligatorio');

        const grupoMuscularExiste = await GrupoMuscular.findOne({ nombre });
        if (grupoMuscularExiste) {
            throw new Error('Ese grupo muscular ya existe');
        }

        // Validar que los ejercicios existan
        const ejerciciosValidos = await Ejercicio.find({ _id: { $in: ejercicios } });

        if (ejerciciosValidos.length !== ejercicios.length) {
            throw new Error('Uno o más ejercicios no existen o los IDs son inválidos');
        }

        const nuevoGP = new GrupoMuscular({
            nombre,
            descripcion,
            ejercicios: ejerciciosValidos.map(e => e._id)
        });

        await nuevoGP.save();
        return nuevoGP;
        },
        crearGrupoMuscularRealizado: async (_, {grupoMuscular, fechaRealizacion, ejerciciosCompletados }) => {
            if(!grupoMuscular || !fechaRealizacion || !ejerciciosCompletados) {
                throw new Error('Faltan Datos')
            };
            const grupoMRealizado = await new GrupoMRealizado(grupoMuscular, fechaRealizacion, ejerciciosCompletados);
            grupoMRealizado.save();
            return grupoMRealizado;
        },
        crearCliente: async (_, {input}) => {
            const { email, contrasena } = input;

            if (!email || !contrasena) {
                throw new Error('Email y contraseña son obligatorios');
            }

            // Verificar si el cliente ya existe
            const clienteExiste = await Cliente.findOne({ email });
            if (clienteExiste) {
                throw new Error('Ese cliente ya existe');
            }

            // Hashear la contraseña
            const salt = await bcrypt.genSalt(10);
            const contraHash = await bcrypt.hash(contrasena, salt);
            input.contrasena = contraHash;

            // Crear y guardar el nuevo cliente
            const nuevoCliente = await new Cliente(input);
            await nuevoCliente.save();

            // return 'Tu cuenta ha sido creada con éxito';

            // 1. Obtener el ID generado
            const clienteId = nuevoCliente._id;

// 2. Generar token de confirmación
            const token = jwt.sign({ id: clienteId }, process.env.JWT_CONFIRM_SECRET, { expiresIn: '1d' });

// 3. Construir URL de confirmación
            const urlConfirmacion = `${process.env.FRONTEND_URL || "http://localhost:5173"}/confirmar/${token}`;
// 4. Enviar email
            await send(
                process.env.SERVICE_ID,
                process.env.TEMPLATE_ID,
                {
                    name: nuevoCliente.nombre,
                    email: nuevoCliente.email,
                    message: `Hola ${nuevoCliente.nombre}, confirmá tu cuenta haciendo clic en el siguiente enlace: ${urlConfirmacion}`,
                },
                {
                publicKey: process.env.PUBLIC_KEY,
                privateKey: process.env.PRIVATE_KEY
                }
            );

// 5. Retornar el ID
            return clienteId;
        },
        editarCliente: async (_, {clienteId, nombre, apellido, telefono}) => {
        try{
            const existeCliente = await Cliente.findById(clienteId);
            if(!existeCliente) {
                throw new Error('Ese Cliente no existe');
            } 

            if(!nombre || ! apellido ) {
                throw new Error('Los datos son obligatorios!');
            }

            existeCliente.nombre = nombre;
            existeCliente.apellido = apellido;
            existeCliente.telefono = telefono;
            await existeCliente.save();

            const urlInicio = `${process.env.FRONTEND_URL || "http://localhost:5173"}/login`

            await send(
                process.env.SERVICE_ID,
                process.env.TEMPLATE_ID,
                {
                    subject: 'Modificación de datos Personales',
                    name: existeCliente.nombre,
                    email: existeCliente.email,
                    message: `Hola ${existeCliente.nombre}, se han realizado cambios. En tu cuenta de manera exitosa. Inicia sesión en el siguiente enlace: ${urlInicio}`,
                },
                {
                publicKey: process.env.PUBLIC_KEY,
                privateKey: process.env.PRIVATE_KEY
                }
            );


            return ('Se modificaron tus datos exitosamente!. Inicia sesión!!');

        } catch(error) {
            throw new Error(error)
        }    

        },
        confirmarCuenta: async (_, { token }) => {
        try {
            const { id } = jwt.verify(token, process.env.JWT_CONFIRM_SECRET);
            const cliente = await Cliente.findById(id);

            if (!cliente) throw new Error('Usuario no encontrado');
            if (cliente.confirmado) return { success: false, message: 'Su cuenta se encuentra confirmada' };

            cliente.confirmado = true;
            await cliente.save();

            return { success: true, message: 'Cuenta confirmada correctamente' };
        } catch (error) {
            return { success: false, message: 'Token inválido o expirado' };
        }
        },
        login: async (_, { email, contrasena }, { res }) => {
        if (!email || !contrasena) {
            throw new Error('Todos los campos son obligatorios');
        }

        const cliente = await Cliente.findOne({ email: email.toLowerCase() });
        if (!cliente) {
            throw new Error('Credenciales incorrectas');
        }

        const passwordValida = await bcrypt.compare(contrasena, cliente.contrasena);
        if (!passwordValida) {
            throw new Error('Credenciales incorrectas');
        }

        const token = jwt.sign(
            { id: cliente._id, email: cliente.email },
            process.env.JWT_SECRET,
            { expiresIn: '20m' }
        );

        res.setHeader('Set-Cookie', cookie.serialize('authToken', token, {
            httpOnly: true,
            // secure: process.env.NODE_ENV === 'production',
            secure: true,
            maxAge: 1800, // expira inmediatamente
            sameSite: 'None',
            // sameSite: 'Lax',
            path: '/',
            domain: 'fitnet-backend.onrender.com'
        }));

        return {
            mensaje: 'Sesión iniciada',
            token
        };
        },
        logout: (_, __, { res }) => {
        res.setHeader('Set-Cookie', cookie.serialize('authToken', '', {
            httpOnly: true,
            // secure: process.env.NODE_ENV === 'production',
            secure: true,
            maxAge: 0, // expira inmediatamente
            sameSite: 'None',
            // sameSite: 'Lax',
            path: '/',
            domain: 'fitnet-backend.onrender.com'
        }));

        return 'Sesión cerrada';
        },
        reset: async (_, { email }) => {
// Buscar por su email la cuenta

            const cliente = await Cliente.findOne({email});
            if(!cliente) {
                throw new Error ('Esa cuenta no existe')
            }
            
            cliente.confirmado = false;
            await cliente.save();
            const clienteId = cliente._id

            const token = jwt.sign({ id: clienteId }, process.env.JWT_CONFIRM_SECRET, { expiresIn: '1d' });

            const urlConfirmacion = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset/${token}`;
            await send(
                process.env.SERVICE_ID,
                process.env.TEMPLATE_ID,
                {
                    name: cliente.nombre,
                    email: cliente.email,
                    message: `Hola ${cliente.nombre}, para modificar tu contraseña, hace clic en el siguiente enlace: ${urlConfirmacion}`,
                },
                {
                publicKey: process.env.PUBLIC_KEY,
                privateKey: process.env.PRIVATE_KEY
                }
            );        
            return ('Verifica tu email, allí encontrarás un link de redirección para modificar tu contraseña')
        },
        cambioPass: async (_, {token, contrasena}) => {
            const { id } = jwt.verify(token, process.env.JWT_CONFIRM_SECRET);
            const cliente = await Cliente.findById(id);

            if (!cliente) throw new Error('Usuario no encontrado');

            const salt = await bcrypt.genSalt(10);
            const nuevoPassword = await bcrypt.hash(contrasena, salt);
            cliente.contrasena = nuevoPassword;
            cliente.confirmado = true;

            await cliente.save();

            return { success: true, message: 'Password modificado serás redirigido a login' };
        },
        uploadAvatar: async (_, { file, user }) => {
            // Buscar usuario
            const usuario = await Cliente.findById(user);
            if (!usuario) {
                throw new Error("Ese usuario no existe");
            }

            const { createReadStream, filename } = await file;

            // Carpeta donde guardar
            const uploadDir = path.join(__dirname, "/uploads/avatars");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Nombre único
            const uniqueName = `${usuario._id}-${Date.now()}-${filename}`;
            const filePath = path.join(uploadDir, uniqueName);

            // Guardar archivo en disco
            await new Promise((resolve, reject) => {
                const stream = createReadStream();
                const out = fs.createWriteStream(filePath);
                stream.pipe(out);
                out.on("finish", resolve);
                out.on("error", reject);
            });

            // URL pública (asegurate de servir /uploads como estático en Express)
            const publicUrl = `/uploads/avatars/${uniqueName}`;

            // Actualizar usuario en DB
            usuario.avatar = publicUrl;
            await usuario.save();

            // Devolver el objeto completo (Cliente) o al menos el campo avatar
            return { avatar: publicUrl };

        },
        modificarAjuste: async (_, {clienteId, idioma, tema}) => {
            try {
                const cliente = await Cliente.findById(clienteId);

                if(!cliente) {
                    throw new Error('Ese Cliente no existe')
                }

                cliente.idioma = idioma;
                cliente.tema = tema;
                await cliente.save();
                return 'Modificaciones aplicadas con éxito!'
            } catch(error) {
                throw new Error(error)
            }
        },
        crearPago: async (_, { input }) => {
            try {
                const { metodoPago, fecha, monto, estado, clienteId } = input;

                const existeCliente = await Cliente.findById(clienteId);
                if (!existeCliente) {
                throw new Error("Este cliente no existe");
                }

                // Normalizar fecha: si viene como string numérico, convertir a Date
                const fechaNormalizada =
                typeof fecha === "string" || typeof fecha === "number"
                    ? new Date(Number(fecha))
                    : fecha;

                const nuevoPago = new Pago({
                clienteId,
                estado,
                monto,
                fecha: fechaNormalizada,
                metodoPago,
                });

                await nuevoPago.save();

                // Guardar Pago en cliente
                existeCliente.pagos.push(nuevoPago.id);
                await existeCliente.save();

                return nuevoPago;
            } catch (error) {
                throw new Error(error.message);
            }
            }
    }
}

export default resolvers;

