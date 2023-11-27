const express = require("express");
const router = express();
const UserTable = require("../models/user");

router.post("/userdata", async (req, res) => {
  const { username } = req.body;
  try {
    const query = { username: username };
    const field = await UserTable.findOne(query);
    return res.status(200).json({ data: field });
  } catch (err) {
    console.log("Fetching Userdata Error: ", err);
  }
});

module.exports = router;
