const oauthserver = require("oauth2-server");
const OAuthModel = require("./model");

const oauth = oauthserver({
  model: OAuthModel,
  grants: ["password", "refresh_token"],
  accessTokenLifetime: 1209600,
  refreshTokenLifetime: 2419200,
});

module.exports = {
  oauth,
};
