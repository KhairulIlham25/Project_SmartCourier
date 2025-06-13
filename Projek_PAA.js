const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRID_SIZE = 4;
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
let start = null;
let destination = null;
let path = [];
let courier = { x: 0, y: 0, path: [], angle: 0, status: "forward" };
let moving = false;
let speedDelay = 7;
let frameCounter = 0;
let lastPath = [];
let imageInput = document.getElementById("imageInput");
let mapLoaded = false;
let backgroundImageWidth = 0;
let backgroundImageHeight = 0;
let initialCourierPos = null;
let pausedPath = [];

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
  if (!destination) return;
  
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
  if ((color === "yellow" && !start) || (color === "red" && !destination)) return;
  
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

        if (courier.status === "toStart" || courier.status === "replayToStart") {
          setTimeout(() => {
            start = null;
            
            const targetPath = lastPath.length > 0 ? lastPath : 
                             aStar({ x: courier.x, y: courier.y }, destination);
            
            if (targetPath.length > 0) {
              courier.path = targetPath;
              courier.status = "forward";
              moving = true;
            } else {
              alert("Tidak dapat menemukan jalur ke tujuan.");
            }
          }, 1000);
        }
      }
    }
  }

  if (destination) {
    drawCourier();
  }
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
      const minWidth = 1000;
      const minHeight = 700;
      const maxWidth = 1500;
      const maxHeight = 1000;
      
      if (img.naturalWidth < minWidth || img.naturalHeight < minHeight) {
        alert(`Ukuran gambar terlalu kecil! Minimal ${minWidth}x${minHeight} piksel.`);
        return;
      }
      
      if (img.naturalWidth > maxWidth || img.naturalHeight > maxHeight) {
        alert(`Ukuran gambar terlalu besar! Maksimal ${maxWidth}x${maxHeight} piksel.`);
        return;
      }

      backgroundImageWidth = img.naturalWidth;
      backgroundImageHeight = img.naturalHeight;
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      backgroundImage = img;
      mapLoaded = true;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.naturalWidth;
      tempCanvas.height = img.naturalHeight;
      const tempCtx = tempCanvas.getContext("2d");

      tempCtx.drawImage(img, 0, 0);

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const px = Math.floor(x * GRID_SIZE);
          const py = Math.floor(y * GRID_SIZE);
          if (isRoadCell(tempCtx, px, py, GRID_SIZE)) {
            grid[y][x] = 0;
          } else {
            grid[y][x] = 1;
          }
        }
      }

      courier = { x: 0, y: 0, path: [], angle: 0, status: "forward" };
      start = null;
      destination = null;
      path = [];
      lastPath = [];
      moving = false;
      
      draw();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function randomize() {
  if (!mapLoaded) return;

  let tries = 0;
  do {
    const randomCourier = randomPosition();
    const randomStart = randomPosition();
    const randomDestination = randomPosition();

    const toStartPath = aStar(randomCourier, randomStart);
    const toDestinationPath = aStar(randomStart, randomDestination);

    if (toStartPath.length > 0 && toDestinationPath.length > 0) {
      initialCourierPos = { x: randomCourier.x, y: randomCourier.y };
      originalStartPosition = { x: randomStart.x, y: randomStart.y };
      
      courier = {
        x: randomCourier.x,
        y: randomCourier.y,
        path: [...toStartPath],
        angle: 0,
        status: "toStart"
      };

      start = { x: randomStart.x, y: randomStart.y };
      destination = { x: randomDestination.x, y: randomDestination.y };
      lastPath = [...toDestinationPath];
      moving = false;
      return;
    }
    tries++;
  } while (tries < 100);
  alert("Gagal menemukan jalur yang valid");
}

let lastAction = null;

function pauseCourier() {
  moving = false;
  pausedPath = [...courier.path];
  pausedPath.unshift({ 
    x: courier.x, 
    y: courier.y,
    angle: courier.angle
  });
}

function startCourier() {
  if (!destination || !mapLoaded) return;

  if (courier.x === destination.x && courier.y === destination.y) {
    alert("Kurir sudah sampai di tujuan!");
    return;
  }

  if (moving) return;

  if (pausedPath.length > 0) {
    const firstStep = pausedPath[0];
    if (firstStep.angle !== undefined) {
      courier.angle = firstStep.angle;
    }
    
    courier.path = pausedPath.slice(1);
    
    if (courier.path.length > 0) {
      const next = courier.path[0];
      const dx = next.x - courier.x;
      const dy = next.y - courier.y;
      courier.angle = Math.atan2(dy, dx);
    }
    
    pausedPath = [];
    moving = true;
    return;
  }

  if (start && courier.x === start.x && courier.y === start.y && lastPath.length > 0) {
    courier.path = [...lastPath];
    if (courier.path.length > 0) {
      const next = courier.path[0];
      const dx = next.x - courier.x;
      const dy = next.y - courier.y;
      courier.angle = Math.atan2(dy, dx);
    }
    courier.status = "forward";
    moving = true;
    return;
  }

  if (start) {
    const toStart = aStar({ x: courier.x, y: courier.y }, start);
    if (toStart.length > 0) {
      courier.path = toStart;
      if (courier.path.length > 0) {
        const next = courier.path[0];
        const dx = next.x - courier.x;
        const dy = next.y - courier.y;
        courier.angle = Math.atan2(dy, dx);
      }
      courier.status = "toStart";
      moving = true;
    } else {
      alert("Tidak bisa menemukan jalur ke titik awal!");
    }
  } else {
    const toDestination = aStar({ x: courier.x, y: courier.y }, destination);
    if (toDestination.length > 0) {
      courier.path = toDestination;
      if (courier.path.length > 0) {
        const next = courier.path[0];
        const dx = next.x - courier.x;
        const dy = next.y - courier.y;
        courier.angle = Math.atan2(dy, dx);
      }
      courier.status = "forward";
      moving = true;
    } else {
      alert("Tidak bisa menemukan jalur ke tujuan!");
    }
  }
}

function replayCourier() {
  if (!initialCourierPos || !originalStartPosition || !destination) {
    alert("Data awal tidak lengkap untuk replay");
    return;
  }

  moving = false;
  frameCounter = 0;

  start = { x: originalStartPosition.x, y: originalStartPosition.y };
  courier = {
    x: initialCourierPos.x,
    y: initialCourierPos.y,
    path: [],
    angle: 0,
    status: "replayToStart"
  };

  const pathToStart = aStar(initialCourierPos, start);
  if (pathToStart.length === 0) {
    alert("Tidak bisa menemukan jalur ke bendera kuning");
    return;
  }

  lastPath = aStar(start, destination);
  if (lastPath.length === 0) {
    alert("Tidak bisa menemukan jalur ke bendera merah");
    return;
  }

  courier.path = pathToStart;
  moving = true;
}

if (courier.status === "toStart" || courier.status === "replayToStart") {
  setTimeout(() => {
    start = null;
    const targetPath = lastPath;
    if (targetPath.length > 0) {
      courier.path = targetPath;
      courier.status = "forward";
      moving = true;
    }
  }, 1000);
}
