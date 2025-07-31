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

// Fonction pour analyser l'environnement autour du bot
function analyzeEnvironment(botX, botY, grid) {
    const environment = {
        currentCell: grid[botY][botX],
        adjacentCells: {},
        nearbyThreats: [],
        nearbyRewards: []
    };

    const directions = [
        { dx: 0, dy: -1, name: 'UP' },
        { dx: 0, dy: 1, name: 'DOWN' },
        { dx: -1, dy: 0, name: 'LEFT' },
        { dx: 1, dy: 0, name: 'RIGHT' }
    ];

    // Analyser les cellules adjacentes
    directions.forEach(dir => {
        const newX = botX + dir.dx;
        const newY = botY + dir.dy;
        
        if (isValidPosition(newX, newY, grid)) {
            const cell = grid[newY][newX];
            environment.adjacentCells[dir.name] = {
                x: newX,
                y: newY,
                cell: cell,
                hasBomb: cell.bombs && cell.bombs.length > 0,
                hasPoint: cell.points && cell.points.length > 0,
                hasBot: cell.bots && cell.bots.length > 0,
                safety: calculateCellSafety(newX, newY, grid)
            };
        } else {
            environment.adjacentCells[dir.name] = null; // Hors limites
        }
    });

    // Analyser les menaces et récompenses dans un rayon plus large
    for (let y = Math.max(0, botY - 2); y <= Math.min(grid.length - 1, botY + 2); y++) {
        for (let x = Math.max(0, botX - 2); x <= Math.min(grid[0].length - 1, botX + 2); x++) {
            const cell = grid[y][x];
            const distance = manhattanDistance(botX, botY, x, y);
            
            if (cell.bombs && cell.bombs.length > 0) {
                environment.nearbyThreats.push({
                    x, y, distance,
                    type: 'bomb',
                    bombType: cell.bombs[0].bombType || 'proximity'
                });
            }
            
            if (cell.points && cell.points.length > 0) {
                const isTrophy = cell.points.some(p => p.id === 'trophy');
                environment.nearbyRewards.push({
                    x, y, distance,
                    type: isTrophy ? 'trophy' : 'point',
                    value: isTrophy ? 20 : 1
                });
            }
            
            if (cell.bots && cell.bots.length > 0 && distance > 0) {
                environment.nearbyThreats.push({
                    x, y, distance,
                    type: 'bot'
                });
            }
        }
    }

    return environment;
}

// Fonction pour calculer la sécurité d'une cellule
function calculateCellSafety(x, y, grid) {
    let safety = 100;
    
    // Vérifier les bombes dans un rayon de 2 cases
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            const checkX = x + dx;
            const checkY = y + dy;
            
            if (isValidPosition(checkX, checkY, grid)) {
                const cell = grid[checkY][checkX];
                if (cell.bombs && cell.bombs.length > 0) {
                    const distance = Math.abs(dx) + Math.abs(dy);
                    safety -= Math.max(0, 50 - distance * 10);
                }
            }
        }
    }
    
    return Math.max(0, safety);
}

// Fonction pour trouver le meilleur mouvement
function findBestMove(botX, botY, environment, gameState) {
    const moves = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'STAY'];
    const moveScores = {};
    
    moves.forEach(move => {
        let score = 0;
        
        if (move === 'STAY') {
            score = environment.currentCell.points ? 10 : -5;
        } else {
            const adjacent = environment.adjacentCells[move];
            if (!adjacent) {
                score = -1000; // Hors limites
            } else {
                // Score basé sur la sécurité
                score += adjacent.safety;
                
                // Bonus pour les points
                if (adjacent.hasPoint) {
                    score += 30;
                }
                
                // Malus pour les bombes
                if (adjacent.hasBomb) {
                    score -= 80;
                }
                
                // Malus pour les autres bots
                if (adjacent.hasBot) {
                    score -= 20;
                }
            }
        }
        
        moveScores[move] = score;
    });
    
    // Trouver le mouvement avec le meilleur score
    return Object.keys(moveScores).reduce((best, move) => 
        moveScores[move] > moveScores[best] ? move : best
    );
}

// Fonction pour déterminer l'action à effectuer
function determineAction(botX, botY, environment, gameState) {
    const currentCell = environment.currentCell;
    
    // Si on est sur un point, le collecter
    if (currentCell.points && currentCell.points.length > 0) {
        return 'COLLECT';
    }
    
    // Si un bot ennemi est adjacent, l'attaquer
    const adjacentBots = Object.values(environment.adjacentCells)
        .filter(cell => cell && cell.hasBot);
    if (adjacentBots.length > 0) {
        return 'ATTACK';
    }
    
    // Stratégie de placement de bombes
    if (gameState.you.bombs > 0) {
        // Placer une bombe si on est près d'un point stratégique et qu'il y a des ennemis
        const nearbyBots = environment.nearbyThreats.filter(t => t.type === 'bot' && t.distance <= 2);
        const nearbyPoints = environment.nearbyRewards.filter(r => r.distance <= 1);
        
        if (nearbyBots.length > 0 && nearbyPoints.length > 0) {
            return 'BOMB';
        }
        
        // Placer une bombe de proximité près des passages étroits
        const safeAdjacentCells = Object.values(environment.adjacentCells)
            .filter(cell => cell && cell.safety > 50).length;
        
        if (safeAdjacentCells <= 2 && nearbyBots.length > 0) {
            return 'BOMB';
        }
    }
    
    return 'NONE';
}

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