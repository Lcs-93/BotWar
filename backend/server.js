const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot-War API is running. Try /action");
});

app.get("/action", (req, res) => {
  console.log("=== Nouvelle requête reçue ===");
  console.log("Query params :", req.query);

  // Exemple de réponse minimale
  res.json({ move: "STAY", action: "NONE" });
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));