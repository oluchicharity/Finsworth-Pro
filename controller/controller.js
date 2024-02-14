const express= require("express")
const expenseModel= require("../model/expenseModel")
const budgetModel= require("../model/budgetModel")
const incomeModel= require("../model/incomeModel")
const userModel= require("../model/userModel")
const { gentoken } = require('../jwt');
const jwt = require("jsonwebtoken");
const { validateCreateUser, validateLogin } = require('../validation/validation');
const cloudinary = require("../middleware/cloudinary");
const { dynamicEmail } = require("../html");
const bcrypt = require("bcrypt");
 const {Email} = require("../validation/email");

exports.createUser = async (req, res) => {
  try {
    const { error } = validateCreateUser(req.body);
            if (error) {
       return res.status(400).json(error.message);
           } else {
    const { lastName, firstName, email, password, company_Name, role} = req.body;

    // Check for required fields
    if (!lastName || !firstName || !email || !password ||!company_Name ||!role) {
      return res.status(400).json({
        message: "Missing required fields. Make sure to include Lastname, Firstname, email, and password.",
      });
    }

    // Check if the email already exists
    const emailExist = await userModel.findOne({ email: email.toLowerCase() });
    if (emailExist) {
      return res.status(400).json({
        message: "This email already exists",
      });
    }

    // Hash the password
const salt = await bcrypt.genSalt(12);
const hashedPassword = await bcrypt.hash(password, salt);

    // Generate a JWT token
    const token = jwt.sign(
      { lastName, firstName, email,role },
      process.env.SECRET,
      { expiresIn: "120s" }
    );
    
    

    // Upload profile picture to Cloudinary
    // const profilepicture = req.files && req.files.profilepicture;
    // if (!profilepicture || !profilepicture.tempFilePath) {
    //   return res.status(400).json({
    //     message: "Profile picture is missing or invalid",
    //   });
    // }

    // let fileUploader;
    // try {
    //   fileUploader = await cloudinary.uploader.upload(profilepicture.tempFilePath);
    // } catch (error) {
    //   console.error("Error uploading profile picture to Cloudinary:", error);
    //   return res.status(500).json({
    //     message: "Error uploading profile picture to Cloudinary",
    //   });
    

    // Create a new user instance
    const newUser = new userModel({
        lastName,
        firstName,
      email: email.toLowerCase(),
      password: hashedPassword,
      company_Name,
      role
      // profilepicture: {
      //   public_id: fileUploader.public_id,
      //   url: fileUploader.secure_url
      // }
    });
    // Construct a consistent full name
    const fullName = `${newUser.firstName.charAt(0).toUpperCase()}${newUser.firstName.slice(1).toLowerCase()} ${newUser.lastName.charAt(0).toUpperCase()}`;
    // console.log(fullName);

    // Save the new user to the database
    const savedUser = await newUser.save();

    
    

    const generateOTP = () => {
      const min = 1000;
      const max = 9999;
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  const otp = generateOTP();
  
  const subject = "Kindly verify";

    savedUser.newCode = otp
    const html = dynamicEmail(fullName, otp)

   
    Email({
      email: savedUser.email,
      html:html,
      subject,
    })



    await savedUser.save();


    // Respond with success message and user data
    res.status(201).json({
      message: "Welcome, User created successfully",
      data: savedUser, token
    })}
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
};


// Function to resend the OTP incase the user didn't get the OTP
exports. resendOTP = async (req, res) => {
  try {
      const id = req.params.id;
      const user = await userModel.findById(id);

      const generateOTP = () => {
        const min = 1000;
        const max = 9999;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    const subject = 'Email Verification'
    const otp = generateOTP();

      user.newCode = otp
      const html = dynamicEmail(fullName, otp)
      Email({
        email: user.email,
        html,
        subject
      })
      await user.save()
      return res.status(200).json({
        message: "Please check your email for the new OTP"
      })
      
    
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error: " + err.message,
    });
  }
};


//Function to verify a new user with an OTP
exports. verify = async (req, res) => {
  try {
    const id = req.params.id;
    //const token = req.params.token;
    const user = await userModel.findById(id);
    const { userInput } = req.body;
    // console.log(user);

    if (user && userInput === user.newCode) {
      // Update the user if verification is successful
      await userModel.findByIdAndUpdate(id, { isVerified: true }, { new: true });
    } else {
      return res.status(400).json({
        message: "Incorrect OTP, Please check your email for the code"
      })
    }
    if (user.isVerified === true) {
      return res.status(200).send("You have been successfully verified. Kindly visit the login page.");
    }

  } catch (err) {
      return res.status(500).json({
        message: "Internal server error: " + err.message,
      });
  }
};


exports. login = async (req, res) => {
  try {
    const { email, firstName, password } = req.body;

    // Check if the user exists with the provided email or Firstname
    const user = await userModel.findOne({
      $or: [{ email}, { firstName}],
    });
     //console.log(user);

    if (user) {
      // If the user exists, compare the password
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        // If password is correct, generate and send a token
        const token = jwt.sign(
          { id: user.id, email: user.email },
          process.env.SECRET,
          { expiresIn: '120s' }
        );

        return res.json({
          message: 'Login successful',
          user: { email: user.email, firstName: user.firstName },
          token,
        });
      } else {
        return res.status(401).json({ error: 'Invalid password' });
      }
    } else {
      return res.status(401).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error during login:', error.message);
    return res.status(500).json(error.message);
  }
};


exports.createOutflowBudget = async (req, res) => {
  try {
      const { userId, categories, budgetType } = req.body;

      // Check if user is logged in
      if (!userId) {
          return res.status(401).json({ error: 'User must be logged in to create a budget' });
      }

      // Check if user exists
      const user = await userModel.findById(userId);
      if (!user) {
          return res.status(404).json("User not found. Please log in to perform this operation.");
      }

      // Check if categories are provided
      if (!categories || categories.length === 0) {
          return res.status(400).json({ error: 'Categories are required' });
      }
    
      const validCategories = ['Food', 'Utilities', 'Travel', 'Salary', 'Other'];
      // Validate categories
      if (!categories.every(category => 
          typeof category === 'object' && 
          typeof category.category === 'string' && 
          typeof category.amount === 'number' &&
          validCategories.includes(category.category)
      )) {
          return res.status(400).json({ error: 'Invalid categories provided' });
      }

      // Set start and end dates based on budget type
      let startDate, endDate;
      if (budgetType === 'monthly') {
          const now = new Date();
          startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
      } else if (budgetType === 'yearly') {
          const now = new Date();
          startDate = new Date(now.getFullYear(), 0, 1); // First day of current year
          endDate = new Date(now.getFullYear(), 11, 31); // Last day of current year
      } else {
          return res.status(400).json({ error: 'Invalid budget type' });
      }

      // Create a new budget with start and end dates
      const budget = new budgetModel({ 
          user: userId, 
          categories: [], 
          startDate: startDate, 
          endDate: endDate 
      });

      // Add categories to the budget
      for (const category of categories) {
          budget.categories.push({ category: category.category, amount: category.amount, date: category.date });
      }

      // Save the budget
      const savedBudget = await budget.save();

      return res.status(201).json({ message: 'Budget created successfully', data: savedBudget });
  } catch (error) {
      console.error('Error creating budget:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
  }
};



exports.deleteBudget = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Find and delete the budget
        const deletedBudget = await budgetModel.findOneAndDelete({ user: userId });

        if (!deletedBudget) {
            return res.status(404).json({ error: 'Budget not found for the specified user' });
        }

        return res.status(200).json({ message: 'Budget deleted successfully', data: deletedBudget });
    } catch (error) {
        console.error('Error deleting budget:', error.message);
        return res.status(500).json( error.message);
    }
};



