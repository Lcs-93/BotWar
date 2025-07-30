const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot-War API is running. Try /action");
});

app.get('/action', (req, res) => {
  const gameStateHeader = req.header('X-Game-State');

  if (!gameStateHeader) {
    return res.status(400).json({ error: 'Missing X-Game-State header.' });
  }

  // Tu peux ici parser le header si besoin
  const gameState = JSON.parse(gameStateHeader);

  // Ta logique de bot ici (à améliorer selon les cas)
  const response = {
    move: "UP",
    action: "COLLECT"
  };

  res.json(response);
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));