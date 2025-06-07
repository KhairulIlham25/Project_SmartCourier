const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRID_SIZE = 20;
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
let start = null;
let destination = null;
let path = [];
let courier = { x: 0, y: 0, path: [], angle: 0, status: "forward" };
let moving = false;
let speedDelay = 15;
let frameCounter = 0;
let lastPath = [];
let imageInput = document.getElementById("imageInput");
let mapLoaded = false;
let backgroundImageWidth = 0;
let backgroundImageHeight = 0;

function isRoadCell(tempCtx, startX, startY, size) {
  const imgData = tempCtx.getImageData(startX, startY, size, size);
  const data = imgData.data;
  let rSum = 0, gSum = 0, bSum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
    count++;
  }

  const rAvg = rSum / count;
  const gAvg = gSum / count;
  const bAvg = bSum / count;

  if (
    rAvg >= 90 && rAvg <= 150 &&
    gAvg >= 90 && gAvg <= 150 &&
    bAvg >= 90 && bAvg <= 150
  ) {
    return true;
  }
  return false;
}

function drawGrid() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] === 1) {
        ctx.fillStyle = "rgba(255,255,255,0)";
      } else {
        ctx.fillStyle = "rgba(90,90,90,0.6)";
      }
      ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    }
  }
}

function randomPosition() {
  const roads = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] === 0) roads.push({ x, y });
    }
  }
  return roads.length ? roads[Math.floor(Math.random() * roads.length)] : { x: 0, y: 0 };
}

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function aStar(start, goal) {
  const openSet = [start];
  const cameFrom = {};
  const gScore = {};
  gScore[`${start.x},${start.y}`] = 0;

  while (openSet.length) {
    openSet.sort((a, b) =>
      (gScore[`${a.x},${a.y}`] + heuristic(a, goal)) -
      (gScore[`${b.x},${b.y}`] + heuristic(b, goal))
    );
    const current = openSet.shift();
    if (current.x === goal.x && current.y === goal.y) {
      const path = [];
      let node = goal;
      while (`${node.x},${node.y}` in cameFrom) {
        path.push(node);
        node = cameFrom[`${node.x},${node.y}`];
      }
      return path.reverse();
    }

    for (let [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const neighbor = { x: current.x + dx, y: current.y + dy };
      if (
        neighbor.x >= 0 && neighbor.x < COLS &&
        neighbor.y >= 0 && neighbor.y < ROWS &&
        grid[neighbor.y][neighbor.x] === 0
      ) {
        const tentativeG = gScore[`${current.x},${current.y}`] + 1;
        if (
          !( `${neighbor.x},${neighbor.y}` in gScore ) ||
          tentativeG < gScore[`${neighbor.x},${neighbor.y}`]
        ) {
          cameFrom[`${neighbor.x},${neighbor.y}`] = current;
          gScore[`${neighbor.x},${neighbor.y}`] = tentativeG;
          openSet.push(neighbor);
        }
      }
    }
  }
  return [];
}

function drawCourier() {
  if (!start || !destination) return;
  const centerX = courier.x * GRID_SIZE + GRID_SIZE / 2;
  const centerY = courier.y * GRID_SIZE + GRID_SIZE / 2;
  const angle = courier.angle;
  ctx.fillStyle = "#00ffff";
  ctx.beginPath();
  ctx.moveTo(centerX + 10 * Math.cos(angle), centerY + 10 * Math.sin(angle));
  ctx.lineTo(centerX + 5 * Math.cos(angle + 2.4), centerY + 5 * Math.sin(angle + 2.4));
  ctx.lineTo(centerX + 5 * Math.cos(angle - 2.4), centerY + 5 * Math.sin(angle - 2.4));
  ctx.closePath();
  ctx.fill();
}

function drawFlag(x, y, color) {
  const px = x * GRID_SIZE + GRID_SIZE / 2;
  const py = y * GRID_SIZE + GRID_SIZE / 2;
  ctx.fillStyle = "black";
  ctx.fillRect(px, py - 10, 3, 20);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(px + 3, py - 10);
  ctx.lineTo(px + 13, py - 5);
  ctx.lineTo(px + 3, py);
  ctx.closePath();
  ctx.fill();
}

function loop() {
  requestAnimationFrame(loop);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (mapLoaded && backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, backgroundImageWidth, backgroundImageHeight);
  }
  drawGrid();
  if (start) drawFlag(start.x, start.y, "yellow");
  if (destination) drawFlag(destination.x, destination.y, "red");
  if (moving && courier.path.length > 0) {
    frameCounter++;
    if (frameCounter >= speedDelay) {
      const next = courier.path.shift();
      const dx = next.x - courier.x;
      const dy = next.y - courier.y;
      courier.angle = Math.atan2(dy, dx);
      courier.x = next.x;
      courier.y = next.y;
      frameCounter = 0;
      if (courier.path.length === 0) {
        moving = false;
      }
    }
  }
  if (start && destination) drawCourier();
}

