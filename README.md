# 🕹️ BotWar  

BotWar est un projet en **Node.js** qui implémente un bot capable de se déplacer, poser des bombes et interagir sur un plateau de jeu.  
Il intègre des **tests unitaires avec Jest**, un déploiement via **Docker** et une automatisation avec **GitHub Actions (CI/CD)**.  

---

## 🚀 Installation  

### 1. Cloner le projet  
```bash
git clone https://github.com/Lcs-93/BotWar.git
cd BotWar
npm install
npm test
 PASS  ./bot.test.js
  ✓ le bot peut se déplacer (10 ms)
  ✓ le bot pose une bombe correctement (5 ms)
docker build -t botwar .
docker run --rm botwar
Bot-War server running on port 3000
docker images
