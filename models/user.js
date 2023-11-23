const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  objectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  username: {
    type: String,
  },
  faceDescripter: {
    type: Array,
    required: true,
  },
  ipfsHash: {
    type: String,
  },
  isBlackList: {
    type: Boolean,
    default: false,
  },
});

module.exports = User = mongoose.model("user", UserSchema);
