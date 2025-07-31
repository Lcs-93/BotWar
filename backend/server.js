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
    return cell.bombs && cell.bombs.length > 0;
}

// Fonction pour vérifier si une cellule a des points
function hasPoints(x, y, grid) {
    if (!isValidPosition(x, y, grid)) return false;
    
    const cell = grid[y][x];
    return cell.points && cell.points.length > 0;
}

// Fonction pour obtenir la valeur d'un point
function getPointValue(x, y, grid) {
    if (!isValidPosition(x, y, grid)) return 0;
    
    const cell = grid[y][x];
    if (!cell.points || cell.points.length === 0) return 0;
    
    // Vérifier s'il y a un trophée
    const hasTrophy = cell.points.some(p => p.id === 'trophy');
    return hasTrophy ? 20 : 1;
}

// Fonction pour trouver le meilleur chemin avec collecte de points intermédiaires
function findBestPath(botX, botY, targetX, targetY, grid) {
    const path = [];
    let currentX = botX;
    let currentY = botY;
    let totalValue = 0;
    
    while (currentX !== targetX || currentY !== targetY) {
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        
        let nextX = currentX;
        let nextY = currentY;
        
        // Prioriser le mouvement qui réduit le plus la distance
        if (Math.abs(dx) > Math.abs(dy)) {
            nextX = currentX + (dx > 0 ? 1 : -1);
        } else if (dy !== 0) {
            nextY = currentY + (dy > 0 ? 1 : -1);
        }
        
        // Vérifier si le mouvement est sûr
        if (isDangerous(nextX, nextY, grid)) {
            // Essayer l'autre direction
            if (Math.abs(dx) > Math.abs(dy)) {
                nextX = currentX;
                nextY = currentY + (dy > 0 ? 1 : -1);
            } else {
                nextX = currentX + (dx > 0 ? 1 : -1);
                nextY = currentY;
            }
        }
        
        // Si toujours dangereux, arrêter
        if (isDangerous(nextX, nextY, grid)) {
            break;
        }
        
        // Ajouter la valeur du point s'il y en a un
        const pointValue = getPointValue(nextX, nextY, grid);
        totalValue += pointValue;
        
        path.push({ x: nextX, y: nextY, value: pointValue });
        currentX = nextX;
        currentY = nextY;
    }
    
    return { path, totalValue };
}

