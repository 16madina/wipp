# The « sig » stickers were cut out of a sheet: bits of the neighbouring stickers stayed along the edges.
# Removes the separate pieces that touch the border of the picture, are small and stay close to that border.
# Needs Pillow. Usage: python scripts/clean-sticker-edges.py <folder> [<folder>…]   (originals copied to artifacts/sticker-avant-nettoyage)
import glob, os, shutil, sys
from PIL import Image

def clean(path, backup):
    im = Image.open(path).convert("RGBA")
    W, H = im.size
    a = im.getchannel("A").load()
    seen = bytearray(W * H)
    comps = []
    for y0 in range(H):
        for x0 in range(W):
            if seen[y0 * W + x0] or a[x0, y0] <= 24:
                continue
            stack, pix, edge = [(x0, y0)], [], False
            seen[y0 * W + x0] = 1
            while stack:
                x, y = stack.pop()
                pix.append((x, y))
                if x == 0 or y == 0 or x == W - 1 or y == H - 1:
                    edge = True
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and a[nx, ny] > 24:
                        seen[ny * W + nx] = 1
                        stack.append((nx, ny))
            comps.append((len(pix), edge, pix))
    if not comps:
        return 0
    big = max(c[0] for c in comps)
    # A stray piece hugs the border: it never reaches far into the picture (a word of the sticker does).
    def depth(pix):
        return max(min(x, y, W - 1 - x, H - 1 - y) for x, y in pix)
    drop = [c for c in comps if c[1] and c[0] < big * 0.12 and depth(c[2]) <= 0.07 * min(W, H)]
    if not drop:
        return 0
    os.makedirs(backup, exist_ok=True)
    if not os.path.exists(os.path.join(backup, os.path.basename(path))):
        shutil.copy(path, backup)
    px = im.load()
    for _, _, pix in drop:
        for x, y in pix:
            px[x, y] = (0, 0, 0, 0)
    im.save(path)
    return len(drop)

for folder in sys.argv[1:]:
    for f in sorted(glob.glob(os.path.join(folder, "*.png"))):
        n = clean(f, "../artifacts/sticker-avant-nettoyage/" + os.path.basename(folder.rstrip("/")))
        print(os.path.basename(f), n)
