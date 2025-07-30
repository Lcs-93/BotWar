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
  try {
    const query = req.query;

    const board = JSON.parse(query.board); // Grille du jeu
    const bot = JSON.parse(query.bot);     // Position du bot

    const targetTypes = ["diamond", "trophy"];
    const botPos = { row: bot.position.row, col: bot.position.col };

    // Cherche toutes les cibles
    const targets = [];
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (targetTypes.includes(board[row][col])) {
          targets.push({ row, col });
        }
      }
    }

    // Si pas de cibles visibles
    if (targets.length === 0) {
      return res.json({ move: "STAY", action: "NONE" });
    }

    // Calcule la distance entre deux cases
    function distance(a, b) {
      return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
    }

    // Trouve la cible la plus proche
    const closest = targets.reduce((prev, curr) =>
      distance(botPos, curr) < distance(botPos, prev) ? curr : prev
    );

    // Si le bot est sur une cible : COLLECT
    if (
      board[botPos.row][botPos.col] === "diamond" ||
      board[botPos.row][botPos.col] === "trophy"
    ) {
      return res.json({ move: "STAY", action: "COLLECT" });
    }

    // Sinon, on bouge vers la cible la plus proche
    let move = "STAY";

    if (botPos.row < closest.row) move = "DOWN";
    else if (botPos.row > closest.row) move = "UP";
    else if (botPos.col < closest.col) move = "RIGHT";
    else if (botPos.col > closest.col) move = "LEFT";

    return res.json({ move, action: "NONE" });
  } catch (error) {
    console.error("Erreur dans la requête :", error.message);
    return res.status(500).send("Erreur serveur : " + error.message);
  }
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));