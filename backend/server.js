const express = require("express");
const cors = require("cors");
const path = require("path");

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Dernière commande envoyée manuellement
let lastCommand = {
  move: "STAY",
  action: "NONE",
};

// Endpoint /action
app.get("/action", (req, res) => {
  const { move, action, bombType } = req.query;

  // Si des paramètres sont fournis, c’est une confirmation manuelle
  if (move && action) {
    lastCommand = { move, action };

    if (action === "BOMB") {
      lastCommand.bombType = bombType || "proximity";
    } else {
      delete lastCommand.bombType;
    }

    console.log("✅ Command confirmed:", lastCommand);
  } else {
    console.log("📤 Sending current command:", lastCommand);
  }

  res.json(lastCommand);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`🎮 Bot-War server running on port ${port}`);
  });
}

module.exports = app;
