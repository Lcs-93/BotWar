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
    try {
        const gameState = JSON.parse(req.headers['x-game-state']);
        const { x: botX, y: botY } = gameState.you;
        const grid = gameState.grid;

        // Analyser l'environnement
        const environment = analyzeEnvironment(botX, botY, grid);
        
        // Déterminer le meilleur mouvement
        let move = findBestMove(botX, botY, environment, gameState);
        
        // Si aucun mouvement sûr n'est trouvé, chercher le point le plus proche (comportement de fallback)
        if (move === 'STAY' && !environment.currentCell.points) {
            let target = null;
            let minDist = Infinity;

            // Prioriser les trophées, puis les points normaux
            const allRewards = [...environment.nearbyRewards];
            if (gameState.megaPoint) {
                allRewards.push({
                    x: gameState.megaPoint.x,
                    y: gameState.megaPoint.y,
                    distance: manhattanDistance(botX, botY, gameState.megaPoint.x, gameState.megaPoint.y),
                    type: 'mega',
                    value: 20
                });
            }

            // Trier par valeur puis par distance
            allRewards.sort((a, b) => {
                if (a.value !== b.value) return b.value - a.value;
                return a.distance - b.distance;
            });

            if (allRewards.length > 0) {
                target = allRewards[0];
                const dx = target.x - botX;
                const dy = target.y - botY;

                if (Math.abs(dx) > Math.abs(dy)) {
                    move = dx > 0 ? 'RIGHT' : 'LEFT';
                } else if (dy !== 0) {
                    move = dy > 0 ? 'DOWN' : 'UP';
                }

                // Vérifier que le mouvement est sûr
                const targetCell = environment.adjacentCells[move];
                if (targetCell && targetCell.safety < 30) {
                    move = 'STAY'; // Rester sur place si c'est dangereux
                }
            }
        }
        
        // Déterminer l'action
        const action = determineAction(botX, botY, environment, gameState);
        
        // Log pour debug (optionnel)
        console.log(`Tour ${gameState.turnNumber}: Position (${botX},${botY}) -> Mouvement: ${move}, Action: ${action}`);
        
        return res.json({ 
            move, 
            action,
            // Informations supplémentaires pour le debug
            debug: {
                currentSafety: environment.currentCell ? calculateCellSafety(botX, botY, grid) : 0,
                threatsNearby: environment.nearbyThreats.length,
                rewardsNearby: environment.nearbyRewards.length
            }
        });

    } catch (error) {
        console.error('Erreur lors du traitement de la requête:', error);
        return res.json({ move: 'STAY', action: 'NONE' });
    }
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));