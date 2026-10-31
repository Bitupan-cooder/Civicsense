from PIL import Image

im = Image.open("c1_exact_box.png").convert("RGBA")
w, h = im.size
pix = im.load()

# Step 1: Blank out the small speech bubble tip in top-left:
# x < 40, y < 40
for y in range(40):
    for x in range(40):
        # replace with background green (71, 217, 106)
        pix[x, y] = (71, 217, 106, 255)

# Step 2: Now flood-fill from the exterior to find all background pixels!
# Background is green: g > 150, r < 125, b < 140
# White lines: (r > 130 and b > 135) or (r > 155)
# Boundary stops at white lines!

visited = set()
queue = []
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
    # Check if this pixel is a line of the boy
    is_line = (r > 130 and b > 135) or (r > 155 and g > 190)
    if is_line:
        # Stop at the character's outline!
        continue
        
    visited.add((x, y))
    for nx, ny in [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]:
        if (nx, ny) not in visited:
            queue.append((nx, ny))

# Create transparent image
out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
out_pix = out.load()

# Also let's match the exact style of the other 4 characters:
# Inside body: green (23, 183, 61, 255)
# Outlines: crisp white (255, 255, 255, 255)
for y in range(h):
    for x in range(w):
        if (x, y) not in visited:
            r, g, b, a = pix[x, y]
            is_line = (r > 130 and b > 135) or (r > 155 and g > 190)
            if is_line:
                out_pix[x, y] = (255, 255, 255, 255)
            else:
                out_pix[x, y] = (23, 183, 61, 255)

out.save("c1_segmented.png")
print("Saved c1_segmented.png, non-visited pixels:", (w*h) - len(visited))

