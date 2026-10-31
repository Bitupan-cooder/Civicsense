from PIL import Image

im = Image.open("public/flat-assets/civic-cutouts/char-1-recycling.png")
cream = Image.new("RGBA", im.size, (250, 242, 235, 255))
cream.paste(im, (0, 0), im)
cream.save("char1_on_cream_verified.png")
print("Saved char1_on_cream_verified.png, size:", cream.size)

