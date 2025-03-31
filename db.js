import {config} from 'dotenv'
import mongoose from "mongoose";
import { error } from "console";

config()

const DB_PASSWORD = process.env.DB_PASSWORD
const uri = "mongodb+srv://admin:"+DB_PASSWORD+"@j.ykuu0tf.mongodb.net/CommunityVoice"

export const databaseconnect = async() => {
    try {
        await mongoose.connect(uri, {})
        console.log('Database connected')
    } catch (error) {
        console.error("Error connecting to database:" , error)
    }
}
