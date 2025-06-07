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

const carImages = {
  up: new Image(),
  down: new Image(),
  left: new Image(),
  right: new Image()
};

carImages.up.src = "mobil-atas.png";
carImages.down.src = "mobil-bawah.png";
carImages.left.src = "mobil-kiri.png";
carImages.right.src = "mobil-kanan.png";

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
    rAvg >= 90 && rAvg <= 150 &&
    gAvg >= 90 && gAvg <= 150 &&
    bAvg >= 90 && bAvg <= 150
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

  const scale = 1.6;
  const size = GRID_SIZE * scale;
  // Geser supaya gambar tetap center di cell grid
  const centerX = courier.x * GRID_SIZE + (GRID_SIZE - size) / 2;
  const centerY = courier.y * GRID_SIZE + (GRID_SIZE - size) / 2;

  // Tentukan arah berdasarkan angle
  let image;
  const angleDeg = courier.angle * (180 / Math.PI);

  if (angleDeg >= -45 && angleDeg <= 45) {
    image = carImages.right;
  } else if (angleDeg > 45 && angleDeg <= 135) {
    image = carImages.down;
  } else if (angleDeg < -45 && angleDeg >= -135) {
    image = carImages.up;
  } else {
    image = carImages.left;
  }

  ctx.drawImage(image, centerX, centerY, size, size);
}

function drawFlag(x, y, color) {
  const scale = 1.5;
  const px = x * GRID_SIZE + GRID_SIZE / 2;
  const py = y * GRID_SIZE + GRID_SIZE / 2;

  ctx.fillStyle = "black";
  ctx.fillRect(px, py - 10 * scale, 3 * scale, 20 * scale);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(px + 3 * scale, py - 10 * scale);
  ctx.lineTo(px + 13 * scale, py - 5 * scale);
  ctx.lineTo(px + 3 * scale, py);
  ctx.closePath();
  ctx.fill();
}

function loop() {
  requestAnimationFrame(loop);

  // Gambar background
  if (mapLoaded && backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (start) drawFlag(start.x, start.y, "yellow");
  if (destination) drawFlag(destination.x, destination.y, "red");

  if (moving && courier.path.length > 0) {
    const next = courier.path[0];

    // Cek apakah langkah berikutnya masih di jalan (grid=0)
    if (grid[next.y][next.x] !== 0) {
      moving = false;
      alert("Jalur tertutup, pergerakan dihentikan!");
      return;
    }

    frameCounter++;
    if (frameCounter >= speedDelay) {
      courier.path.shift(); // hapus langkah yang sudah dilalui
      const dx = next.x - courier.x;
      const dy = next.y - courier.y;
      courier.angle = Math.atan2(dy, dx);
      courier.x = next.x;
      courier.y = next.y;
      frameCounter = 0;

      if (courier.path.length === 0) {
        moving = false;

        // Kalau status return dan sudah sampai start, siap jalan forward lagi
        if (courier.status === "return" && courier.x === start.x && courier.y === start.y) {
          courier.status = "forward";
          // buat path baru ke destination
          const newPath = aStar(start, destination);
          if (newPath.length > 0) {
            courier.path = newPath;
            // jangan langsung jalan, tunggu user klik start
          }
        }
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

      // Generate grid dari gambar
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

      // ✅ Reset status aplikasi saat peta di-load ulang
      mapLoaded = true;
      courier = null;
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
  moving = false;  // hanya pause, path tetap ada supaya bisa lanjut
}

function returnToStart() {
  if (!start || !destination || !mapLoaded) return;

  // Jangan paksa kurir ke destinasi dulu, langsung buat path dari posisi sekarang ke start
  const currentPos = { x: courier.x, y: courier.y };

  // Buat path dari posisi sekarang ke start menggunakan aStar
  const returnPath = aStar(currentPos, start);

  if (returnPath.length === 0) {
    console.warn("Tidak dapat membuat path kembali ke start!");
    return;
  }

  // Update courier dengan path kembali, status return
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
