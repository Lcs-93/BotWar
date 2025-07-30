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
  const board = JSON.parse(req.query.board);
  const bot = JSON.parse(req.query.bot);

  const botPos = { row: bot.position.row, col: bot.position.col };
  const targetTypes = ["diamond", "trophy"];

  // Filtrer les cibles sauf si déjà sur la position
  const targets = [];
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const cell = board[row][col];
      if (targetTypes.includes(cell)) {
        // Exclut la case si le bot est déjà dessus
        if (row !== botPos.row || col !== botPos.col) {
          targets.push({ row, col });
        }
      }
    }
  }

  // Si y a une cible sur la position actuelle → collect
  if (targetTypes.includes(board[botPos.row][botPos.col])) {
    return res.json({ move: "STAY", action: "COLLECT" });
  }

  // Si aucune autre cible, rester
  if (targets.length === 0) {
    return res.json({ move: "STAY", action: "NONE" });
  }

  // Trouver la plus proche
  function distance(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  }

  const closest = targets.reduce((prev, curr) =>
    distance(botPos, curr) < distance(botPos, prev) ? curr : prev
  );

  // Calculer le mouvement
  let move = "STAY";
  if (botPos.row < closest.row) move = "DOWN";
  else if (botPos.row > closest.row) move = "UP";
  else if (botPos.col < closest.col) move = "RIGHT";
  else if (botPos.col > closest.col) move = "LEFT";

  return res.json({ move, action: "NONE" });
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));