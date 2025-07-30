const express = require("express");
const port = process.env.PORT || 3000;
const app = express();


app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot-War API is running. Try /action");
});

app.get("/action", (req, res) => {

  console.log("GET /action called");
  console.log("req.query :", req.query);
  console.log("req.body  :", req.body); // souvent vide
  // Réponse par défaut
  res.json({
    move: "STAY",
    action: "NONE"
  });
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));