import mongoose from 'mongoose';
import dotenv from 'dotenv'
dotenv.config();


const conectarDB = async () => {
    try {
        await mongoose.connect(process.env.DB);
        console.log('DB conectada');
    } catch (error) {
        console.log(error);
        process.exit(1); //detener la app
    }
}

export default conectarDB;