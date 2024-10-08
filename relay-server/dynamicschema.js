// models/DynamicModel.js
import mongoose from 'mongoose';

const dynamicSchema = new mongoose.Schema({}, { strict: false });
const DynamicModel = mongoose.model('BusinessData', dynamicSchema);

export default DynamicModel;
