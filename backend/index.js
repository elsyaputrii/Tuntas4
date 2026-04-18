const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Backend jalan 🚀");
});

app.listen(5000, () => {
  console.log("Server jalan di port 5000");
});