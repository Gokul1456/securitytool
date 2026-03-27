const app = require("./app_run");

const port = Number(process.env.PORT || 4002);
app.listen(port, "0.0.0.0", () => {
    console.log(`Login Notifier service listening on port ${port}`);
});
