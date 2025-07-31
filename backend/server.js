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
    const game = JSON.parse(req.headers["x-game-state"]);
    const me = game.you;
    const myId = me.id;
    const myX = me.x;
    const myY = me.y;
    
    const enemies = (game.bots || []).filter(b => b.id !== myId);
    const bombs = game.bombs || [];
    const trophies = game.trophies || [];
    const diamonds = game.diamonds || [];
    const points = [...trophies, ...diamonds];
    
    const myBombs = bombs.filter(b => b.owner === myId).length;
    const gridWidth = game.width || 5;
    const gridHeight = game.height || 5;

    // Fonctions utilitaires
    const isValid = (x, y) => x >= 0 && y >= 0 && x < gridWidth && y < gridHeight;
    const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    
    const dirs = [
      { dx: 0, dy: -1, move: "UP" },
      { dx: 0, dy: 1, move: "DOWN" },
      { dx: -1, dy: 0, move: "LEFT" },
      { dx: 1, dy: 0, move: "RIGHT" },
    ];

    // Détection des dangers (bombes + ennemis proches)
    const isDanger = (x, y) => {
      // Bombes de proximité
      const proximityBombs = bombs.filter(b => b.bombType === "proximity" || !b.bombType);
      if (proximityBombs.some(b => dist({ x, y }, b) <= 1)) return true;
      
      // Bombes timer (danger dans 2 tours)
      const timerBombs = bombs.filter(b => b.bombType === "timer");
      if (timerBombs.some(b => dist({ x, y }, b) <= 1 && b.timer <= 2)) return true;
      
      // Bombes statiques (obstacles permanents)
      const staticBombs = bombs.filter(b => b.bombType === "static");
      if (staticBombs.some(b => x === b.x && y === b.y)) return true;
      
      return false;
    };

    const isEnemy = (x, y) => enemies.some(e => e.x === x && e.y === y);
    
    const isOccupied = (x, y) => {
      return isEnemy(x, y) || bombs.some(b => b.x === x && b.y === y);
    };

    // Algorithme A* pour pathfinding intelligent
    const findPath = (start, goal) => {
      const openSet = [{ ...start, g: 0, h: dist(start, goal), f: dist(start, goal), parent: null }];
      const closedSet = new Set();
      
      while (openSet.length > 0) {
        // Trouver le noeud avec le plus petit f
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        
        const currentKey = `${current.x},${current.y}`;
        if (closedSet.has(currentKey)) continue;
        closedSet.add(currentKey);
        
        // Arrivé au goal
        if (current.x === goal.x && current.y === goal.y) {
          const path = [];
          let node = current;
          while (node.parent) {
            path.unshift({ x: node.x, y: node.y });
            node = node.parent;
          }
          return path;
        }
        
        // Explorer les voisins
        for (const dir of dirs) {
          const nx = current.x + dir.dx;
          const ny = current.y + dir.dy;
          const neighborKey = `${nx},${ny}`;
          
          if (!isValid(nx, ny) || closedSet.has(neighborKey) || isDanger(nx, ny) || isOccupied(nx, ny)) {
            continue;
          }
          
          const g = current.g + 1;
          const h = dist({ x: nx, y: ny }, goal);
          const f = g + h;
          
          const existing = openSet.find(n => n.x === nx && n.y === ny);
          if (!existing || g < existing.g) {
            if (existing) {
              existing.g = g;
              existing.f = f;
              existing.parent = current;
            } else {
              openSet.push({ x: nx, y: ny, g, h, f, parent: current });
            }
          }
        }
      }
      
      return null; // Pas de chemin trouvé
    };

    // Évaluer la valeur d'un point (distance + valeur intrinsèque)
    const evaluatePoint = (point) => {
      const distance = dist(me, point);
      const isDiamond = diamonds.some(d => d.x === point.x && d.y === point.y);
      const baseValue = isDiamond ? 20 : 10; // Diamants plus précieux
      
      // Malus si des ennemis sont proches du point
      const enemyNearby = enemies.some(e => dist(e, point) <= 2);
      const enemyMalus = enemyNearby ? 5 : 0;
      
      return baseValue - distance - enemyMalus;
    };

    // STRATÉGIE 1: Collecte immédiate adjacente
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isValid(nx, ny) && points.some(p => p.x === nx && p.y === ny) && !isDanger(nx, ny)) {
        console.log("Collecte immédiate:", d.move);
        return res.json({ move: d.move, action: "COLLECT" });
      }
    }

    // STRATÉGIE 2: Attaque adjacente
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isEnemy(nx, ny) && !isDanger(nx, ny)) {
        console.log("Attaque:", d.move);
        return res.json({ move: d.move, action: "ATTACK" });
      }
    }

    // STRATÉGIE 3: Poser une bombe stratégique
    const shouldBomb = () => {
      if (myBombs >= 3) return false;
      
      // Bomber si ennemi très proche
      const closeEnemies = enemies.filter(e => dist(me, e) <= 2);
      if (closeEnemies.length > 0) return true;
      
      // Bomber près d'un point pour le protéger/bloquer les ennemis
      const nearbyPoints = points.filter(p => dist(me, p) <= 2);
      const enemiesNearPoints = enemies.filter(e => 
        nearbyPoints.some(p => dist(e, p) <= 2)
      );
      
      return enemiesNearPoints.length > 0;
    };

    if (shouldBomb()) {
      console.log("Pose bombe stratégique");
      return res.json({ move: "STAY", action: "BOMB", bombType: "proximity" });
    }

    // STRATÉGIE 4: Navigation intelligente vers le meilleur point
    if (points.length > 0) {
      // Évaluer et trier les points par valeur
      const evaluatedPoints = points
        .map(p => ({ ...p, value: evaluatePoint(p) }))
        .sort((a, b) => b.value - a.value);
      
      console.log("Points évalués:", evaluatedPoints.map(p => 
        `(${p.x},${p.y}) val:${p.value}`
      ));
      
      // Essayer de trouver un chemin vers les meilleurs points
      for (const targetPoint of evaluatedPoints.slice(0, 3)) {
        const path = findPath(me, targetPoint);
        
        if (path && path.length > 0) {
          const nextStep = path[0];
          const direction = dirs.find(d => 
            myX + d.dx === nextStep.x && myY + d.dy === nextStep.y
          );
          
          if (direction) {
            const isTargetPoint = points.some(p => p.x === nextStep.x && p.y === nextStep.y);
            console.log("Navigation vers:", targetPoint, "prochaine étape:", nextStep);
            
            return res.json({
              move: direction.move,
              action: isTargetPoint ? "COLLECT" : "NONE",
            });
          }
        }
      }
    }

    // STRATÉGIE 5: Éviter les dangers et explorer
    const safeMoves = dirs.filter(d => {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      return isValid(nx, ny) && !isDanger(nx, ny) && !isOccupied(nx, ny);
    });

    if (safeMoves.length > 0) {
      // Préférer se rapprocher du centre ou des points
      let bestMove = safeMoves[0];
      let bestScore = -1000;
      
      for (const move of safeMoves) {
        const nx = myX + move.dx;
        const ny = myY + move.dy;
        
        // Score basé sur la proximité aux points et position centrale
        let score = 0;
        const centerX = Math.floor(gridWidth / 2);
        const centerY = Math.floor(gridHeight / 2);
        
        // Bonus pour se rapprocher du centre
        const centerDist = dist({ x: nx, y: ny }, { x: centerX, y: centerY });
        score += (gridWidth + gridHeight - centerDist) * 2;
        
        // Bonus pour se rapprocher des points
        if (points.length > 0) {
          const closestPointDist = Math.min(...points.map(p => dist({ x: nx, y: ny }, p)));
          score += (gridWidth + gridHeight - closestPointDist) * 3;
        }
        
        // Malus pour se rapprocher des ennemis (sauf si on peut attaquer)
        for (const enemy of enemies) {
          const enemyDist = dist({ x: nx, y: ny }, enemy);
          if (enemyDist === 1) {
            score += 10; // Bonus si on peut attaquer au prochain tour
          } else if (enemyDist <= 3) {
            score -= 5; // Malus pour être trop proche
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      
      console.log("Mouvement d'exploration:", bestMove.move, "score:", bestScore);
      return res.json({ move: bestMove.move, action: "NONE" });
    }

    // STRATÉGIE 6: Dernier recours - rester immobile
    console.log("Aucun mouvement sûr - reste immobile");
    return res.json({ move: "STAY", action: "NONE" });
    
  } catch (e) {
    console.error("Erreur:", e);
    return res.json({ move: "STAY", action: "NONE" });
  }
});

app.listen(port, () => {
  console.log(`🤖 Bot-War Server intelligent démarré sur le port ${port}`);
  console.log("Stratégies activées:");
  console.log("- Pathfinding A*");
  console.log("- Évaluation intelligente des points");
  console.log("- Gestion des dangers avancée");
  console.log("- Placement de bombes stratégique");
});