import { getConfig } from "../config/config";
import { log } from "../libs/logger";
const logger_1 = require("../libs/logger");

logger_1.log.info("js file logger1 authurl fetched", {
  customerData: String(getConfig()?.authUrl),
});
log.info("js file logInfo apiUrl fetched", {
  customerDataID: String(getConfig()?.apiUrl),
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectApiRoot = void 0;
exports.getApiRoot = getApiRoot;
const sdk_client_v2_1 = require("@commercetools/sdk-client-v2");
const platform_sdk_1 = require("@commercetools/platform-sdk");
const projectKey = String(getConfig()?.projectKey);
const authUrl = String(getConfig()?.authUrl);
const apiUrl = String(getConfig()?.apiUrl);
const clientId = String(getConfig()?.clientId);
const clientSecret = String(getConfig()?.clientSecret);
const authMiddlewareOptions = {
    host:  String(getConfig()?.authUrl),
    projectKey,
    credentials: {
        clientId:  String(getConfig()?.clientId),
        clientSecret:  String(getConfig()?.clientSecret),
    },
};
const httpMiddlewareOptions = {
    host: String(getConfig()?.apiUrl),
};
const ctpClient = new sdk_client_v2_1.ClientBuilder()
    .withClientCredentialsFlow(authMiddlewareOptions)
    .withHttpMiddleware(httpMiddlewareOptions)
    .build();
// THIS is your "projectApiRoot"
exports.projectApiRoot = (0, platform_sdk_1.createApiBuilderFromCtpClient)(ctpClient)
    .withProjectKey({ projectKey });
function getApiRoot() {
    const client = new sdk_client_v2_1.ClientBuilder()
        .withProjectKey(projectKey)
        .withClientCredentialsFlow({
        host: authUrl,
        projectKey,
        credentials: { clientId, clientSecret },
        fetch, // global fetch in Node 18+
    })
        .withHttpMiddleware({ host: apiUrl, fetch })
        .build();
    // Must scope API to project key to access resources like orders()
    return (0, platform_sdk_1.createApiBuilderFromCtpClient)(client).withProjectKey({ projectKey });
}