exports.createInflowBudget = async (req, res) => {
    try {
        const { userId, amount, description, date } = req.body;

        // Check if user ID and amount are provided
        if (!userId || !amount) {
            return res.status(400).json({ error: 'User ID and amount are required' });
        }

        // Create a new income budget
        const income = new incomeModel({
            user: userId,
            amount,
            description,
            date: date || Date.now()
        });

        // Save the income budget
        const savedIncome = await income.save();

        // Respond with success message and the saved income budget data
        return res.status(201).json({ message: 'Income budget created successfully', data: savedIncome });
    } catch (error) {
        console.error('Error creating income budget:', error.message);
        return res.status(500).json(error.message);
    }
};



// exports.category = async (req, res) => {
//     try {
//         const id = req.params.id;
//         const { Category, Amount, Description, Date} = req.body;
  
//         try {
//             const user = await expenseModel.findById(id);
  
//             if (!user) {
//                 return res.status(404).json(`User with this ID not found`);
//             }
  
//             const Categories = ['Food', 'Utilities', 'Travel', 'Salary', 'Other'];
  
//             if (!Categories.includes(category)) {
//                 return res.status(400).json(`Invalid category. Choose from: ${Categories.join(', ')}`);
//             }
  
//             const newExpenses = {
//                 Category,
//                 Amount,
//                 Description,
//                 Date
//             };
  
//             // Push new expenses to user's expenses array
//             user.Expenses.push(newExpenses);
  
//             // Save the updated user
//             const updatedUser = await user.save();
  
//             return res.status(201).json({ message: 'Category added successfully', data: newExpenses });
//         } catch (error) {
//             console.error('Error updating user with new expenses:', error.message);
//             return res.status(500).json(error.message);
//         }
//     } catch (error) {
//         console.error('Error:', error.message);
//         res.status(500).json(error.message);
//     }
//   };


// exports.recordExpense = async (req, res) => {
//     try {
//         const { category, amount, description, date } = req.body;
//         const validCategories = ['Food', 'Utilities', 'Travel', 'salary', 'Other'];
//         // Validate category
//         if (!validCategories.includes(category)) {
//             return res.status(400).json({ error: 'Invalid category provided' });
//         }

//         // Create a new expense
//         const expense = new expenseModel({
//             expenses: [{
//                 category: category,
//                 amount: amount,
//                 description: description,
//                 date: date || Date.now()
//             }]
//         });

//         // Save the expense
//         const savedExpense = await expense.save();

