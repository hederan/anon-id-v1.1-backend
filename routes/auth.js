const express = require("express");
const router = express();
const faceapi = require("face-api.js");
const jwt = require("jsonwebtoken");
const UserTable = require("../models/user");

router.post("/getUser", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(404).json({ message: "Username is not defined" });
  }
  const query = { username: username };
  const field = await UserTable.findOne(query);
  if (field) {
    return res.status(200).json({ isReturningUser: true });
  }
  return res.status(200).json({ isReturningUser: false });
});

router.post("/register", async (req, res) => {
  try {
    const { username, faceDescripter, ipfsHash } = req.body;
    if (!username) {
      return res.status(404).json({ message: "Username is not defined" });
    }
    if (!faceDescripter) {
      return res
        .status(404)
        .json({ message: "Face Descripter is not defined" });
    }
    if (!ipfsHash) {
      return res.status(404).json({ message: "Ipfs hash is not defined" });
    }
    const newUser = new UserTable({
      username,
      faceDescripter,
      ipfsHash,
    });

    await newUser.save();

    const token = jwt.sign({ username }, "anonID", { expiresIn: 30 });
    return res.status(200).json({ message: "Success", token: token });
  } catch (err) {
    console.log("Register Error: ", err);
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, faceDescripter } = req.body;
    if (!username) {
      return res.status(404).json({ message: "Username is not defined" });
    }
    if (!faceDescripter) {
      return res
        .status(404)
        .json({ message: "Face Descripter is not defined" });
    }
    const query = { username: username };
    const field = await UserTable.findOne(query);
    if (!field) {
      return res
        .status(404)
        .json({ message: "You are not returning User, Please register" });
    }

    if (field.isBlackList) {
      return res.status(404).json({ message: "You are BlackListed User" });
    }

    const _faceDescripter = field.faceDescripter;
    const distance = faceapi.euclideanDistance(faceDescripter, _faceDescripter);
    if (distance < 0.8) {
      const token = jwt.sign(
        { _id: field._id, username: field.username },
        "anonID",
        { expiresIn: 30 }
      );
      return res.status(200).json({ message: "Success", token: token });
    }
  } catch (err) {
    console.log("Login Error: ", err);
  }
});

module.exports = router;
