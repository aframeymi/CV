import mongoose from "mongoose";

export const reportSchema = new mongoose.Schema({
   name: String,
   slug: String,
   detail: String
})

export const Report = mongoose.model('Report', reportSchema)