loop();

let backgroundImage = null;

function loadMap() {
  const file = imageInput.files[0];
  if (!file) return;
  const img = new Image();
  const reader = new FileReader();
  reader.onload = function (e) {
    img.onload = function () {
      backgroundImage = img;
      backgroundImageWidth = img.naturalWidth;
      backgroundImageHeight = img.naturalHeight;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.fillStyle = "#fff";
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(img, 0, 0, backgroundImageWidth, backgroundImageHeight);
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const px = x * GRID_SIZE;
          const py = y * GRID_SIZE;
          if (isRoadCell(tempCtx, px, py, GRID_SIZE)) {
            grid[y][x] = 0;
          } else {
            grid[y][x] = 1;
          }
        }
      }
      mapLoaded = true;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function randomize() {
  if (!mapLoaded) return;
  let tries = 0;
  do {
    start = randomPosition();
    destination = randomPosition();
    path = aStar(start, destination);
    tries++;
    if (tries > 100) {
      alert("Gagal menemukan jalur, coba gambar lain atau periksa warna jalan!");
      return;
    }
  } while (path.length === 0);
  courier = { x: start.x, y: start.y, path: [...path], angle: 0, status: "forward" };
  lastPath = [...path];
  moving = false;
}

let lastAction = null; // status aksi terakhir: "forward" atau "return"

function startCourier() {
  if (!start || !destination || !mapLoaded) return;

  // Buat path baru dari posisi kurir saat ini ke tujuan
  const currentPos = { x: courier.x, y: courier.y };
  const newPath = aStar(currentPos, destination);

  if (newPath.length === 0) {
    alert("Tidak dapat menemukan jalur ke tujuan dari posisi saat ini!");
    return;
  }

  courier.path = newPath;
  courier.status = "forward";
  moving = true;
  lastAction = "forward";
}


function replayCourier() {
  if (!start || !destination || lastPath.length === 0 || moving || !lastAction) return;

  let replayPath;

  if (lastAction === "forward") {
    replayPath = [...lastPath];
    courier = {
      x: start.x,
      y: start.y,
      path: replayPath,
      angle: 0,
      status: "forward"
    };
  } else if (lastAction === "return") {
    replayPath = [...lastPath].reverse();
    replayPath.push({ x: start.x, y: start.y });

    courier = {
      x: destination.x,
      y: destination.y,
      path: replayPath,
      angle: 0,
      status: "return"
    };
  }

  moving = true;
}

function pauseCourier() {
  moving = false;  

function returnToStart() {
  if (!start || !destination || !mapLoaded) return;

  const currentPos = { x: courier.x, y: courier.y };

  const returnPath = aStar(currentPos, start);

  if (returnPath.length === 0) {
    console.warn("Tidak dapat membuat path kembali ke start!");
    return;
  }

  
  courier = {
    x: currentPos.x,
    y: currentPos.y,
    path: returnPath,
    angle: 0,
    status: "return"
  };
  moving = true;
  lastAction = "return";
}
