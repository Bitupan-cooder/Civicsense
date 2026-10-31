from PIL import Image

for f in ["extracted_1793475803107.png", "extracted_1793475836520.png", "extracted_1793475871836.png", "extracted_1793475909720.png"]:
    im = Image.open(f"public/flat-assets/civic-transparent/{f}")
    w, h = im.size
    print(f"{f}: size={w}x{h}")
    # check alpha count
    alpha_count = sum(1 for p in im.getdata() if p[3] > 0)
    print(f"  non-transparent pixels: {alpha_count} ({alpha_count/(w*h)*100:.1f}%)")

