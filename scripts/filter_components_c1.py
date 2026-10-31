from PIL import Image

im = Image.open("c1_segmented.png")
w, h = im.size
pix = im.load()

# Connected component analysis
visited = set()
components = []
for y in range(h):
    for x in range(w):
        if pix[x, y][3] > 0 and (x, y) not in visited:
            comp = []
            queue = [(x, y)]
            visited.add((x, y))
            while queue:
                cx, cy = queue.pop(0)
                comp.append((cx, cy))
                for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1), (cx+1, cy+1), (cx-1, cy-1), (cx+1, cy-1), (cx-1, cy+1)]:
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited and pix[nx, ny][3] > 0:
                        visited.add((nx, ny))
                        queue.append((nx, ny))
            components.append(comp)

components.sort(key=len, reverse=True)
print(f"Total components: {len(components)}")
for i in range(min(5, len(components))):
    comp = components[i]
    min_x = min(x for x, y in comp)
    max_x = max(x for x, y in comp)
    min_y = min(y for x, y in comp)
    max_y = max(y for x, y in comp)
    print(f"Component {i}: size={len(comp)}, bbox=({min_x},{min_y} - {max_x},{max_y})")

