function hash32(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function inFinder(r: number, c: number, n: number) {
  const inBox = (rr: number, cc: number, r0: number, c0: number) =>
    rr >= r0 && rr < r0 + 7 && cc >= c0 && cc < c0 + 7;
  return inBox(r, c, 0, 0) || inBox(r, c, 0, n - 7) || inBox(r, c, n - 7, 0);
}

function finderModule(r: number, c: number, r0: number, c0: number) {
  const rr = r - r0;
  const cc = c - c0;
  const ring = rr === 0 || rr === 6 || cc === 0 || cc === 6;
  const core = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
  return ring || core;
}

export function qrGrid(value: string, n = 29): boolean[][] {
  const grid: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  const seed = hash32(value);
  let h = seed;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (inFinder(r, c, n)) {
        const r0 = r < 7 ? 0 : n - 7;
        const c0 = c < 7 ? 0 : r < 7 && c >= n - 7 ? n - 7 : 0;
        const topRight = r < 7 && c >= n - 7;
        const bottomLeft = r >= n - 7 && c < 7;
        const originR = topRight ? 0 : bottomLeft ? n - 7 : 0;
        const originC = topRight ? n - 7 : 0;
        grid[r][c] = finderModule(r, c, originR, originC);
        continue;
      }
      h = Math.imul(h ^ (r * 131 + c * 17 + seed), 16777619) >>> 0;
      grid[r][c] = ((h >>> 28) & 1) === 1;
    }
  }

  const timing = 6;
  for (let i = 8; i < n - 8; i++) {
    grid[timing][i] = i % 2 === 0;
    grid[i][timing] = i % 2 === 0;
  }
  return grid;
}

export async function qrPngBlob(value: string, size = 720): Promise<Blob> {
  const grid = qrGrid(value);
  const n = grid.length;
  const pad = 3;
  const dim = n + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#F7F9FC";
  ctx.fillRect(0, 0, size, size);
  const cell = size / dim;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!grid[r][c]) continue;
      const finder =
        (r < 7 && c < 7) || (r < 7 && c > n - 8) || (r > n - 8 && c < 7);
      ctx.fillStyle = finder ? "#0B1220" : r % 7 === 3 && c % 7 === 3 ? "#C9A227" : "#0B1220";
      ctx.fillRect((c + pad) * cell, (r + pad) * cell, cell + 0.4, cell + 0.4);
    }
  }
  const mark = Math.round(size * 0.18);
  const mx = (size - mark) / 2;
  const my = (size - mark) / 2;
  ctx.fillStyle = "#0B1220";
  roundRect(ctx, mx, my, mark, mark, 10);
  ctx.fill();
  ctx.fillStyle = "#F7F9FC";
  ctx.beginPath();
  ctx.arc(mx + mark * 0.32, my + mark * 0.5, mark * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFD84D";
  ctx.beginPath();
  ctx.arc(mx + mark * 0.68, my + mark * 0.5, mark * 0.1, 0, Math.PI * 2);
  ctx.fill();
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/png");
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
