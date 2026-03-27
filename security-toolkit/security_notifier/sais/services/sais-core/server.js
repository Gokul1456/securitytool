const { createApp } = require("./app");

const { app, config, logger } = createApp();

const port = Number(process.env.PORT || config.PORT || 4001);
app.listen(port, "0.0.0.0", () => logger.info("sais_core_listening", { port, env: config.NODE_ENV }));

