"""Remove burned-in captions by inpainting only the letter pixels.

Letters are found as near-white pixels inside the caption box that stay put across
neighbouring frames (text is static, the picture moves), filtered to letter-sized
blobs and grown slightly to cover their dark outline. They are then filled from the
surrounding picture with OpenCV inpainting, and the frame is upscaled.

usage: python3 clean_text.py <raw_dir> <out_dir> x y w h [box]
('box' also fills the whole caption box: for moving or glowing text)
"""
import os, sys
import numpy as np
import cv2

raw, out = sys.argv[1], sys.argv[2]
bx, by, bw, bh = map(int, sys.argv[3:7])
BOX = len(sys.argv) > 7 and sys.argv[7] == 'box'
files = sorted(f for f in os.listdir(raw) if f.endswith('.png'))
frames = [cv2.imread(os.path.join(raw, f)) for f in files]
n = len(frames)

def white(img):
    roi = img[by:by + bh, bx:bx + bw].astype(int)
    mn, mx = roi.min(2), roi.max(2)
    return ((mn > 165) & (mx - mn < 55)).astype(np.uint8)

W = np.stack([white(f) for f in frames])
# split into shots so text that changes at a cut is handled separately
diff = [0] + [np.abs(frames[i].astype(int) - frames[i - 1].astype(int)).mean() for i in range(1, n)]
shot = np.cumsum([d > 18 for d in diff])
os.makedirs(out, exist_ok=True)
for i, (f, img) in enumerate(zip(files, frames)):
    lo, hi = max(0, i - 6), min(n, i + 7)
    idx = [j for j in range(lo, hi) if shot[j] == shot[i]]
    persist = (W[idx].mean(0) >= 0.6).astype(np.uint8)
    # keep letter-sized blobs only
    cnt, lab, stats, _ = cv2.connectedComponentsWithStats(persist, 8)
    keep = np.zeros_like(persist)
    for c in range(1, cnt):
        x, y, w, h, a = stats[c]
        if a >= 3 and h <= 60 and w <= 120:
            keep[lab == c] = 1
    mask = np.zeros(img.shape[:2], np.uint8)
    mask[by:by + bh, bx:bx + bw] = 255 if BOX else keep * 255
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
    clean = cv2.inpaint(img, mask, 6, cv2.INPAINT_TELEA)
    h = 1080
    up = cv2.resize(clean, (round(clean.shape[1] * h / clean.shape[0] / 2) * 2, h), interpolation=cv2.INTER_LANCZOS4)
    blur = cv2.GaussianBlur(up, (0, 0), 1.6)
    up = cv2.addWeighted(up, 1.5, blur, -0.5, 0)
    cv2.imwrite(os.path.join(out, f'{i + 1:04d}.jpg'), up, [cv2.IMWRITE_JPEG_QUALITY, 94])
print(out, n)
