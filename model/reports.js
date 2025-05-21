import mongoose from "mongoose";

     export const reportSchema = new mongoose.Schema({
       name: { type: String, required: true },
       slug: { type: String, required: true },
       detail: { type: String, required: true },
     });


export const Report = mongoose.model('Report', reportSchema)