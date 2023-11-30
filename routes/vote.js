const express = require("express");
const router = express();
const UserTable = require("../models/user");

const canGetReward = async (username) => {
  try {
    const query = { username: username };
    const field = await UserTable.findOne(query);
    if (field) {
      if (field.finalVotedAt === null) {
        return true;
      }
      const timeDiff = Date.now() - field.finalVotedAt;
      if (timeDiff > 24 * 60 * 60 * 1000) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.log("isVotable error: ", err);
    return false;
  }
};

router.post("/getHuman", async (req, res) => {
  const { username } = req.body;
  try {
    const data = await UserTable.aggregate([
      {
        $match: {
          username: { $ne: username },
          "liveHuman.score": { $gte: -4, $lte: 4 },
          "liveHuman.voteInfo.username": { $nin: [username] },
        },
      },
      // { $sample: { size: 3 } },
      { $project: { ipfsHash: 1, _id: 0 } },
    ]);
    return res.status(200).json(data);
  } catch (err) {
    console.log("getHuman error: ", err);
    return res.status(404).json({ err });
  }
});

router.post("/setLiveHuman", async (req, res) => {
  const { username, voteData } = req.body;
  try {
    for (let i = 0; i < voteData.length; i++) {
      const query = { ipfsHash: voteData[i].ipfsHash };
      const field = await UserTable.findOne(query);
      if (field) {
        const _voteInfo = { username: username, voted: voteData[i].voted };
        const updateScore =
          voteData[i].voted === true
            ? Number(field.liveHuman.score) + 1
            : Number(field.liveHuman.score) - 1;
        const updateVoteInfo = field.liveHuman.voteInfo.concat(_voteInfo);
        const _set = {
          ipfsHash: voteData[i].ipfsHash,
          "liveHuman.score": updateScore,
          "liveHuman.voteInfo": updateVoteInfo,
        };
        const update = { $set: _set };
        await UserTable.findOneAndUpdate(query, update);
        if (updateScore >= 4 || updateScore <= -4) {
          for (let j = 0; j < updateVoteInfo.length; j++) {
            const query1 = { username: updateVoteInfo[j].username };
            const field1 = await UserTable.findOne(query1);
            if (field1) {
              let updatePoint = 0;
              if (updateScore >= 4) {
                updatePoint =
                  updateVoteInfo[j].voted === true
                    ? Number(field1.point) + 1
                    : Number(field1.point) - 1;
              } else {
                updatePoint =
                  updateVoteInfo[j].voted === false
                    ? Number(field1.point) + 1
                    : Number(field1.point) - 1;
              }
              const _set1 = {
                username: updateVoteInfo[j].username,
                point: updatePoint,
              };
              const update1 = { $set: _set1 };
              await UserTable.findOneAndUpdate(query1, update1);
            }
          }
        }
      }
    }
    // daily reward everyday
    const isGetReward = await canGetReward(username);
    if (isGetReward) {
      const query2 = { username: username };
      const field2 = await UserTable.findOne(query2);
      const _set2 = {
        username: username,
        point: Number(field2.point) + 4, // daily reward
        "liveHuman.finalVotedAt": Date.now(),
      };
      const update2 = { $set: _set2 };
      await UserTable.findOneAndUpdate(query2, update2);
    }
    return res.status(200).json({ message: "ok" });
  } catch (err) {
    console.log("Set LiveHuman Error: ", err);
    return res.status(404).json({ err });
  }
});

router.post("/getRecoveryData", async (req, res) => {
  try {
    const { username } = req.body;
    const query = { username: username };
    const field = await UserTable.findOne(query);
    if (!field) {
      return res.status(404).json({ message: "Users not exists" });
    }
    const data = await UserTable.aggregate([
      {
        $match: {
          username: { $ne: username },
          "recover.ipfsHash": { $ne: null },
          "recover.score": { $gte: -4, $lte: 4 },
          "recover.votedUsers": { $nin: [username] },
        },
      },
      { $limit: 1 },
      { $sample: { size: 1 } },
      { $project: { username: 1, ipfsHash: 1, "recover.ipfsHash": 1, _id: 0 } },
    ]);
    return res.status(200).json(data);
  } catch (err) {
    console.log("getRecoveryData Error: ", err);
  }
});

router.post("/setRecoveryData", async (req, res) => {
  const { username, votedUsername, isVoted } = req.body;
  console.log({ username, votedUsername, isVoted });
  try {
    if (username == null) {
      return res.status(404).send("User not found");
    }
    if (votedUsername == null) {
      return res.status(404).send("Voted User not found");
    }
    if (isVoted == null) {
      return res.status(404).send("Voted Data not found");
    }
    const query = { username: username };
    const field = await UserTable.findOne(query);

    if (!field) {
      return res.status(404).send("User not found");
    }
    const score = isVoted ? 1 : -1;
    const updatedScore = field.recover.score + score;
    await UserTable.updateOne(
      { _id: field._id },
      {
        $inc: { "recover.score": updatedScore },
        $push: { "recover.votedUsers": votedUsername },
      }
    );

    if (updatedScore >= 4) {
      await UserTable.updateOne(
        { _id: field._id },
        {
          $set: {
            ipfsHash: field.recover.ipfsHash,
            faceDescripter: field.recover.faceDescripter,
            "recover.ipfsHash": null,
            "recover.faceDescripter": [],
            "recover.score": 0,
            "recover.votedUsers": [],
          },
        }
      );
    } else if (updatedScore <= -4) {
      await UserTable.updateOne(
        { _id: field._id },
        {
          $set: {
            "recover.ipfsHash": null,
            "recover.faceDescripter": [],
            "recover.score": 0,
            "recover.votedUsers": [],
          },
        }
      );
    }
    return res.status(200).json({ result: 2 });
  } catch (err) {
    console.log("Match voting error: ", err);
    return res.status(404).send(err);
  }
});

module.exports = router;
