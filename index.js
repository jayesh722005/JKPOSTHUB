
require('dotenv').config()
const express = require("express");
const app = express();
const Usermodel = require("./model/user.js");
const Postmodel = require("./model/post.js");
const cookieParser = require("cookie-parser");
const path = require("path");
const bcrypt = require("bcrypt");
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
app.use(express.static(path.join(__dirname, "public")));

app.get('/',(req,res)=>
{
  res.render('home')
})
app.get("/form", (req, res) => {
  res.render("index");
});
app.post("/register", async (req, res) => {
  const { username, name, email, password, age } = req.body;
  let user = await Usermodel.findOne({ email });
  if (user) return res.status(500).send("User already registered");
  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
      let createuser = await Usermodel.create({
        username,  
        name,
        email,
        password: hash,
        age,
      });
      let token = jwt.sign({ email: email, userid: createuser._id },process.env.JWT_SECRET);
      res.cookie("token", token);
      return res.redirect("/");
    });
  });
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
  let { email, password } = req.body;
  let user = await Usermodel.findOne({ email });
  if (!user) return res.status(500).send("Something went wrong");
  bcrypt.compare(password, user.password).then(function (result) {
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id },process.env.JWT_SECRET);
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else res.redirect("/login");
  });
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

function isloggedin(req, res, next) {
  if (req.cookies.token === "") res.redirect("/login");
  else {
    let data = jwt.verify(req.cookies.token,process.env.JWT_SECRET);
    req.user = data;
    next();
  }
}
const PORT = process.env.PORT || 2000;
app.listen(process.env.PORT, () => {
  console.log("running...");
});
