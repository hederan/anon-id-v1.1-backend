const mongoose = require("mongoose");
const mongoURI = "mongodb+srv://jpeng:Hello2023@cluster0.xirwcri.mongodb.net";

const connectDB = () => {
  try {
    mongoose.connect(mongoURI, { useNewUrlParser: true }).then(() => {
      console.log("MongoDB Connected...");
    });
  } catch (err) {
    console.log(err.message);
    process.exit(-1);
  }
};

module.exports = {
  connectDB,
};
