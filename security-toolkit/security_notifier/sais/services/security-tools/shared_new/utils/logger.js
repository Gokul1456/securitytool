const winston = require("winston");

function createLogger({ serviceName = "service", level = "info" } = {}) {
  return winston.createLogger({
    level,
    defaultMeta: { service: serviceName },
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.Console()],
  });
}

module.exports = { createLogger };

