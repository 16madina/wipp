# Grok sticker videos (9:16, plain green or blue background) → what the app plays:
#   <out>/<name>.mp4   512×512, same background (the in-app player removes green, or blue when the corner is blue)
#   <out>/<name>.webp  still picture, transparent
# Usage: python scripts/convert-grok-stickers.py <map.tsv> <videos folder> <out folder>
#   map.tsv lines: «file.mp4<TAB>name[<TAB>still time in seconds]» (name may hold a folder: lui/respect)
# Needs ffmpeg, cwebp and Pillow.
import os, subprocess, sys, tempfile
from PIL import Image

MAP, SRC, OUT = sys.argv[1:4]
G, M = "g(X,Y)", "max(r(X,Y),b(X,Y))"
L = f"({G}-{M})"
KEYED = f"gt({G},48)*gt({L},14)*gt({G},(r(X,Y)+b(X,Y))*0.42)"
# Same green key as the in-app player (src/components/WippSticker.tsx).
KEY = f"format=rgba,geq=r='r(X,Y)':g='if({KEYED},{G},if(gt({G},r(X,Y))*gt({G},b(X,Y))*gt({L},6),{M}+{L}*0.25,{G}))':b='b(X,Y)':a='if({KEYED},255*max(0,1-min(1,{L}/36)*1.35),255)'"
# Blue background (stickers that hold green): the same key with green and blue swapped.
KEYB = KEY.replace("g(X,Y)", "§").replace("b(X,Y)", "g(X,Y)").replace("§", "b(X,Y)").replace(":g='if(", ":B='if(").replace(":b='", ":g='").replace(":B='if(", ":b='if(")

def run(*a):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *a], check=True)

def background(px):
    r, g, b = px[:3]
    return (g > 48 and g - max(r, b) > 14 and g > (r + b) * 0.42) or (b - max(r, g) > 30)

for line in open(MAP, encoding="utf8"):
    parts = line.rstrip("\n").split("\t")
    if len(parts) < 2 or line.startswith("#"):
        continue
    file, name = parts[0], parts[1]
    src = os.path.join(SRC, file)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]).decode().strip())
    still_at = float(parts[2]) if len(parts) > 2 and parts[2] else 0.0
    tmp = tempfile.mkdtemp()
    run("-i", src, "-vf", "fps=2,scale=180:-2", os.path.join(tmp, "s%03d.png"))
    box, blue = None, False
    for f in sorted(os.listdir(tmp)):
        im = Image.open(os.path.join(tmp, f)).convert("RGB")
        W, H = im.size
        px = im.load()
        c = px[2, 2]
        blue = blue or c[2] - max(c[0], c[1]) > 30
        xs = [x for x in range(W) for y in range(0, H, 2) if not background(px[x, y])]
        ys = [y for y in range(H) for x in range(0, W, 2) if not background(px[x, y])]
        if xs and ys:
            b = (min(xs), min(ys), max(xs), max(ys))
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    vw, vh = [int(v) for v in subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", src]).decode().strip().split(",")[:2]]
    k = vw / W
    x0, y0, x1, y1 = [v * k for v in box]
    side = min(max(x1 - x0, y1 - y0) * 1.06, max(vw, vh))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    side = int(side) // 2 * 2
    # Pad with green first, so the square may go past the picture.
    pad = int(side)
    bg = "0x0000FF" if blue else "0x00FF00"
    crop = f"pad={vw + 2 * pad}:{vh + 2 * pad}:{pad}:{pad}:color={bg},crop={side}:{side}:{int(cx - side / 2 + pad)}:{int(cy - side / 2 + pad)},scale=512:512"
    out = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    run("-i", src, "-vf", f"{crop},fps=20,format=yuv420p", "-an", "-c:v", "libx264", "-crf", "27", "-preset", "slow", "-movflags", "+faststart", out + ".mp4")
    png = os.path.join(tmp, "still.png")
    run("-ss", str(still_at), "-i", out + ".mp4", "-frames:v", "1", "-vf", KEYB if blue else KEY, png)
    subprocess.run(["cwebp", "-quiet", "-q", "82", "-alpha_q", "90", png, "-o", out + ".webp"], check=True)
    print(name, f"{dur:.1f}s", "bleu" if blue else "vert", os.path.getsize(out + ".mp4") // 1024, "Ko")
