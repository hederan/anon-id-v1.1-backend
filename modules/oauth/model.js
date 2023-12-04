const mongoose = require("mongoose");
const UserTable = require("../../models/user");

const OAuthAccessTokenModel = mongoose.model(
  "OAuthAccessToken",
  new mongoose.Schema(
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      clientId: { type: mongoose.Schema.Types.ObjectId, ref: "OAuthClient" },
      accessToken: { type: String },
      expires: { type: Date },
    },
    {
      timestamps: true,
    }
  ),
  "oauth_access_tokens"
);

const OAuthRefreshTokenModel = mongoose.model(
  "OAuthRefreshToken",
  new mongoose.Schema(
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      clientId: { type: mongoose.Schema.Types.ObjectId, ref: "OAuthClient" },
      refreshToken: { type: String },
      expires: { type: Date },
    },
    {
      timestamps: true,
    }
  ),
  "oauth_refresh_tokens"
);

const OAuthClientModel = mongoose.model(
  "OAuthClient",
  new mongoose.Schema(
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      clientId: { type: String },
      clientSecret: { type: String },
      redirectUris: { type: Array },
      grants: { type: Array },
    },
    {
      timestamps: true,
    },
    "oauth_clients"
  )
);

const getAccessToken = (accessToken, cb) => {
  OAuthAccessTokenModel.findOne({
    accessToken: accessToken,
  })
    .populate("userId")
    .populate("clientId")
    .then((accessTokenDB) => {
      if (!accessTokenDB) return cb(false, false);
      return cb(false, accessTokenDB.toObject());
    })
    .catch((err) => {
      cb(false, false);
    });
};

const getRefreshToken = (refreshToken, cb) => {
  OAuthRefreshTokenModel.findOne({ refreshToken: refreshToken })
    .populate("userId")
    .populate("clientId")
    .then((refreshTokenDB) => {
      if (!refreshTokenDB) return cb(false, false);
      return cb(false, refreshTokenDB.toObject());
    })
    .catch((err) => {
      cb(false, false);
    });
};

const getClient = (clientId, clientSecret, cb) => {
  OAuthClientModel.findOne({ clientId, clientSecret })
    .then((client) => {
      return cb(false, client);
    })
    .catch((err) => {
      cb(false, false);
    });
};

const grantTypeAllowed = (clientId, grantType, cb) => {
  cb(false, true);
};

const saveAccessToken = async (accessToken, clientId, expires, userId, cb) => {
  const oauthClient = await OAuthClientModel.findOne({ clientId });

  let _accessToken = (
    await OAuthAccessTokenModel.create({
      userId: userId,
      clientId: oauthClient,
      accessToken: accessToken,
      expires: expires,
    })
  ).toObject();

  if (!_accessToken.user) {
    _accessToken.user = {};
  }

  cb(false);
};

const saveRefreshToken = async (
  refreshToken,
  clientId,
  expires,
  userId,
  cb
) => {
  const oauthClient = await OAuthClientModel.findOne({ clientId });

  let _refreshToken = (
    await OAuthRefreshTokenModel.create({
      userId: userId,
      clientId: oauthClient,
      refreshToken: refreshToken,
      expires: expires,
    })
  ).toObject();

  if (!_refreshToken.user) {
    _refreshToken.user = {};
  }

  cb(false);
};

module.exports = {
  OAuthAccessTokenModel,
  OAuthRefreshTokenModel,
  OAuthClientModel,
  getAccessToken,
  getRefreshToken,
  getClient,
  grantTypeAllowed,
  saveAccessToken,
  saveRefreshToken,
};
