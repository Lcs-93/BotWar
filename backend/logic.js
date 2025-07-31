function decideMove(game) {
  const me = game.you;
  if (!me) return { move: "STAY", action: "NONE" };

  const myId = me.id;
  const myX = me.x;
  const myY = me.y;

  const enemies = (game.otherBots || []).filter(b => b.id !== myId);

  const points = Array.isArray(game.points) ? [...game.points] : [];
  if (game.megaPoint) points.push({ ...game.megaPoint, mega: true });

  const bombs = [];
  if (Array.isArray(game.grid)) {
    game.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        (cell.bombs || []).forEach(b => bombs.push({ x, y, ...b }));
      });
    });
  }

  const gridWidth = game.grid?.[0]?.length || 5;
  const gridHeight = game.grid?.length || 5;

  const dirs = [
    { dx: 0, dy: -1, move: "UP" },
    { dx: 0, dy: 1, move: "DOWN" },
    { dx: -1, dy: 0, move: "LEFT" },
    { dx: 1, dy: 0, move: "RIGHT" },
  ];

  const isValid = (x, y) => x >= 0 && y >= 0 && x < gridWidth && y < gridHeight;
  const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  const isDanger = (x, y) => {
    return bombs.some(b => {
      if (b.bombType === "static") return b.x === x && b.y === y;
      if (b.bombType === "timer") return dist({ x, y }, b) <= 1 && b.timer <= 2;
      return dist({ x, y }, b) <= 1;
    });
  };

  const isEnemy = (x, y) => enemies.some(e => e.x === x && e.y === y);
  const isOccupied = (x, y) => isEnemy(x, y) || bombs.some(b => b.x === x && b.y === y);

  // STRATÉGIE 0: Attaquer un ennemi adjacent
  for (const d of dirs) {
    const nx = myX + d.dx;
    const ny = myY + d.dy;
    if (isEnemy(nx, ny) && !isDanger(nx, ny)) {
      return { move: d.move, action: "ATTACK" };
    }
  }

  // STRATÉGIE 0.5: Placer une bombe si un ennemi est proche
  if (me.bombs > 0 && enemies.some(e => dist(e, me) <= 2)) {
    return { move: "STAY", action: "BOMB", bombType: "proximity" };
  }

  // STRATÉGIE 1: Collecte immédiate adjacente
  for (const d of dirs) {
    const nx = myX + d.dx;
    const ny = myY + d.dy;
    if (
      isValid(nx, ny) &&
      points.some(p => p.x === nx && p.y === ny) &&
      !isDanger(nx, ny)
    ) {
      return { move: d.move, action: "COLLECT" };
    }
  }

  // STRATÉGIE 1.5: Je suis sur un point
  if (points.some(p => p.x === myX && p.y === myY)) {
    for (const d of dirs) {
      const nx = myX + d.dx;
      const ny = myY + d.dy;
      if (isValid(nx, ny) && !isDanger(nx, ny) && !isOccupied(nx, ny)) {
        return { move: d.move, action: "COLLECT" };
      }
    }
  }

  // STRATÉGIE 2: Aller vers le point le plus proche
  if (points.length > 0) {
    let closest = points[0];
    let minDist = dist(me, closest);
    for (const p of points) {
      const d = dist(me, p);
      if (d < minDist) {
        minDist = d;
        closest = p;
      }
    }

    const dx = closest.x - myX;
    const dy = closest.y - myY;
    const order = [];
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) order.push("RIGHT");
      if (dx < 0) order.push("LEFT");
      if (dy > 0) order.push("DOWN");
      if (dy < 0) order.push("UP");
    } else {
      if (dy > 0) order.push("DOWN");
      if (dy < 0) order.push("UP");
      if (dx > 0) order.push("RIGHT");
      if (dx < 0) order.push("LEFT");
    }

    for (const move of order) {
      const dir = dirs.find(d => d.move === move);
      const nx = myX + dir.dx;
      const ny = myY + dir.dy;
      if (isValid(nx, ny) && !isDanger(nx, ny) && !isOccupied(nx, ny)) {
        const willBeOnPoint = closest.x === nx && closest.y === ny;
        return { move, action: willBeOnPoint ? "COLLECT" : "NONE" };
      }
    }
  }

  // STRATÉGIE 3: Mouvement d'exploration sûr
  const safeMoves = dirs.filter(d => {
    const nx = myX + d.dx;
    const ny = myY + d.dy;
    return isValid(nx, ny) && !isDanger(nx, ny) && !isOccupied(nx, ny);
  });
  if (safeMoves.length > 0) {
    const rand = safeMoves[Math.floor(Math.random() * safeMoves.length)];
    return { move: rand.move, action: "NONE" };
  }

  return { move: "STAY", action: "NONE" };
}

module.exports = { decideMove };

