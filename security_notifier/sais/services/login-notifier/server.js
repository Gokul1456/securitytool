require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 4002;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Login Notifier toolkit running at http://localhost:${PORT}`);
});
