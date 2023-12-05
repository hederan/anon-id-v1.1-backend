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
        const power = await getVotingPower(username);
        const updateScore =
          voteData[i].voted === true
            ? Number(field.liveHuman.score) + power
            : Number(field.liveHuman.score) - power;
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
            const username = updateVoteInfo[j].username;
            const point = updateScore >= 4 ? 1 : -1;
            await givePoint(username, point);
          }
        }
      }
    }
    // daily reward everyday
    const isGetReward = await canGetReward(username);
    if (isGetReward) {
      await givePoint(username, 4); // daily reward
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
    const power = await getVotingPower(votedUsername);
    const score = isVoted ? 1 : -1;
    const updatedScore = field.recover.score + score * power;
    await UserTable.updateOne(
      { _id: field._id },
      {
        $inc: { "recover.score": updatedScore },
        $push: { "recover.votedUsers": votedUsername },
      }
    );

    if (updatedScore >= 4 || updatedScore <= -4) {
      for (let j = 0; j < field.recover.votedUsers.length; j++) {
        const username = field.recover.votedUsers[j].username;
        const point = updatedScore >= 4 ? 1 : -1;
        await givePoint(username, point);
      }
    }

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

const getVotingPower = async (username) => {
  const query = { username: username };
  const field = await UserTable.findOne(query);
  const level = field.level;
  const power = Number(level) * 1;
  return power;
};

const givePoint = async (username, point) => {
  try {
    const query = { username: username };
    const field = await UserTable.findOne(query);
    const updatedPoint = Number(field.point) + Number(point);
    const _set = {
      username: username,
      point: updatedPoint,
      "liveHuman.finalVotedAt": Date.now(),
      level: calcLevel(updatedPoint),
    };
    const update = { $set: _set };
    await UserTable.findOneAndUpdate(query, update);
  } catch (err) {
    console.log("Giving Point Error: ", err);
  }
};

const calcLevel = (point) => {
  const level = Math.floor(Number(point) / 4) + 1;
  return level;
};

module.exports = router;
