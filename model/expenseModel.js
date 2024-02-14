const mongoose= require("mongoose")
const validCategories = ['Food', 'Utilities', 'Travel', 'salary', 'Other'];
const expenseSchema= new mongoose.Schema({
    
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expenses: [
        {
            category: {
                type: String,
                enum:validCategories
            },
            amount: Number,
            description: String,
            date: { type: Date, default: Date.now } 
        }
    ]
})

const expenseModel= mongoose.model("Expenses", expenseSchema)

module.exports=expenseModel