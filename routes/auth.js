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

    const field = await UserTable.findOne({ username: username });
    if (field) {
      return res.status(404).json({ message: "Username already Exists" });
    }
    const newUser = new UserTable({
      username,
      faceDescripter,
      ipfsHash,
    });

    await newUser.save();

    const token = jwt.sign({ username: username }, "anonID", {
      expiresIn: 100,
    });
    return res.status(200).json({ message: "Success", token: token });
  } catch (err) {
    console.log("Register Error: ", err);
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, faceDescripter } = req.body;
    if (!username) {
      return res
        .status(404)
        .json({ message: "Username is not defined", status: 0 });
    }
    if (!faceDescripter) {
      return res
        .status(404)
        .json({ message: "Face Descripter is not defined", status: 1 });
    }
    const query = { username: username };
    const field = await UserTable.findOne(query);
    if (!field) {
      return res.status(404).json({
        message: "You are not returning User, Please register",
        status: 2,
      });
    }

    if (field.isBlackList) {
      return res
        .status(404)
        .json({ message: "You are BlackListed User", status: 3 });
    }

    const _faceDescripter = field.faceDescripter;
    const distance = faceapi.euclideanDistance(faceDescripter, _faceDescripter);
    if (distance < 0.3) {
      const token = jwt.sign({ username: field.username }, "anonID", {
        expiresIn: 100,
      });
      return res.status(200).json({ message: "Success", token: token });
    } else {
      return res.status(404).json({
        message: "Login Failed, Face did not match, Try Again",
        status: 4,
      });
    }
  } catch (err) {
    console.log("Login Error: ", err);
  }
});

router.post("/recover", async (req, res) => {
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
    const query = { username: username };
    const field = await UserTable.findOne(query);
    if (field) {
      if (field.recover.ipfsHash !== null) {
        return res
          .status(404)
          .json({ message: "Recovery Request is already sent" });
      }
      const _set = {
        username: username,
        "recover.faceDescripter": faceDescripter,
        "recover.ipfsHash": ipfsHash,
      };
      const update = { $set: _set };
      await UserTable.findOneAndUpdate(query, update);
      return res.status(200).json({ message: "Success" });
    }
  } catch (err) {
    console.log("Recover Error: ", err);
  }
});

router.post("/isRecover", async (req, res) => {
  const { username } = req.body;
  try {
    if (!username) {
      return res.status(404).json({ message: "Username is not defined" });
    }
    const query = { username: username };
    const field = await UserTable.findOne(query);
    if (field) {
      if (field.recover.ipfsHash !== null) {
        return res.status(200).json({ data: true });
      }
    }
    return res.status(200).json({ data: false });
  } catch (err) {
    console.log("Getting Recover Error: ", err);
  }
});

router.post("/re-register", async (req, res) => {
  const { username, ipfsHash, faceDescripter } = req.body;
  try {
    if (!username) {
      return res.status(404).json({ message: "Username is not defined" });
    }
    const query = { username: username };
    const field = await UserTable.findOne(query);
    if (!field) {
      return res.status(404).json({ message: "Can't find that user" });
    }
    const _set = {
      username: username,
      faceDescripter: faceDescripter,
      ipfsHash: ipfsHash,
    };
    const update = { $set: _set };
    await UserTable.findOneAndUpdate(query, update);
    return res.status(200).json({ message: "ok" });
  } catch (err) {
    console.log("Re Registering Error: ", err);
  }
});

module.exports = router;
