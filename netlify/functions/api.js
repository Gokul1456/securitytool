const serverless = require('serverless-http');
const app = require('../../sais_gateway_demo_mock.js');

// Export the serverless function
module.exports.handler = serverless(app);
