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
          score: { $gte: -4, $lte: 4 },
          "voteInfo.username": { $nin: [username] },
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
            ? Number(field.score) + 1
            : Number(field.score) - 1;
        const updateVoteInfo = field.voteInfo.concat(_voteInfo);
        const _set = {
          ipfsHash: voteData[i].ipfsHash,
          score: updateScore,
          voteInfo: updateVoteInfo,
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
        finalVotedAt: Date.now(),
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

module.exports = router;
