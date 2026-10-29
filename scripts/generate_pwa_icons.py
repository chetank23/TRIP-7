import zlib
import struct
import math
import os

def create_pwa_icon(size, filename):
    # Generates a PNG icon for size x size
    raw = bytearray()
    
    # Pre-render logic for squircle icon
    corner_radius = size * 0.225
    margin = size * 0.03
    inner_box = size - 2 * margin
    
    for y in range(size):
        raw.append(0) # PNG filter type 0 (None)
        ny = y / size # 0 to 1
        for x in range(size):
            nx = x / size # 0 to 1
            
            # Check rounded box bounds
            dx = max(abs(x - size/2) - (size/2 - margin - corner_radius), 0)
            dy = max(abs(y - size/2) - (size/2 - margin - corner_radius), 0)
            dist_from_corner = math.sqrt(dx*dx + dy*dy)
            
            if dist_from_corner > corner_radius:
                # Outside squircle -> transparent
                raw.extend([0, 0, 0, 0])
                continue
                
            # Antialiasing border
            alpha = 255
            if dist_from_corner > corner_radius - 1.5:
                alpha = int(255 * max(0.0, min(1.0, (corner_radius - dist_from_corner) / 1.5)))
                
            # Background Gradient from #EF4444 (239, 68, 68) to #B91C1C (185, 28, 28)
            t = (nx + ny) / 2.0
            r = int(239 * (1 - t) + 185 * t)
            g = int(68 * (1 - t) + 28 * t)
            b = int(68 * (1 - t) + 28 * t)
            
            # Draw Palm Tree center symbol
            cx = size / 2.0
            cy = size * 0.44
            
            # Normalized relative coordinates from center
            rx = (x - cx) / (size * 0.5)
            ry = (y - cy) / (size * 0.5)
            
            # Trunk: vertical slender curved path
            in_trunk = False
            if -0.25 <= ry <= 0.45:
                trunk_w = 0.05 + 0.03 * (ry - (-0.25))
                trunk_center = 0.02 * math.sin(ry * 3)
                if abs(rx - trunk_center) < trunk_w:
                    in_trunk = True
                    
            # Palm fronds (5 stylized leaves radiating outwards)
            in_frond = False
            frond_coords = [
                # (angle, length, width)
                (-2.4, 0.45, 0.08),
                (-1.8, 0.55, 0.09),
                (-1.57, 0.60, 0.09),
                (-1.3, 0.55, 0.09),
                (-0.7, 0.45, 0.08),
            ]
            for f_ang, f_len, f_wid in frond_coords:
                # Rotate point by -f_ang
                cos_a = math.cos(-f_ang)
                sin_a = math.sin(-f_ang)
                # frond origin is ry = -0.22, rx = 0
                px = rx
                py = ry - (-0.22)
                fx = px * cos_a - py * sin_a
                fy = px * sin_a + py * cos_a
                if 0 <= fx <= f_len:
                    # Leaf shape
                    curve = math.sin((fx / f_len) * math.pi) * f_wid
                    if abs(fy) < curve:
                        in_frond = True
                        break
                        
            # Text area "BVC" banner or letters
            in_text = False
            # BVC Banner line at bottom
            if 0.65 <= ry <= 0.78 and abs(rx) < 0.65:
                # Draw thick BVC block letters
                bx = (rx + 0.65) / 1.3 # 0 to 1
                by = (ry - 0.65) / 0.13 # 0 to 1
                
                # Letter 'B' (bx from 0.1 to 0.3)
                if 0.12 <= bx <= 0.32:
                    if bx <= 0.17 or by <= 0.22 or by >= 0.78 or (0.42 <= by <= 0.58) or (bx >= 0.27 and (0.15 <= by <= 0.45 or 0.55 <= by <= 0.85)):
                        in_text = True
                # Letter 'V' (bx from 0.4 to 0.6)
                elif 0.40 <= bx <= 0.60:
                    v_center = 0.50
                    v_target_x = 0.50 + (by - 1.0) * 0.10 if bx < 0.50 else 0.50 - (by - 1.0) * 0.10
                    if abs(bx - v_target_x) <= 0.045:
                        in_text = True
                # Letter 'C' (bx from 0.68 to 0.88)
                elif 0.68 <= bx <= 0.88:
                    if bx <= 0.74 or by <= 0.22 or by >= 0.78 or (bx >= 0.82 and (by <= 0.35 or by >= 0.65)):
                        in_text = True

            if in_trunk:
                # Golden peach trunk
                r, g, b = 255, 196, 155
            elif in_frond:
                # Crisp warm white frond
                r, g, b = 255, 251, 245
            elif in_text:
                # Bright white letters
                r, g, b = 255, 255, 255

            raw.extend([r, g, b, alpha])

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')

    os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else '.', exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(png)
    print(f"Generated {filename} ({size}x{size})")

create_pwa_icon(192, 'public/icon-192.png')
create_pwa_icon(512, 'public/icon-512.png')
create_pwa_icon(180, 'public/apple-touch-icon.png')