app.get('/action', (req, res) => {
    try {
        const gameState = JSON.parse(req.headers['x-game-state']);
        const { x: botX, y: botY } = gameState.you;
        const grid = gameState.grid;

        console.log(`\n=== Tour ${gameState.turnNumber} ===`);
        console.log(`Bot position: (${botX}, ${botY})`);

        // PRIORITÉ 1: Vérifier si on est sur un point pour le collecter
        const currentCell = grid[botY][botX];
        const hasPointHere = currentCell.points && currentCell.points.length > 0;
        
        if (hasPointHere) {
            const pointValue = getPointValue(botX, botY, grid);
            console.log(`COLLECTE! Point détecté à la position actuelle - Valeur: ${pointValue}`);
            return res.json({ 
                move: "STAY", 
                action: "COLLECT",
                debug: {
                    position: `(${botX}, ${botY})`,
                    action: "Collecting point",
                    pointValue: pointValue
                }
            });
        }

        const directions = [
            { dx: 0, dy: -1, move: 'UP' },
            { dx: 0, dy: 1, move: 'DOWN' },
            { dx: -1, dy: 0, move: 'LEFT' },
            { dx: 1, dy: 0, move: 'RIGHT' }
        ];

        // PRIORITÉ 2: Trouver tous les objectifs disponibles
        let allTargets = [];

        // Ajouter les points de la grille
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const cell = grid[y][x];
                if (cell.points && cell.points.length > 0) {
                    const isTrophy = cell.points.some(p => p.id === 'trophy');
                    const dist = manhattanDistance(botX, botY, x, y);
                    const value = isTrophy ? 20 : 1;
                    
                    allTargets.push({
                        x, y, dist, value,
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
                dist, value: 20, type: 'mega'
            });
        }

        // Trier par valeur puis par distance
        allTargets.sort((a, b) => {
            if (a.value !== b.value) return b.value - a.value; // Plus haute valeur d'abord
            return a.dist - b.dist; // Plus proche d'abord
        });

        console.log(`Objectifs trouvés: ${allTargets.length}`);
        allTargets.forEach((target, i) => {
            if (i < 3) { // Afficher les 3 premiers
                console.log(`  ${i+1}. (${target.x}, ${target.y}) - ${target.type} - valeur: ${target.value} - distance: ${target.dist}`);
            }
        });

        let bestMove = 'STAY';
        let action = "NONE";

        // PRIORITÉ 3: Attaquer les bots ennemis adjacents
        for (const dir of directions) {
            const checkX = botX + dir.dx;
            const checkY = botY + dir.dy;
            
            if (isValidPosition(checkX, checkY, grid)) {
                const cell = grid[checkY][checkX];
                if (cell.bots && cell.bots.length > 0) {
                    action = "ATTACK";
                    console.log(`Bot ennemi détecté à (${checkX}, ${checkY}) - ATTACK`);
                    break;
                }
            }
        }

        // PRIORITÉ 4: Se déplacer vers le meilleur objectif
        if (allTargets.length > 0) {
            const target = allTargets[0];
            console.log(`Cible choisie: (${target.x}, ${target.y}) - ${target.type} - valeur: ${target.value}`);

            // Calculer le chemin optimal avec collecte intermédiaire
            const pathInfo = findBestPath(botX, botY, target.x, target.y, grid);
            console.log(`Chemin calculé - Valeur totale: ${pathInfo.totalValue}`);

            const dx = target.x - botX;
            const dy = target.y - botY;

            // Déterminer les mouvements possibles vers la cible
            let possibleMoves = [];

            if (dx > 0) possibleMoves.push({ move: 'RIGHT', dx: 1, dy: 0 });
            if (dx < 0) possibleMoves.push({ move: 'LEFT', dx: -1, dy: 0 });
            if (dy > 0) possibleMoves.push({ move: 'DOWN', dx: 0, dy: 1 });
            if (dy < 0) possibleMoves.push({ move: 'UP', dx: 0, dy: -1 });

            // Choisir le mouvement le plus efficace et sûr
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
                console.log("Aucun mouvement sûr vers la cible, recherche d'alternatives...");
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

        // PRIORITÉ 5: Stratégie de bombes intelligente
        if (action === "NONE" && gameState.you.bombs > 0) {
            // Placer une bombe si on peut piéger un ennemi ou protéger un point important
            for (const dir of directions) {
                const checkX = botX + dir.dx;
                const checkY = botY + dir.dy;
                
                if (isValidPosition(checkX, checkY, grid)) {
                    const cell = grid[checkY][checkX];
                    // Placer une bombe près d'un bot ennemi (à 2 cases)
                    if (cell.bots && cell.bots.length > 0) {
                        action = "BOMB";
                        console.log(`Placement de bombe stratégique près d'un ennemi`);
                        break;
                    }
                }
            }

            // Ou placer une bombe sur un point de faible valeur pour bloquer les ennemis
            if (action === "NONE" && allTargets.length > 3) {
                const lowValueTargets = allTargets.filter(t => t.value === 1 && t.dist <= 3);
                if (lowValueTargets.length > 0) {
                    action = "BOMB";
                    console.log(`Placement de bombe défensive sur un point de faible valeur`);
                }
            }
        }

        console.log(`Décision finale: move=${bestMove}, action=${action}`);

        return res.json({ 
            move: bestMove, 
            action: action,
            debug: {
                position: `(${botX}, ${botY})`,
                targetsFound: allTargets.length,
                bestTarget: allTargets.length > 0 ? `(${allTargets[0].x}, ${allTargets[0].y}) - ${allTargets[0].type}` : 'none',
                hasPointHere: hasPointHere
            }
        });

    } catch (error) {
        console.error('Erreur lors du traitement de la requête:', error);
        return res.json({ move: 'STAY', action: 'NONE' });
    }
});

app.listen(port , () => console.log("Le serveur tourne sur le port " + port));