import os
print('--- Flat Assets ---')
for root, dirs, files in os.walk('Flat Assets'):
    for f in files:
        if not f.startswith('.'):
            p = os.path.join(root, f)
            print(p, os.path.getsize(p))

