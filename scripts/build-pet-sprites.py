#!/usr/bin/env python3
"""Pack chroma-keyed horizontal sprite strips into a crisp pixel-art spritesheet.

Outputs:
  - public/pet/mouse-spritesheet.png  (192x144 RGBA: 4 cols x 3 rows of 48x48 frames)
  - public/pet/mouse-spritesheet.webp (lossless WebP)
  - scratch preview sheet (4x nearest-neighbor on light/dark/checkerboard)
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


CELL_W = 48
CELL_H = 48
COLS = 4
ROWS = 3
BASELINE_Y = 44  # Anchor feet consistently at y = 44 inside each 48x48 frame.
MAX_W = 40
MAX_H = 40


def extract_alpha_and_despill(rgba: np.ndarray) -> np.ndarray:
    """Flood-fill background from image borders and despill green edge halos."""
    h, w, _ = rgba.shape
    rgb = rgba[:, :, :3].astype(np.int16)

    # Sample border corners to get true background green reference (handles slight compression drift)
    corners = np.vstack([
        rgb[0, :4],
        rgb[0, -4:],
        rgb[-1, :4],
        rgb[-1, -4:],
    ])
    bg_rgb = np.median(corners, axis=0)

    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    # Strong outer green removal + slightly looser edge cleanup
    dist_bg = np.sqrt(np.sum((rgb - bg_rgb) ** 2, axis=2))
    green_dom = g - np.maximum(r, b)
    is_bg_candidate = (dist_bg < 115) | ((green_dom > 18) & (g > 70))

    # Flood fill from all 4 outer edges so enclosed highlights or details aren't punched out
    visited = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_bg_candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg_candidate[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))

    while queue:
        cy, cx = queue.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and is_bg_candidate[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    out = rgba.copy()
    alpha = np.where(visited, 0, 255).astype(np.uint8)

    # Remove enclosed green pockets (e.g. inside tail loop or between whiskers)
    strong_green = (green_dom > 28) & (g > 90)
    alpha[strong_green] = 0

    # Strip any tiny disconnected stray green/border artifacts (< 0.5% of strip area)
    # Per-slot connected component filtering happens right after splitting.

    # Aggressive edge green-spill neutralization along silhouette boundary
    opaque = alpha > 0
    trans = ~opaque
    border_mask = np.zeros((h, w), dtype=bool)
    border_mask[1:, :] |= opaque[1:, :] & trans[:-1, :]
    border_mask[:-1, :] |= opaque[:-1, :] & trans[1:, :]
    border_mask[:, 1:] |= opaque[:, 1:] & trans[:, :-1]
    border_mask[:, :-1] |= opaque[:, :-1] & trans[:, 1:]

    r_f = out[:, :, 0].astype(np.float32)
    g_f = out[:, :, 1].astype(np.float32)
    b_f = out[:, :, 2].astype(np.float32)
    edge_spill = border_mask & (g_f > np.maximum(r_f, b_f) + 2)
    neutral = np.minimum(r_f, b_f)
    out[:, :, 0] = np.where(edge_spill, np.minimum(r_f, neutral + 6), r_f).astype(np.uint8)
    out[:, :, 1] = np.where(edge_spill, neutral, g_f).astype(np.uint8)
    out[:, :, 2] = np.where(edge_spill, np.minimum(b_f, neutral + 6), b_f).astype(np.uint8)
    out[:, :, 3] = alpha

    # Zero RGB under fully transparent pixels
    out[alpha == 0, :3] = 0
    return out


def keep_largest_component_and_whiskers(sub: np.ndarray) -> np.ndarray:
    """Drop stray disconnected artifacts near slot seams (like a clipped whisker from adjacent frame)."""
    alpha = sub[:, :, 3] > 0
    h, w = alpha.shape
    labels = np.zeros((h, w), dtype=np.int32)
    comp_sizes: list[tuple[int, int, int, int, int, int]] = []
    cid = 0
    for y in range(h):
        for x in range(w):
            if alpha[y, x] and labels[y, x] == 0:
                cid += 1
                q = deque([(y, x)])
                labels[y, x] = cid
                pts = 0
                min_x, max_x = x, x
                min_y, max_y = y, y
                while q:
                    cy, cx = q.popleft()
                    pts += 1
                    min_x = min(min_x, cx)
                    max_x = max(max_x, cx)
                    min_y = min(min_y, cy)
                    max_y = max(max_y, cy)
                    for ny in range(max(0, cy - 1), min(h, cy + 2)):
                        for nx in range(max(0, cx - 1), min(w, cx + 2)):
                            if alpha[ny, nx] and labels[ny, nx] == 0:
                                labels[ny, nx] = cid
                                q.append((ny, nx))
                comp_sizes.append((pts, cid, min_x, max_x, min_y, max_y))
    if not comp_sizes:
        return sub
    comp_sizes.sort(reverse=True)
    main_pts, main_id, m_x0, m_x1, m_y0, m_y1 = comp_sizes[0]
    cleaned = sub.copy()
    keep_ids = {main_id}
    for pts, comp_id, x0, x1, y0, y1 in comp_sizes[1:]:
        # Keep whisker/paw fragments only if close to main body and not near outer slot seam
        near_body = not (x1 < m_x0 - int(w * 0.08) or x0 > m_x1 + int(w * 0.08))
        at_outer_seam = x0 <= 12 or x1 >= w - 13
        if pts >= 14 and near_body and not at_outer_seam:
            keep_ids.add(comp_id)
    mask_drop = ~np.isin(labels, list(keep_ids))
    cleaned[mask_drop] = [0, 0, 0, 0]
    return cleaned


def split_strip_into_slots(strip_rgba: np.ndarray, cols: int = COLS, flip_x: bool = False) -> list[tuple[np.ndarray, tuple[int, int, int, int]]]:
    """Split a horizontal 4-frame strip into 4 cropped character sprites."""
    h, w, _ = strip_rgba.shape
    slot_w = w // cols
    slots: list[tuple[np.ndarray, tuple[int, int, int, int]]] = []

    for c in range(cols):
        x0 = c * slot_w
        x1 = w if c == cols - 1 else (c + 1) * slot_w
        sub = keep_largest_component_and_whiskers(strip_rgba[:, x0:x1])
        ys, xs = np.where(sub[:, :, 3] > 0)
        if len(xs) == 0:
            raise ValueError(f"Empty sprite slot at column {c}")
        bx0, bx1 = int(xs.min()), int(xs.max()) + 1
        by0, by1 = int(ys.min()), int(ys.max()) + 1
        crop = sub[by0:by1, bx0:bx1]
        if flip_x:
            crop = np.ascontiguousarray(crop[:, ::-1, :])
        slots.append((crop, (bx0, by0, bx1 - bx0, by1 - by0)))
    return slots


def render_preview(sheet: Image.Image, preview_path: Path) -> None:
    """Write a 4x nearest-neighbor inspection grid over checkerboard, light, and dark strips."""
    scale = 4
    sw, sh = sheet.width * scale, sheet.height * scale
    up = sheet.resize((sw, sh), resample=Image.Resampling.NEAREST)

    pad = 16
    canvas = Image.new("RGBA", (sw + pad * 2, sh * 3 + pad * 4), (235, 235, 232, 255))

    chk_px = np.zeros((sh, sw, 4), dtype=np.uint8)
    tile = 16
    yy, xx = np.indices((sh, sw))
    alt = ((yy // tile) + (xx // tile)) % 2 == 0
    chk_px[alt] = [242, 242, 240, 255]
    chk_px[~alt] = [212, 212, 210, 255]
    chk = Image.fromarray(chk_px, "RGBA")
    chk.alpha_composite(up)

    light = Image.new("RGBA", (sw, sh), (247, 247, 245, 255))
    light.alpha_composite(up)

    dark = Image.new("RGBA", (sw, sh), (18, 19, 22, 255))
    dark.alpha_composite(up)

    canvas.paste(chk, (pad, pad))
    canvas.paste(light, (pad, pad * 2 + sh))
    canvas.paste(dark, (pad, pad * 3 + sh * 2))
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(preview_path)


def snap_crisp_pixel_grid(img: Image.Image) -> Image.Image:
    """Clean JPEG mosquito/compression artifacts around alpha and crisp edges."""
    arr = np.array(img)
    alpha = arr[:, :, 3]
    arr[:, :, 3] = np.where(alpha >= 128, 255, 0).astype(np.uint8)
    arr[arr[:, :, 3] == 0] = [0, 0, 0, 0]
    return Image.fromarray(arr, "RGBA")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--idle", required=True, type=Path)
    parser.add_argument("--wave", required=True, type=Path)
    parser.add_argument("--sleep", required=True, type=Path)
    parser.add_argument("--out-png", required=True, type=Path)
    parser.add_argument("--out-webp", required=True, type=Path)
    parser.add_argument("--preview", required=False, type=Path)
    parser.add_argument("--flip-wave", action="store_true")
    parser.add_argument("--sleep-top-half", action="store_true")
    parser.add_argument("--borrow-idle-tail", action="store_true", help="Copy idle frame 1 tail region onto frame 3 if missing")
    args = parser.parse_args()

    row_configs = [
        (args.idle, False, False),
        (args.wave, args.flip_wave, False),
        (args.sleep, False, args.sleep_top_half),
    ]
    all_rows: list[list[tuple[np.ndarray, tuple[int, int, int, int]]]] = []
    max_raw_w = 1
    max_raw_h = 1

    for idx, (path, flip_x, top_half) in enumerate(row_configs):
        img = Image.open(path).convert("RGBA")
        if top_half:
            img = img.crop((0, 0, img.width, img.height // 2))
        cleaned = extract_alpha_and_despill(np.array(img))
        slots = split_strip_into_slots(cleaned, COLS, flip_x=flip_x)
        if idx == 0 and args.borrow_idle_tail:
            # Copy right-side tail slice from frame 0 onto frame 2 if frame 2 is narrower without tail
            f0, _ = slots[0]
            f2, (bx0, by0, bw2, bh2) = slots[2]
            if f0.shape[1] - f2.shape[1] > int(f0.shape[1] * 0.08):
                target_w = f0.shape[1]
                padded = np.zeros((max(f0.shape[0], f2.shape[0]), target_w, 4), dtype=np.uint8)
                y_off = padded.shape[0] - f2.shape[0]
                padded[y_off:y_off + f2.shape[0], :f2.shape[1]] = f2
                tail_start_x = int(target_w * 0.80)
                f0_y_off = padded.shape[0] - f0.shape[0]
                tail_slice = f0[:, tail_start_x:]
                padded[f0_y_off:f0_y_off + f0.shape[0], tail_start_x:] = np.where(
                    padded[f0_y_off:f0_y_off + f0.shape[0], tail_start_x:, 3:4] > 0,
                    padded[f0_y_off:f0_y_off + f0.shape[0], tail_start_x:],
                    tail_slice,
                )
                slots[2] = (padded, (bx0, by0, padded.shape[1], padded.shape[0]))
        all_rows.append(slots)
        for _, (_, _, bw, bh) in slots:
            max_raw_w = max(max_raw_w, bw)
            max_raw_h = max(max_raw_h, bh)

    # One shared uniform scale across all 12 frames so character size never pops across rows
    shared_scale = min(MAX_W / max_raw_w, MAX_H / max_raw_h)

    sheet = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    for r, slots in enumerate(all_rows):
        # Compute stable head/body horizontal center from row 0 frame 0 width or each sprite's tight body
        for c, (crop_np, (_, _, bw, bh)) in enumerate(slots):
            tw = max(1, round(bw * shared_scale))
            th = max(1, round(bh * shared_scale))
            crop_img = Image.fromarray(crop_np, "RGBA")
            resized = snap_crisp_pixel_grid(crop_img.resize((tw, th), resample=Image.Resampling.NEAREST))

            # Clean stray single-pixel green leftovers after nearest-neighbor downscale
            arr = np.array(resized)
            r_c, g_c, b_c, a_c = arr[:, :, 0].astype(np.int16), arr[:, :, 1].astype(np.int16), arr[:, :, 2].astype(np.int16), arr[:, :, 3]
            green_px = (a_c > 0) & ((g_c - np.maximum(r_c, b_c)) > 16) & (g_c > 75)
            arr[green_px] = [0, 0, 0, 0]
            resized = Image.fromarray(arr, "RGBA")

            dx = c * CELL_W + (CELL_W - tw) // 2
            dy = r * CELL_H + max(2, BASELINE_Y - th)
            sheet.alpha_composite(resized, (dx, dy))

    args.out_png.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out_png, format="PNG")
    sheet.save(args.out_webp, format="WEBP", lossless=True, quality=100, method=6)
    print(f"Saved spritesheet: {args.out_png} ({sheet.width}x{sheet.height}) and {args.out_webp}")

    if args.preview:
        render_preview(sheet, args.preview)
        print(f"Saved inspection preview: {args.preview}")


if __name__ == "__main__":
    main()
