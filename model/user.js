const mongoose = require("mongoose");


// 🔑 Change only the connection string to Atlas
mongoose.connect("mongodb+srv://mini_project:IVvaxHn5ikaf0QWZ@cluster0.j9rv2ps.mongodb.net/miniproject_data")
.then(() => console.log("MongoDB Atlas Connected"))


const miniSchema = mongoose.Schema({
  username: String,
  name: String,
  email: String,
  password: String,
  age: Number,
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref:"post"
    }
  ]
});
module.exports = mongoose.model("user", miniSchema);
