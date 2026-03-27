const { randomUUID } = require("crypto");

function requestContext() {
  return (req, res, next) => {
    const header = req.header("x-request-id");
    req.id = header || randomUUID();
    res.setHeader("x-request-id", req.id);
    next();
  };
}

module.exports = { requestContext };

