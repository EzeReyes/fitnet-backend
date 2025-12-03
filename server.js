import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import http from 'http'
import typeDefs from './db/schema.js';
import resolvers from './resolvers/resolver.js'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import cors from 'cors';
import conectarDB from './config/db.js';
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

// SDK Mercado Pago v2
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Agregar credenciales
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

const preference = new Preference(client);
const payment = new Payment(client);

// __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

conectarDB();

const app = express();

// ========= WEBHOOK MERCADO PAGO =========
app.post('/webhook', express.json(), async (req, res) => {
  try {
    console.log("WEBHOOK:", req.body);

    const { data } = req.body;

    if (!data?.id) {
      console.log("Notificación sin ID de pago");
      return res.sendStatus(200);
    }

    const paymentId = data.id;

    // ✔️ Consultar el pago REAL con el SDK correcto
    const pagoReal = await payment.get({ id: paymentId });

    console.log("PAGO REAL:", pagoReal);

    // Acá procesás tu orden…

    return res.sendStatus(200);

  } catch (error) {
    console.error("ERROR WEBHOOK:", error);
    return res.sendStatus(500);
  }
});

// ========= MULTER =========
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

// ========= HTTP SERVER =========
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

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ========= PREFERENCIAS MERCADO PAGO =========
app.post("/process_payment", async (req, res) => {
  try {
    const { items, payer } = req.body;

    const result = await preference.create({
      body: {
        items,
        payer,
        back_urls: {
          success: "https://www.youtube.com/",
          failure: "https://www.youtube.com/",
          pending: "https://www.youtube.com/",
        },
        notification_url: `${process.env.BACKEND_URL}/webhook`, // ✔️ Asegurar webhook
        auto_return: "approved",
      },
    });

    res.json(result);
  } catch (error) {
    console.error("Error al crear preferencia:", error);
    res.status(500).json({ error: "Error al procesar pago" });
  }
});

// ========= GRAPHQL =========
app.use('/graphql', expressMiddleware(server, {
  context: async ({ req, res }) => ({ req, res })
}));

// ========= START SERVER =========
const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}/graphql`);
});
