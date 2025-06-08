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
let initialCourierPos = null;
let pausedPath = [];

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
  // Always draw courier if there's a destination
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
  // Don't draw if flag doesn't exist
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

  // Draw flags
  if (start) drawFlag(start.x, start.y, "yellow");
  if (destination) drawFlag(destination.x, destination.y, "red");

  // Courier movement
if (moving && courier.path.length > 0) {
  frameCounter++;
  if (frameCounter >= speedDelay) {
    const next = courier.path.shift();
    const dx = next.x - courier.x;
    const dy = next.y - courier.y;
    courier.angle = Math.atan2(dy, dx); // Update angle berdasarkan arah gerakan
    courier.x = next.x;
    courier.y = next.y;
    frameCounter = 0;

      if (courier.path.length === 0) {
        moving = false;

        if (courier.status === "toStart" || courier.status === "replayToStart") {
          // Wait 1 second before moving to destination
          setTimeout(() => {
            // Only remove start flag when beginning movement to destination
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

  // Always draw courier if there's a destination
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
      const scaleX = canvas.width / img.naturalWidth;
      const scaleY = canvas.height / img.naturalHeight;
      const scale = Math.min(scaleX, scaleY); // Skala proporsional (aspect ratio terjaga)
      backgroundImageWidth = img.naturalWidth * scale;
      backgroundImageHeight = img.naturalHeight * scale;
      const offsetX = (canvas.width - backgroundImageWidth) / 2;
      const offsetY = (canvas.height - backgroundImageHeight) / 2;
      backgroundImage = img;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.fillStyle = "#fff";
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(img, offsetX, offsetY, backgroundImageWidth, backgroundImageHeight);
      // Konversi gambar ke grid
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
      courier = { x: 0, y: 0, path: [], angle: 0, status: "forward" };
      start = null;
      destination = null;
      path = [];
      lastPath = [];
      moving = false;
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
      originalStartPosition = { x: randomStart.x, y: randomStart.y }; // Store original position
      
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
    angle: courier.angle // Simpan angle saat pause
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
    // Ambil angle yang disimpan jika ada
    const firstStep = pausedPath[0];
    if (firstStep.angle !== undefined) {
      courier.angle = firstStep.angle;
    }
    
    courier.path = pausedPath.slice(1); // Ambil path tanpa step pertama
    
    // Update angle jika ada langkah berikutnya
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

  // Jika sudah di start point dan ada lastPath
  if (start && courier.x === start.x && courier.y === start.y && lastPath.length > 0) {
    courier.path = [...lastPath];
    // Hitung angle berdasarkan langkah pertama
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

  // Jika tidak dalam kondisi di atas, cari path ke start atau destination
  if (start) {
    const toStart = aStar({ x: courier.x, y: courier.y }, start);
    if (toStart.length > 0) {
      courier.path = toStart;
      // Hitung angle berdasarkan langkah pertama
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
    // Jika tidak ada start (sudah dihapus), langsung ke destination
    const toDestination = aStar({ x: courier.x, y: courier.y }, destination);
    if (toDestination.length > 0) {
      courier.path = toDestination;
      // Hitung angle berdasarkan langkah pertama
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

  // Reset all states
  moving = false;
  frameCounter = 0;

  // Restore original positions
  start = { x: originalStartPosition.x, y: originalStartPosition.y };
  courier = {
    x: initialCourierPos.x,
    y: initialCourierPos.y,
    path: [],
    angle: 0, // Tetap mulai dari angle 0 saat replay
    status: "replayToStart"
  };

  // Calculate fresh paths
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

  // Begin movement
  courier.path = pathToStart;
  moving = true;
}

// In your movement logic (loop function):
if (courier.status === "toStart" || courier.status === "replayToStart") {
  setTimeout(() => {
    start = null; // Remove yellow flag only when starting to move to red
    const targetPath = lastPath;
    if (targetPath.length > 0) {
      courier.path = targetPath;
      courier.status = "forward";
      moving = true;
    }
  }, 1000);
}
