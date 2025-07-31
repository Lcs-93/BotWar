const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot-War API is running. Try /action");
});

// API /action : renvoie l'action du bot en fonction de l'état du jeu fourni
app.get('/action', (req, res) => {
  // Récupération de l'état du jeu à partir de l'en-tête 'x-game-state'
  const gameStateHeader = req.headers['x-game-state'];
  if (!gameStateHeader) {
    return res.status(400).send('Missing game state');
  }

  let state;
  try {
    state = JSON.parse(gameStateHeader);
  } catch (error) {
    console.error('Invalid game state JSON:', error);
    return res.status(400).send('Invalid game state format');
  }

  // Extraction des coordonnées et de l'identifiant du bot contrôlé (le nôtre)
  let myX, myY, myId;
  if (state.you) {
    myX = state.you.x;
    myY = state.you.y;
    myId = state.you.id || state.you.name || state.you.botId;
  } else if (state.me) {
    myX = state.me.x;
    myY = state.me.y;
    myId = state.me.id;
  } else if (state.player) {
    myX = state.player.x;
    myY = state.player.y;
    myId = state.player.id;
  } else if (state.bot) {
    // Si l'état possède une propriété 'bot' unique
    myX = state.bot.x;
    myY = state.bot.y;
    myId = state.bot.id;
  } else if (state.bots) {
    // Si plusieurs bots sont listés, on identifie le nôtre par un identifiant connu
    if (state.id || state.botId) {
      const id = state.id || state.botId;
      const me = state.bots.find(b => b.id === id || b.name === id);
      if (me) {
        myX = me.x;
        myY = me.y;
        myId = me.id;
      }
    }
    // Si on n'a toujours pas trouvé, on suppose que le premier bot de la liste est le nôtre
    if (myX === undefined && state.bots.length > 0) {
      myX = state.bots[0].x;
      myY = state.bots[0].y;
      myId = state.bots[0].id || 0;
    }
  }

  // Construction de la liste des autres bots (ennemis) à éviter
  let enemies = [];
  if (state.bots) {
    enemies = state.bots.filter(bot => (myId !== undefined ? bot.id !== myId : true));
  }
  if (state.enemies) {
    // Si l'état fournit directement une liste d'ennemis
    enemies = state.enemies;
  }

  // Récupération des positions des trophées (valeur 20) et des diamants (valeur 1)
  let trophies = [];
  let diamonds = [];
  if (state.objects) {
    if (state.objects.trophies) trophies = state.objects.trophies.map(obj => ({ x: obj.x, y: obj.y }));
    if (state.objects.diamonds) diamonds = state.objects.diamonds.map(obj => ({ x: obj.x, y: obj.y }));
  } else {
    if (state.trophies) trophies = state.trophies.map(obj => ({ x: obj.x, y: obj.y }));
    if (state.diamonds) diamonds = state.diamonds.map(obj => ({ x: obj.x, y: obj.y }));
  }

  // Récupération des bombes présentes sur le terrain
  let bombs = [];
  if (state.bombs) {
    bombs = state.bombs.map(b => ({
      x: b.x,
      y: b.y,
      owner: b.owner || b.ownerId || b.playerId || b.botId || null,
      type: b.type || b.bombType || null
    }));
  }

  // Calcul du nombre de bombes déjà posées par notre bot (pour respecter la limite de 3)
  let myBombsCount = 0;
  if (myId !== undefined) {
    myBombsCount = bombs.filter(b => b.owner === myId).length;
  } else if (state.you && state.you.bombsPlaced !== undefined) {
    myBombsCount = state.you.bombsPlaced;
  }

  // Détermination des dimensions du plateau (si fournies, sinon estimation)
  let width = null, height = null;
  if (state.width && state.height) {
    width = state.width;
    height = state.height;
  } else if (state.columns && state.rows) {
    width = state.columns;
    height = state.rows;
  } else if (state.boardWidth && state.boardHeight) {
    width = state.boardWidth;
    height = state.boardHeight;
  } else if (state.grid) {
    height = state.grid.length;
    width = state.grid[0] ? state.grid[0].length : 0;
  } else if (state.map) {
    height = state.map.length;
    width = state.map[0] ? state.map[0].length : 0;
  }
  if (!width || !height) {
    // Si la taille n'est pas disponible, on estime en fonction des positions max visibles
    let maxX = 0, maxY = 0;
    const allPositions = [];
    enemies.forEach(e => allPositions.push({ x: e.x, y: e.y }));
    bombs.forEach(b => allPositions.push({ x: b.x, y: b.y }));
    trophies.forEach(t => allPositions.push({ x: t.x, y: t.y }));
    diamonds.forEach(d => allPositions.push({ x: d.x, y: d.y }));
    allPositions.forEach(pos => {
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y > maxY) maxY = pos.y;
    });
    width = maxX + 1;
    height = maxY + 1;
  }

  // Fonction utilitaire pour trouver le chemin le plus court vers l'un des objectifs spécifiés
  function findNearestTarget(start, targets) {
    const targetSet = new Set(targets.map(t => `${t.x},${t.y}`));
    const visited = new Set();
    const queue = [];
    const parent = {};

    // Point de départ du BFS
    const startKey = `${start.x},${start.y}`;
    queue.push(startKey);
    visited.add(startKey);
    parent[startKey] = null;

    // Ensemble des obstacles (bombes et ennemis à éviter)
    const obstacles = new Set();
    bombs.forEach(b => obstacles.add(`${b.x},${b.y}`));
    enemies.forEach(en => {
      obstacles.add(`${en.x},${en.y}`);
      // Évite aussi les cases adjacentes aux ennemis pour ne pas s'en approcher
      obstacles.add(`${en.x+1},${en.y}`);
      obstacles.add(`${en.x-1},${en.y}`);
      obstacles.add(`${en.x},${en.y+1}`);
      obstacles.add(`${en.x},${en.y-1}`);
    });

    // Parcours en largeur
    while (queue.length > 0) {
      const currentKey = queue.shift();
      const [cx, cy] = currentKey.split(',').map(Number);
      // Vérifie si on a atteint un objectif
      if (targetSet.has(currentKey)) {
        // Chemin trouvé : on le reconstitue en remontant les parents
        const path = [];
        let key = currentKey;
        while (key !== null) {
          const [px, py] = key.split(',').map(Number);
          path.unshift({ x: px, y: py });
          key = parent[key];
        }
        return path;
      }
      // Explore les voisins (4 directions)
      const neighbors = [
        { nx: cx + 1, ny: cy },
        { nx: cx - 1, ny: cy },
        { nx: cx, ny: cy + 1 },
        { nx: cx, ny: cy - 1 }
      ];
      for (const { nx, ny } of neighbors) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const neighborKey = `${nx},${ny}`;
        if (visited.has(neighborKey)) continue;
        if (obstacles.has(neighborKey)) continue;
        // Enfile le voisin accessible
        visited.add(neighborKey);
        parent[neighborKey] = currentKey;
        queue.push(neighborKey);
      }
    }
    // Aucun objectif atteint (aucun chemin disponible)
    return null;
  }

  // Fonction utilitaire pour obtenir la direction de déplacement entre deux positions adjacentes
  function getMoveDirection(from, to) {
    if (!to) return 'STAY';
    if (to.x > from.x) return 'RIGHT';
    if (to.x < from.x) return 'LEFT';
    if (to.y > from.y) return 'DOWN';
    if (to.y < from.y) return 'UP';
    return 'STAY';
  }

  // Choix du mouvement par défaut (on ne bouge pas) et de l'action (aucune)
  let move = 'STAY';
  let action = null;
  let bombType = null;

  // 4. Si un ennemi est adjacent, envisager l'attaque (bombardement de proximité)
  const adjacentEnemies = enemies.filter(e => Math.abs(e.x - myX) + Math.abs(e.y - myY) === 1);
  if (adjacentEnemies.length > 0) {
    // Ennemi direct à côté
    if (myBombsCount < 3) {
      // 5. Poser une bombe (proximity) car un bot ennemi est sur case adjacente
      move = 'STAY';
      action = 'BOMB';
      bombType = 'proximity';
    } else {
      // On ne peut plus poser de bombes (3 actives déjà), on tente de s'éloigner de l'ennemi
      const possibleMoves = [
        { name: 'UP', dx: 0, dy: -1 },
        { name: 'DOWN', dx: 0, dy: 1 },
        { name: 'LEFT', dx: -1, dy: 0 },
        { name: 'RIGHT', dx: 1, dy: 0 }
      ];
      let safeMove = null;
      for (const dir of possibleMoves) {
        const newX = myX + dir.dx;
        const newY = myY + dir.dy;
        // Vérifie que le mouvement reste dans les limites et évite bombes/ennemis
        if (newX < 0 || newX >= width || newY < 0 || newY >= height) continue;
        if (bombs.some(b => b.x === newX && b.y === newY)) continue;
        if (enemies.some(en => en.x === newX && en.y === newY)) continue;
        // Vérifie qu'après ce mouvement on ne sera adjacent à aucun ennemi
        let willBeAdjacent = false;
        for (const en of enemies) {
          if (Math.abs(en.x - newX) + Math.abs(en.y - newY) === 1) {
            willBeAdjacent = true;
            break;
          }
        }
        if (willBeAdjacent) continue;
        safeMove = dir.name;
        break;
      }
      if (safeMove) {
        move = safeMove;
        action = null;
      } else {
        // Si aucun déplacement n'élimine l'adjacence (bot coincé), on reste immobile sans action
        move = 'STAY';
        action = null;
      }
    }
  } else {
    // Pas d'ennemi immédiatement adjacent : poursuivre l'objectif principal (trophée)
    let targetPath = null;
    if (trophies.length > 0) {
      targetPath = findNearestTarget({ x: myX, y: myY }, trophies);
    }
    // 1. S'il n'y a pas de trophée accessible, on vise un diamant
    if (!targetPath && diamonds.length > 0) {
      targetPath = findNearestTarget({ x: myX, y: myY }, diamonds);
    }

    // 6. Utiliser une bombe 'timer' ou 'static' de manière proactive si un ennemi approche
    if (myBombsCount < 3 && enemies.length > 0 && !action) {
      // Détecte si le bot est dans un passage étroit (couloir)
      const freeDirs = [];
      const directions = [
        { name: 'UP', dx: 0, dy: -1 },
        { name: 'DOWN', dx: 0, dy: 1 },
        { name: 'LEFT', dx: -1, dy: 0 },
        { name: 'RIGHT', dx: 1, dy: 0 }
      ];
      for (const d of directions) {
        const nx = myX + d.dx, ny = myY + d.dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        // Considère la case comme libre si elle ne contient ni bombe ni ennemi
        if (bombs.some(b => b.x === nx && b.y === ny)) continue;
        if (enemies.some(en => en.x === nx && en.y === ny)) continue;
        freeDirs.push(d.name);
      }
      const freeCount = freeDirs.length;
      const isCorridor = (freeCount === 1) ||
                         (freeCount === 2 && (
                           (freeDirs.includes('LEFT') && freeDirs.includes('RIGHT')) ||
                           (freeDirs.includes('UP') && freeDirs.includes('DOWN'))
                         ));
      // Trouve la distance du plus proche ennemi
      let closestEnemyDist = Infinity;
      enemies.forEach(en => {
        const dist = Math.abs(en.x - myX) + Math.abs(en.y - myY);
        if (dist < closestEnemyDist) closestEnemyDist = dist;
      });
      if (isCorridor && closestEnemyDist <= 3) {
        // Couloir étroit: on pose une bombe statique pour bloquer le passage
        move = 'STAY';
        action = 'BOMB';
        bombType = 'static';
      } else if (closestEnemyDist <= 2) {
        // Ennemi très proche (2 cases) : on anticipe avec une bombe à retardement
        move = 'STAY';
        action = 'BOMB';
        bombType = 'timer';
      }
    }

    // 2. Si aucune bombe n'a été posée ce tour-ci, on se déplace vers la cible choisie
    if (!action) {
      if (!targetPath || targetPath.length < 2) {
        // Aucun objectif atteignable, ou bien on est déjà sur la case objectif
        move = 'STAY';
        action = null;
      } else {
        // Prochaine étape du chemin vers l'objectif
        const nextStep = targetPath[1];
        // Vérifie la distance jusqu'au trophée cible (s'il y en a un)
        const targetKey = targetPath[targetPath.length - 1];
        const targetingTrophy = trophies.some(t => t.x === targetKey.x && t.y === targetKey.y);
        const trophyDistance = targetPath.length - 1;
        let detour = false;
        if (targetingTrophy && trophyDistance > 1) {
          // 2. Si un diamant est adjacent en chemin, on peut faire un détour mineur pour le ramasser
          for (const d of diamonds) {
            if (Math.abs(d.x - myX) + Math.abs(d.y - myY) === 1) {
              // Diamant sur case voisine
              if (!bombs.some(b => b.x === d.x && b.y === d.y) &&
                  !enemies.some(en => en.x === d.x && en.y === d.y)) {
                // Le diamant est accessible sans danger, on le ramasse maintenant
                move = getMoveDirection({ x: myX, y: myY }, { x: d.x, y: d.y });
                action = null;
                detour = true;
                break;
              }
            }
          }
        }
        if (!detour) {
          // 1. Avance d'une case vers le trophée (objectif principal)
          move = getMoveDirection({ x: myX, y: myY }, nextStep);
          action = null;
        }
      }
    }
  }

  // 7. Respect de la limite de 3 bombes déjà pris en compte avant chaque pose de bombe

  // Construction de la réponse JSON à renvoyer
  const response = { move: move };
  if (action) {
    response.action = action;
    if (action === 'BOMB') {
      response.bombType = bombType || 'proximity';
    }
  }
  return res.json(response);
});


app.listen(port , () => console.log("Le serveur tourne sur le port " + port));