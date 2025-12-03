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
// SDK de Mercado Pago
import { MercadoPagoConfig, Preference } from 'mercadopago';
// Agrega credenciales
const client = new MercadoPagoConfig({ accessToken:process.env.MP_ACCESS_TOKEN});
// __dirname fix for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const preference = new Preference(client);


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
    const { items, payer } = req.body;

    const result = await preference.create({
      body: {
        items:items,
        payer:payer,
        back_urls: {
          success: "https://www.youtube.com/",
          failure: "https://www.youtube.com/",
          pending: "https://www.youtube.com/",
        },
        auto_return: "approved",
      },
    });

    res.json(result); // devuelve la preferencia creada
  } catch (error) {
    console.error("Error al crear preferencia:", error);
    res.status(500).json({ error: "Error al procesar pago" });
  }
});

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req, res }) => ({ req, res })
}));

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}/graphql`);
});
