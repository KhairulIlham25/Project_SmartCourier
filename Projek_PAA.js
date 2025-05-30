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

// Fungsi baru untuk cek rata-rata warna di cell grid
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

  // Toleransi warna ±5 dari 90 (warna abu-abu jalan)
  if (
    rAvg >= 85 && rAvg <= 95 &&
    gAvg >= 85 && gAvg <= 95 &&
    bAvg >= 85 && bAvg <= 95
  ) {
    return true;  // jalan
  }
  return false;   // tembok
}

function drawGrid() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] === 1) {
        // tembok, transparent biar gambar terlihat
        ctx.fillStyle = "rgba(255,255,255,0)";
      } else {
        // jalan diwarnai abu-abu transparan agar jalan terlihat jelas di atas gambar
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

  // Gambar background asli (gambar map)
  if (mapLoaded && backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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

      // Stop if path ended
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

      // Buat canvas sementara untuk proses sampling warna
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Generate grid dari gambar dengan sampling rata-rata per GRID_SIZE x GRID_SIZE pixel
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const px = x * GRID_SIZE;
          const py = y * GRID_SIZE;
          if (isRoadCell(tempCtx, px, py, GRID_SIZE)) {
            grid[y][x] = 0; // jalan
          } else {
            grid[y][x] = 1; // tembok
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

  // Kalau status return dan sudah di start, reset ke forward
  if (courier.status === "return" && courier.x === start.x && courier.y === start.y) {
    courier = {
      x: start.x,
      y: start.y,
      path: [...lastPath],
      angle: 0,
      status: "forward"
    };
    lastAction = "forward";
  }

  // Kalau path kosong dan sudah sampai tujuan, jangan jalan ulang
  if (courier.path.length === 0) {
    if (courier.x === destination.x && courier.y === destination.y && courier.status === "forward") {
      return;
    }
    // Kalau path kosong tapi belum sampai tujuan, isi ulang path (optional)
    courier.path = [...lastPath];
    courier.status = "forward";
  }

  // Kalau sudah di tujuan, jangan mulai
  if (courier.x === destination.x && courier.y === destination.y) return;

  // Mulai bergerak
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
  moving = false;  // hanya pause, path tetap ada supaya bisa lanjut
}

function returnToStart() {
  if (!start || !destination || !mapLoaded) return;

  // Kurir belum sampai tujuan, tidak boleh kembali
  if (courier.x !== destination.x || courier.y !== destination.y) {
    console.warn("Kurir belum sampai tujuan. Tidak bisa kembali.");
    return;
  }

  // Jika kurir sudah di posisi start dan statusnya return, maka jangan lakukan apa-apa
  if (courier.status === "return" && courier.x === start.x && courier.y === start.y) {
    return; // Tidak melakukan apa-apa
  }

  const currentPos = { x: courier.x, y: courier.y };

  // Buat path balik dari lastPath yang sudah ada
  const returnPath = [...lastPath].slice().reverse();
  returnPath.push({ x: start.x, y: start.y });  // tambahkan titik awal di akhir

  if (returnPath.length > 0) {
    courier = {
      x: currentPos.x,
      y: currentPos.y,
      path: returnPath,
      angle: 0,
      status: "return"
    };
    moving = true;
    lastAction = "return";
  } else {
    console.warn("Path kembali tidak ditemukan!");
  }
}
