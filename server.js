import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import http from 'http'
import typeDefs from './db/schema.js';
import resolvers from './resolvers/resolver.js'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { Pago } from './models/Model.js';
import cors from 'cors';
import conectarDB from './config/db.js';
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
// SDK de Mercado Pago
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
// Agrega credenciales
const client = new MercadoPagoConfig({ accessToken:process.env.MP_ACCESS_TOKEN});
// __dirname fix for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const preference = new Preference(client);
const payment = new Payment(client);
import dayjs from "dayjs";


conectarDB();

const app = express();

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "/uploads/avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `${req.body.user}-${Date.now()}-${file.originalname}`;
    cb(null, unique);
  }
});

const upload = multer({ storage });

const httpServer = http.createServer(app);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
});

await server.start();

app.use(express.json());

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Servir carpeta uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

    const uploadPath = path.join(__dirname, "uploads/avatars");


app.post("/process_payment", async (req, res) => {
  console.log(req)
  try {
    const { items, payer, clienteId } = req.body;

    // 1. Crear registro en DB
    const nuevoPago = await Pago.create({
      estado: "pending",
      monto: items[0].unit_price,
      email: payer.email,
      clienteId: clienteId,
      metodoPago: "mercado_pago"
    });


    const result = await preference.create({
      body: {
        items:items,
        payer:payer,
        external_reference: nuevoPago._id.toString(),
        back_urls: {
          success: "https://www.youtube.com/",
          failure: "https://www.youtube.com/",
          pending: "https://www.youtube.com/",
        },
        auto_return: "approved",
        notification_url: "https://fitnet-backend.onrender.com/webhook"      
      },
    });

    res.json(result); // devuelve la preferencia creada
  } catch (error) {
    console.error("Error al crear preferencia:", error);
    res.status(500).json({ error: "Error al procesar pago" });
  }
});

app.post("/webhook", async (req, res) => {
  try {
    console.log("WEBHOOK RECIBIDO:", req.body);

    const body = req.body || {};
    const topic = body.topic;
    const resource = body.resource;
    const type = body.type;
    const data = body.data;

    // Ignorar si no es payment
    if (topic !== "payment" && type !== "payment") {
      console.log("⚠️ Webhook ignorado (no es payment)");
      return res.sendStatus(200);
    }

    // Obtener el ID de pago
    const paymentId = data?.id || resource;
    console.log("🔵 ID DE PAGO RECIBIDO:", paymentId);

    if (!paymentId) {
      console.log("⚠️ No se encontró ID de pago");
      return res.sendStatus(200);
    }

    // Consultar el pago real
    const pago = await payment.get({ id: paymentId });
    console.log("💰 PAGO OBTENIDO:", pago);

    // Dependiendo de la versión del SDK, puede ser pago o pago.response
    const info = pago.response || pago;

    if (!info) {
      console.log("⚠️ No se encontró información del pago");
      return res.sendStatus(200);
    }

    const status = info.status;
    const method = info.payment_method_id;
    const amount = info.transaction_amount;
    const email = info.payer?.email;
    const externalReference = info.external_reference;
    const date = info.date_approved;

    await Pago.findByIdAndUpdate(externalReference, {
      estado: status,
      metodoPago: method,
      fecha: date,
      paymentId: paymentId
    });


    console.log("📌 DATOS A GUARDAR:", {
      status,
      amount,
      email,
      method,
      externalReference,
      date
    });

    // Actualizar DB aquí

    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ ERROR WEBHOOK:", error);
    return res.sendStatus(200);
  }
});


app.use('/graphql', expressMiddleware(server, {
  context: async ({ req, res }) => ({ req, res })
}));

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}/graphql`);
});
