const express= require("express")

 const{ createOutflowBudget, createInflowBudget, deleteBudget, recordExpense, deleteExpense,totalExpense,getCategory,makeAdmin ,createUser,verify,login}= require('../controller/controller')
 const{auth}= require("../middleware/authorization")

 const router= express.Router()
 router.post('/createUser',createUser)
 router.post("/verify/:id", verify)
 router.post('/login', login)
 router.post('/createBudget',createOutflowBudget)
 router.post('/incomeBudget', createInflowBudget)
 router.delete('/deleteBudget', deleteBudget)
 router.post('/recordExpense', recordExpense)
 router.get("/totalAmount/:id", totalExpense)
 router.delete("/deleteUser/:id", deleteExpense)
router.get("/getCategory/:id/:expenses", getCategory)
router.put("/makeAdmin/:id", makeAdmin)



 module.exports= router