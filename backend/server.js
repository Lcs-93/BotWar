const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot-War API is running. Try /action");
});

// Fonction pour calculer la distance Manhattan
function manhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// Fonction pour vérifier si une position est dans les limites de la grille
function isValidPosition(x, y, grid) {
    return x >= 0 && x < grid[0].length && y >= 0 && y < grid.length;
}

// Fonction pour vérifier si une cellule est dangereuse (contient une bombe)
function isDangerous(x, y, grid) {
    if (!isValidPosition(x, y, grid)) return true;
    
    const cell = grid[y][x];
    // Vérifier s'il y a une bombe sur cette cellule
    return cell.bombs && cell.bombs.length > 0;
}

// Fonction pour vérifier si une cellule a des points
function hasPoints(x, y, grid) {
    if (!isValidPosition(x, y, grid)) return false;
    
    const cell = grid[y][x];
    return cell.points && cell.points.length > 0;
}

app.get('/action', (req, res) => {
    try {
        const gameState = JSON.parse(req.headers['x-game-state']);
        const { x: botX, y: botY } = gameState.you;
        const grid = gameState.grid;

        console.log(`Tour ${gameState.turnNumber}: Bot à la position (${botX}, ${botY})`);

        // Vérifier d'abord si on est sur un point pour le collecter
        if (hasPoints(botX, botY, grid)) {
            console.log("Point détecté sur la position actuelle - COLLECT");
            return res.json({ move: "STAY", action: "COLLECT" });
        }

        const directions = [
            { dx: 0, dy: -1, move: 'UP' },
            { dx: 0, dy: 1, move: 'DOWN' },
            { dx: -1, dy: 0, move: 'LEFT' },
            { dx: 1, dy: 0, move: 'RIGHT' }
        ];

        // Trouver tous les points disponibles
        let allTargets = [];

        // Ajouter les points normaux
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const cell = grid[y][x];
                if (cell.points && cell.points.length > 0) {
                    const isTrophy = cell.points.some(p => p.id === 'trophy');
                    const dist = manhattanDistance(botX, botY, x, y);
                    allTargets.push({
                        x, y, dist,
                        priority: isTrophy ? 20 : 1, // Trophée = 20 points, point normal = 1 point
                        type: isTrophy ? 'trophy' : 'point'
                    });
                }
            }
        }

        // Ajouter le mega point s'il existe
        if (gameState.megaPoint) {
            const dist = manhattanDistance(botX, botY, gameState.megaPoint.x, gameState.megaPoint.y);
            allTargets.push({
                x: gameState.megaPoint.x,
                y: gameState.megaPoint.y,
                dist,
                priority: 20,
                type: 'mega'
            });
        }

        // Trier par priorité puis par distance
        allTargets.sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            return a.dist - b.dist;
        });

        console.log(`Targets trouvés: ${allTargets.length}`);
        if (allTargets.length > 0) {
            console.log(`Meilleur target: (${allTargets[0].x}, ${allTargets[0].y}) - ${allTargets[0].type} - distance: ${allTargets[0].dist}`);
        }

        let bestMove = 'STAY';

        if (allTargets.length > 0) {
            const target = allTargets[0];
            const dx = target.x - botX;
            const dy = target.y - botY;

            // Déterminer la direction prioritaire
            let possibleMoves = [];

            if (dx > 0) possibleMoves.push({ move: 'RIGHT', dx: 1, dy: 0 });
            if (dx < 0) possibleMoves.push({ move: 'LEFT', dx: -1, dy: 0 });
            if (dy > 0) possibleMoves.push({ move: 'DOWN', dx: 0, dy: 1 });
            if (dy < 0) possibleMoves.push({ move: 'UP', dx: 0, dy: -1 });

            // Trier les mouvements par efficacité (distance réduite)
            possibleMoves.sort((a, b) => {
                const newDistA = manhattanDistance(botX + a.dx, botY + a.dy, target.x, target.y);
                const newDistB = manhattanDistance(botX + b.dx, botY + b.dy, target.x, target.y);
                return newDistA - newDistB;
            });

            // Choisir le premier mouvement sûr
            for (const move of possibleMoves) {
                const newX = botX + move.dx;
                const newY = botY + move.dy;
                
                if (isValidPosition(newX, newY, grid) && !isDangerous(newX, newY, grid)) {
                    bestMove = move.move;
                    console.log(`Mouvement choisi: ${bestMove} vers (${newX}, ${newY})`);
                    break;
                }
            }

            // Si aucun mouvement sûr vers la cible, essayer les autres directions
            if (bestMove === 'STAY') {
                for (const dir of directions) {
                    const newX = botX + dir.dx;
                    const newY = botY + dir.dy;
                    
                    if (isValidPosition(newX, newY, grid) && !isDangerous(newX, newY, grid)) {
                        bestMove = dir.move;
                        console.log(`Mouvement de sécurité: ${bestMove} vers (${newX}, ${newY})`);
                        break;
                    }
                }
            }
        }

        // Déterminer l'action
        let action = "NONE";
        
        // Vérifier s'il y a des bots ennemis adjacents pour les attaquer
        for (const dir of directions) {
            const checkX = botX + dir.dx;
            const checkY = botY + dir.dy;
            
            if (isValidPosition(checkX, checkY, grid)) {
                const cell = grid[checkY][checkX];
                if (cell.bots && cell.bots.length > 0) {
                    action = "ATTACK";
                    console.log("Bot ennemi détecté - ATTACK");
                    break;
                }
            }
        }

        console.log(`Réponse finale: move=${bestMove}, action=${action}`);

        return res.json({ 
            move: bestMove, 
            action: action,
            debug: {
                position: `(${botX}, ${botY})`,
                targetsFound: allTargets.length,
                bestTarget: allTargets.length > 0 ? `(${allTargets[0].x}, ${allTargets[0].y})` : 'none'
            }
        });

    } catch (error) {
        console.error('Erreur lors du traitement de la requête:', error);
        return res.json({ move: 'STAY', action: 'NONE' });
    }
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));