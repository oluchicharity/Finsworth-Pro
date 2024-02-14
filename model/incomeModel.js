const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const incomeSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, 
    amount: { type: Number, required: true }, 
    description: { type: String }, 
    date: { type: Date, default: Date.now } 
});
const incomeModel= mongoose.model('Income', incomeSchema);
module.exports = incomeModel
