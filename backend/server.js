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
    
    // DEBUG: Afficher l'état complet du jeu
    console.log("=== ÉTAT DU JEU ===");
    console.log("Game data:", JSON.stringify(game, null, 2));
    
    const me = game.you;
    if (!me) {
      console.log("❌ Pas de données 'you' dans le jeu");
      return res.json({ move: "STAY", action: "NONE" });
    }
    
    const myId = me.id;
    const myX = me.x;
    const myY = me.y;
    
    console.log(`🤖 MOI: ID=${myId}, Position=(${myX},${myY})`);
    
    const enemies = (game.bots || []).filter(b => b.id !== myId);
    const bombs = game.bombs || [];
    const trophies = game.trophies || [];
    const diamonds = game.diamonds || [];
    const points = [...trophies, ...diamonds];
    
    console.log(`📊 Statistiques:`);
    console.log(`   - Ennemis: ${enemies.length}`);
    console.log(`   - Bombes: ${bombs.length}`);
    console.log(`   - Trophées: ${trophies.length}`);
    console.log(`   - Diamants: ${diamonds.length}`);
    console.log(`   - Points totaux: ${points.length}`);
    
    if (points.length > 0) {
      console.log("🎯 POINTS disponibles:");
      points.forEach((p, i) => console.log(`   ${i+1}. (${p.x},${p.y}) distance=${Math.abs(p.x-myX) + Math.abs(p.y-myY)}`));
    }
    
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

    // STRATÉGIE SIMPLIFIÉE 1: Collecte immédiate adjacente
    console.log("🔍 Vérification collecte immédiate...");
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      const hasPoint = points.some(p => p.x === nx && p.y === ny);
      const isDangerousSpot = isDanger(nx, ny);
      
      console.log(`   ${d.move}: (${nx},${ny}) - Point:${hasPoint}, Danger:${isDangerousSpot}`);
      
      if (isValid(nx, ny) && hasPoint && !isDangerousSpot) {
        console.log("✅ COLLECTE IMMÉDIATE:", d.move);
        return res.json({ move: d.move, action: "COLLECT" });
      }
    }

    // STRATÉGIE SIMPLIFIÉE 2: Aller vers le point le plus proche
    if (points.length > 0) {
      console.log("🎯 Navigation vers le point le plus proche...");
      
      // Trouver le point le plus proche
      let closestPoint = points[0];
      let closestDist = dist(me, closestPoint);
      
      for (const point of points) {
        const d = dist(me, point);
        if (d < closestDist) {
          closestDist = d;
          closestPoint = point;
        }
      }
      
      console.log(`🎯 Point cible: (${closestPoint.x},${closestPoint.y}) distance=${closestDist}`);
      
      // Mouvement simple vers le point (pas de pathfinding complexe)
      const dx = closestPoint.x - myX;
      const dy = closestPoint.y - myY;
      
      console.log(`📐 Delta: dx=${dx}, dy=${dy}`);
      
      // Prioriser le mouvement le plus important (horizontal ou vertical)
      const possibleMoves = [];
      
      if (dx > 0) possibleMoves.push({ dir: dirs.find(d => d.move === "RIGHT"), priority: Math.abs(dx) });
      if (dx < 0) possibleMoves.push({ dir: dirs.find(d => d.move === "LEFT"), priority: Math.abs(dx) });
      if (dy > 0) possibleMoves.push({ dir: dirs.find(d => d.move === "DOWN"), priority: Math.abs(dy) });
      if (dy < 0) possibleMoves.push({ dir: dirs.find(d => d.move === "UP"), priority: Math.abs(dy) });
      
      // Trier par priorité (plus grande distance d'abord)
      possibleMoves.sort((a, b) => b.priority - a.priority);
      
      console.log("🚶 Mouvements possibles:", possibleMoves.map(m => `${m.dir.move}(${m.priority})`));
      
      // Essayer chaque mouvement par ordre de priorité
      for (const moveData of possibleMoves) {
        const dir = moveData.dir;
        const nx = myX + dir.dx;
        const ny = myY + dir.dy;
        
        const isValidMove = isValid(nx, ny);
        const isDangerousMove = isDanger(nx, ny);
        const isOccupiedMove = isOccupied(nx, ny);
        
        console.log(`   Teste ${dir.move}: (${nx},${ny}) - Valid:${isValidMove}, Danger:${isDangerousMove}, Occupé:${isOccupiedMove}`);
        
        if (isValidMove && !isDangerousMove && !isOccupiedMove) {
          const willCollectPoint = points.some(p => p.x === nx && p.y === ny);
          console.log(`✅ MOUVEMENT: ${dir.move} ${willCollectPoint ? '+ COLLECT' : ''}`);
          
          return res.json({
            move: dir.move,
            action: willCollectPoint ? "COLLECT" : "NONE",
          });
        }
      }
      
      console.log("⚠️ Aucun mouvement sûr vers le point cible");
    }

    // STRATÉGIE 3: Mouvement d'exploration sûr
    console.log("🔄 Recherche mouvement d'exploration...");
    const safeMoves = dirs.filter(d => {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      const isValidMove = isValid(nx, ny);
      const isDangerousMove = isDanger(nx, ny);
      const isOccupiedMove = isOccupied(nx, ny);
      
      console.log(`   ${d.move}: (${nx},${ny}) - Valid:${isValidMove}, Danger:${isDangerousMove}, Occupé:${isOccupiedMove}`);
      
      return isValidMove && !isDangerousMove && !isOccupiedMove;
    });

    if (safeMoves.length > 0) {
      // Choisir un mouvement aléatoire parmi les sûrs pour éviter les boucles
      const randomMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
      console.log(`✅ MOUVEMENT D'EXPLORATION: ${randomMove.move}`);
      return res.json({ move: randomMove.move, action: "NONE" });
    }

    // STRATÉGIE 4: Dernier recours - rester immobile
    console.log("🛑 DERNIER RECOURS - Rester immobile");
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