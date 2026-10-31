from PIL import Image

ref_path = "C:/Users/Bitupan Deka/.gemini/antigravity/brain/32a27d61-f613-45f9-8638-d0b059c51812/.user_uploaded/media_1793476019804_2b1a1c8d.jpg"
ref = Image.open(ref_path)

# Character 1: x from 90 to 265, y from 240 to 500
c1 = ref.crop((85, 230, 275, 505)).convert("RGBA")
w, h = c1.size
pix = c1.load()

visited = set()
queue = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)]
for x in range(w):
    queue.append((x, 0))
    queue.append((x, h-1))
for y in range(h):
    queue.append((0, y))
    queue.append((w-1, y))

while queue:
    x, y = queue.pop(0)
    if (x, y) in visited: continue
    if not (0 <= x < w and 0 <= y < h): continue
    
    r, g, b, a = pix[x, y]
    is_line = (r > 130 and b > 140) or (r > 160)
    if is_line:
        continue
        
    visited.add((x, y))
    for nx, ny in [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]:
        if (nx, ny) not in visited:
            queue.append((nx, ny))

out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
out_pix = out.load()

for y in range(h):
    for x in range(w):
        if (x, y) not in visited:
            r, g, b, a = pix[x, y]
            if (r > 130 and b > 140) or (r > 160):
                out_pix[x, y] = (255, 255, 255, 255)
            else:
                out_pix[x, y] = (23, 183, 61, 255)

out.save("scratch_c1_flood.png")
print("Saved scratch_c1_flood.png, visited count:", len(visited))