//         // Respond with success message and the saved expense data
//         return res.status(201).json({ message: 'Expense recorded successfully', data: savedExpense });
//     } catch (error) {
//         console.error('Error recording expense:', error.message);
//         return res.status(500).json( error.message);
//     }
// };



// Function to record an expense
// exports.recordExpense = async (req, res) => {
//     try {
//         const { userId, category, amount } = req.body;

//         // Create a new expense document
//         const expense = new expenseModel({
//             user: userId,
//             category: category,
//             amount: amount,
//             date: new Date() // Assuming date is recorded automatically
//         });

//         // Save the expense
//         await expense.save();

//         // Update the budget for the user
//         await updateBudget(userId, category, amount);

//         return res.status(201).json({ message: 'Expense recorded successfully' });
//     } catch (error) {
//         console.error('Error recording expense:', error.message);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// };

// // Function to update the budget after recording an expense
// async function updateBudget(userId, category, amount) {
//     // Find the user's budget for the specified category
//     const user = await userModel.findById(userId).populate('budgets');
//     const budget = user.budgets.find(budget => budget.category === category);

//     // Update the budgeted amount for the category
//     if (budget) {
//         budget.amount -= amount;
//         await budget.save();
//     }
// }

//Function to update the budget after recording an expense
exports.updateBudget= async(req,res)=>{
  try {
    const{userId, category, amount}= req.body

    if (!userId || !amount ||!category ) {
      return res.status(400).json({ error: 'User ID,category and amount are required' });
  }
      // Find the user's budget for the specified category
      let budget = await budgetModel.findOne({ user: userId, category: category });

      // If budget doesn't exist, create a new one
      if (!budget) {
          budget = new budgetModel({
              user: userId,
              category: category,
              amount: 0 // Initialize amount as 0 if not exists
          });
      }

      // Update the budgeted amount for the category
      budget.amount -= amount; // Subtract the amount spent from the budgeted amount
      await budget.save();
  } catch (error) {
      console.error('Error updating budget:', error.message);
      
  }
}

exports.recordExpense= async(req,res)=> {
  try {
    const {userId, expenses}= req.body
    if (!userId || !expenses) {
      return res.status(400).json({ error: 'User ID,category,description and amount are required' });
  }
      // Create a new expense document
      const expense = new expenseModel({
          user: userId,
          expenses:[]
      });

      // Save the expense
      await expense.save();

      // Update the budget for the user and category
      await exports.updateBudget(userId, category, amount);

      return res.status(200).json({message:'Expense recorded successfully', expense});
  } catch (error) {
      console.error(error.message);
      
  }
}


  
  exports.totalExpense= async (req,res)=>{
    try {
      const userId = req.params.id;
  
      const user= await expenseModel.findById(userId)
  
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const totalExpense = user.expenses.reduce((total, expense) => total + expense.amount, 0);
  
      return res.status(200).json({ userId: user.id, totalExpense });
    } catch (error) {
      console.error('Error calculating total expenses:', error);
      return res.status(500).json(error.message);
    }
  };

 

exports.deleteExpense = async (req, res) => {
    try {
        const expenseId = req.params.expenseId;

        // Find and delete the expense
        const deletedExpense = await expenseModel.findByIdAndDelete(expenseId);

        if (!deletedExpense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        return res.status(200).json({ message: 'Expense deleted successfully', data: deletedExpense });
    } catch (error) {
        console.error('Error deleting expense:', error.message);
        return res.status(500).json(error.message);
    }
};


  // Get expenses grouped by category for a user
  exports.getCategory= async (req, res) => {
    
        try {
            const userId = req.params.userId;
            const userCategoryExpenses = await expenseModel.find({ userId });
           
            console.log(userCategoryExpenses);
  
            res.status(200).json(userCategoryExpenses);
          } catch (error) {
            res.status(500).json({ error: error.message });
          }
        }
  
  
  
  exports.makeAdmin = async (req, res) => {
    try {
        const userId = req.params.id;
  
        // Find the user by ID
        const user = await expenseModel.findById(userId);
  
        if (!user) {
            return res.status(404).json(`User with ID ${userId} not found`);
        }
  
        // Update the user's role to 'admin'
        user.isAdmin = true;
  
        // Save the updated user
        const updatedUser = await user.save();
  
        return res.status(200).json({ message: 'User role updated to admin', data: updatedUser });
    } catch (error) {
        console.error('Error updating user role to admin:', error.message);
        res.status(500).json(error.message);
    }
  };
  
          
          
  // exports.deleteUser = async (req, res) => {
  //   try {
  //     const userID = req.params.id;
  //     const user = await expenseModel.findById(userID);
  
  //     if (!user) {
  //       return res.status(404).json({ message: `This user cannot be deleted` });
  //     }
  
  //     const deletedUser = await expenseModel.findByIdAndDelete(userID);
  
  //     return res.status(200).json({ message: `User has been deleted`});
  //   } catch (error) {
  //     res.status(500).json({ error: error.message });
  //   }
  // };
  
          

  //we can make budget income where the company can make a budget of what they expect to have made by the end of the month or year so if they dont get to that target, they can work harder next time