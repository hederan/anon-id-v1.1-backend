const mongoose = require("mongoose");

const voteInfoSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  voted: {
    type: Boolean,
  },
});

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
  point: {
    type: Number,
    default: 0,
  },
  score: {
    type: Number,
    default: 0,
  },
  voteInfo: [voteInfoSchema],
  finalVotedAt: {
    type: Date,
    default: null,
  },
  isBlackList: {
    type: Boolean,
    default: false,
  },
});

module.exports = User = mongoose.model("user", UserSchema);
