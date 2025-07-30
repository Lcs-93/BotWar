const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot-War API is running. Try /action");
});

app.get("/", (req, res) => {
  const query = req.query;

  const board = JSON.parse(query.board); // grille du jeu
  const bot = JSON.parse(query.bot);     // position du bot

  const targetTypes = ["diamond", "trophy"];
  const botPos = { row: bot.position.row, col: bot.position.col };

  // Trouve toutes les cibles utiles
  const targets = [];
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (targetTypes.includes(board[row][col])) {
        targets.push({ row, col });
      }
    }
  }

  // Pas de cible ? On reste
  if (targets.length === 0) {
    return res.json({ move: "STAY", action: "NONE" });
  }

  // Fonction distance
  function distance(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  }

  // Cible la plus proche
  const closest = targets.reduce((prev, curr) =>
    distance(botPos, curr) < distance(botPos, prev) ? curr : prev
  );

  // Sur la cible ? Ramasse
  if (botPos.row === closest.row && botPos.col === closest.col) {
    return res.json({ move: "STAY", action: "COLLECT" });
  }

  // Sinon, se rapprocher
  let move = "STAY";
  if (botPos.row < closest.row) move = "DOWN";
  else if (botPos.row > closest.row) move = "UP";
  else if (botPos.col < closest.col) move = "RIGHT";
  else if (botPos.col > closest.col) move = "LEFT";

  return res.json({ move, action: "NONE" });
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));