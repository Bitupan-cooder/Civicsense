from PIL import Image
import os

bg_color = (250, 242, 235, 255) # #FAF2EB

for name in ["char-1-recycling.png", "char-2-planting.png", "char-3-megaphone.png", "char-4-auditor.png", "char-5-dispatch.png"]:
    p = os.path.join("public/flat-assets/civic-transparent", name)
    im = Image.open(p)
    # composite onto cream
    comp = Image.new("RGBA", im.size, bg_color)
    comp.paste(im, (0, 0), im)
    # save preview
    os.makedirs("scratch_comp_test", exist_ok=True)
    comp.save(os.path.join("scratch_comp_test", f"comp_{name}"))
    print(f"Composited {name} successfully onto #FAF2EB: size {comp.size}")

