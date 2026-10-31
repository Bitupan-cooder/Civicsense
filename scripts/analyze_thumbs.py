from PIL import Image

for f in ["1793475803107.png", "1793475836520.png", "1793475871836.png", "1793475909720.png"]:
    im = Image.open(f"scratch_preview/thumb_{f}")
    w, h = im.size
    pix = im.load()
    # Check what kind of colors exist besides grey background
    colors = {}
    for y in range(h):
        for x in range(w):
            r, g, b = pix[x, y][:3]
            # if not grey (i.e. max - min > 20 or bright white)
            if max(r, g, b) - min(r, g, b) > 20:
                key = f"color_{r//30*30}_{g//30*30}_{b//30*30}"
                colors[key] = colors.get(key, 0) + 1
            elif r > 240 and g > 240 and b > 240:
                colors["white"] = colors.get("white", 0) + 1
            elif r < 60 and g < 60 and b < 60:
                colors["black"] = colors.get("black", 0) + 1
    print(f"\n{f} contents:")
    for k, v in sorted(colors.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {k}: {v}")

