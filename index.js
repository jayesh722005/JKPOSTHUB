
require('dotenv').config()
const express = require("express");
const app = express();
const Usermodel = require("./model/user.js");
const Postmodel = require("./model/post.js");
const cookieParser = require("cookie-parser");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const post = require("./model/post.js");
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Atlas Connected"))
.catch(err=>console.log("MongoDB connection error:",err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.get('/',(req,res)=>
{
  res.render('home')
})
app.get("/form", (req, res) => {
  res.render("index");
});
app.post("/register", async (req, res) => {
  try {
    const { username, name, email, password, age } = req.body;
    
    if (!process.env.JWT_SECRET) {
      return res.status(500).send("Server Configuration Error: JWT_SECRET environment variable is not defined on Vercel.");
    }

    let user = await Usermodel.findOne({ email });
    if (user) return res.status(400).send("User already registered");

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    let createuser = await Usermodel.create({
      username,  
      name,
      email,
      password: hash,
      age,
    });

    let token = jwt.sign({ email: email, userid: createuser._id }, process.env.JWT_SECRET);
    res.cookie("token", token);
    return res.redirect("/");
  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).send("Internal Server Error during registration: " + err.message);
  }
});

app.get('/posts',async(req,res)=>
{
  let posts=await Postmodel.find().populate("user")
  res.render('posts',{posts})
})
app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/profile", isloggedin, async (req, res) => {
  let user = await Usermodel.findOne({ email: req.user.email }).populate("posts")
  res.render("profile", { user });
});
app.get("/like/:id", isloggedin, async (req, res) => {
  let post = await Postmodel.findOne({_id: req.params.id }).populate("user")
  if(post.like.indexOf(req.user.userid)===-1)
  {
    post.like.push(req.user.userid)
  }
  else{
  post.like.splice(post.like.indexOf(req.user.userid),1)
  }
 await post.save()
 res.redirect('/profile')
  
});

app.get("/edit/:id",isloggedin, async(req,res)=>
{
  let post=await Postmodel.findOne({_id:req.params.id}).populate('user')

  res.render('edit',{post})
})
app.post('/update/:id',async(req,res)=>
{
  let post=await Postmodel.findOneAndUpdate({_id:req.params.id},{content:req.body.content})
  res.redirect('/profile')
})
app.get('/delete/:id',isloggedin,async(req,res)=>
{
  let post=await Postmodel.findOneAndDelete({_id:req.params.id})
  res.redirect('/profile')
})
app.post("/post", isloggedin, async (req, res) => {
  try {
    let user = await Usermodel.findOne({ email: req.user.email });

    let createpost = await Postmodel.create({
      user: user._id,
      content: req.body.content,
    });

    user.posts.push(createpost._id);
    await user.save();

    res.redirect("/profile");
  } catch (err) {
    res.status(500).send("Error creating post");
  }
});

app.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      return res.status(500).send("Server Configuration Error: JWT_SECRET environment variable is not defined on Vercel.");
    }

    let user = await Usermodel.findOne({ email });
    if (!user) return res.status(400).send("Invalid email or password");

    const result = await bcrypt.compare(password, user.password);
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, process.env.JWT_SECRET);
      res.cookie("token", token);
      return res.status(200).redirect("/profile");
    } else {
      return res.redirect("/login");
    }
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).send("Internal Server Error during login: " + err.message);
  }
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});
app.get("/test", (req, res) => {
  res.send("Server working on Render 🚀");
});

function isloggedin(req, res, next) {
  if (!req.cookies || !req.cookies.token) {
    return res.redirect("/login");
  }
  try {
    let data = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    req.user = data;
    next();
  } catch (err) {
    res.redirect("/login");
  }
}
const PORT = process.env.PORT || 2000;
app.listen(PORT, () => {
  console.log("running...");
});
