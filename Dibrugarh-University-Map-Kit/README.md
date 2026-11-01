# Dibrugarh University map kit

Prepared for the juniors' hackathon project from the Treasure Hunt map on 30 October 2026.
Start with **index.html**. It is a self-contained, offline HTML/Canvas map: no PHP,
database, API key or package installation is needed to explore it.

## What the map is made of

- Geographic vector roads, building footprints, boundaries and land-cover polygons.
- OpenStreetMap source geometry plus Overture building footprints.
- 91 reviewed named places, including 83 inside the approximate campus outline.
  Public references and aliases are retained. This is not a complete Google Maps export.
- An approximate combined campus outline and a 500 m buffer around it.
- 207 source road segments, 4,030 footprints, 16 base land-cover features,
  260 historical land-cover features and 1,390 decorative tree placements.
- Original pixel tree artwork and a 60-character pixel sprite sheet.
- Browser Canvas/JavaScript renderer and native Android Canvas/Kotlin renderer.
- Offline WGS84 GPS-to-map conversion. The map is vector geometry with pixel styling,
  not a screenshot, Google Maps SDK, or a grid of downloaded Google map tiles.

## Open and explore

Double-click **index.html** in a modern browser. It embeds the map, fonts, tree sprite
and projection library. Pan, pinch/scroll to zoom, search places and inspect coordinates.
The companion files must stay beside it if you use its download buttons.

For the separate character-marker example, serve this folder:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/examples/markers.html`. Its six sample markers are examples,
not real teams. The GPS button uses only the current device and does not upload its location.
Browser GPS requires permission and HTTPS or localhost. To use it on another phone,
host the kit on HTTPS; a plain LAN HTTP address is not enough for browser geolocation.

## Files for your project

| File/folder | Purpose |
| --- | --- |
| index.html | Complete ready-to-open interactive atlas |
| map-data.json | Current local-metre rendering data; same bytes as the APK asset |
| campus-data.geojson | Full geographic vector export, WGS84 longitude/latitude |
| layers/ | Separate roads, buildings, places, areas, historical cover, boundaries, buffer and decorative trees |
| place-index.csv | All reviewed names and geographic coordinates |
| Dibrugarh-University-Pixel-Map.svg | Scalable, editable full-map artwork |
| Dibrugarh-University-Pixel-Map.png | 6400-pixel-wide rendered map |
| .pgw and .prj companions | PNG georeferencing for GIS software; keep matching filenames |
| Map-overview.png / Campus-detail.png | Quick review images |
| assets/ | Original and small tree sprites, projection library, font and licences |
| elements/ | Editable SVG sheet, WebP sheet, preview and IDs for all 60 characters |
| examples/ | Reusable character-marker renderer and a static browser example |
| android/ | The four native map classes, assets, tests and integration guide |
| data/ | Cached geographic sources and review references for rebuilding |
| PROVENANCE.md | Original source notes, source URLs, review method and limitations |
| manifest.json | File sizes, hashes and map counts for this export |

## GPS and coordinates

Phone positions are WGS84: latitude/longitude in decimal degrees.
GeoJSON uses `[longitude, latitude]`, in that order.
Rendering uses WGS84 / UTM zone 46N (EPSG:32646), in metres, with Y increasing down.

```js
// After loading assets/proj4.js and gps-projection.js:
const p = CampusGPS.project(latitude, longitude, mapData.meta);
const onMap = CampusGPS.inExtent(p, mapData.meta);
const original = CampusGPS.unproject(p.x, p.y, mapData.meta);
```

The local origin is `meta.utmOrigin`: `[685599.7381476436, 3038806.406835988]`.
`x = easting - origin[0]`; `y = origin[1] - northing`.
The extent is approximately 3,141.49 m × 2,357.16 m. Never mix image pixels with metres.
Keep the reported accuracy circle and last-fix time; do not force an outside fix onto campus.
Accurate coordinate conversion cannot correct a weak phone GPS fix or an incorrect source pin.

## Character markers and live locations

The sheet is 640 × 480 pixels: 10 columns × 6 rows, each frame 64 × 80 pixels.
IDs 0–59 choose distinct characters. The character's feet anchor to its map coordinate.
`elements/team-characters.svg` is editable; the WebP is the small runtime version.

The example exposes the existing renderer without the PHP server dependency:

```js
const map = await HuntAtlas.create(canvas, hit => console.log(hit));
map.setData([{
  id: 'example', name: 'Example team', avatar_id: 12,
  location: {lat: 27.448067, lon: 94.8953513, accuracy: 8, sampled_at: Date.now()}
}]);
```

No real participant locations are included. To show multiple real devices, your project
must collect consented GPS fixes and provide its own backend/update transport.
The renderers draw supplied locations; they are not a location-tracking service.

## Routing is separate

Roads here are geographic line features, not a ready-to-use connected navigation graph.
For directions, split roads at valid intersections, connect accessible paths and entrances,
retain access restrictions and run a routing algorithm such as Dijkstra or A*.
The native renderer contains optional Dijkstra routing over supplied verified nodes/edges;
this kit does not include event routes, checkpoint assignments or a surveyed walking graph.
Do not draw straight-line directions through buildings or forests.

## Editing and rebuilding (optional)

No rebuild is required to use the existing files. For source changes, use a new virtual environment:

```sh
python -m venv .venv
# Activate it using the command appropriate to your operating system.
python -m pip install -r requirements-rebuild.txt
python build_map.py
python package_map.py
python verify_projection.py
python verify_places.py
```

Node.js is also required by the two verification scripts. Cached source files are included;
the scripts do not re-download sources. package_map.py has been adjusted to use the local font.
build_map.py regenerates map-data.json and the geographic outputs from the cached sources.
Before verify_places.py or using the Android version after a rebuild, copy the new
map-data.json to android/app/src/main/assets/campus_atlas.json.
The separate layers/ exports and examples are snapshots: regenerate those layers from
new map-data.json if you change geographic data. manifest.json describes this delivered kit.

## Sources, attribution and limits

Preserve **ATTRIBUTION.md**, the bundled licences and the per-feature source references.
The kit combines content from different sources; it does not attach a new blanket licence
to all third-party material. Original project code/artwork is supplied for your requested
hackathon reuse; third-party source terms still apply.

The boundary is approximate, not an official property survey. Historical land cover is
derived from the 2020 university audit. Trees are decoration, not surveyed trees.
Source geometry dates to 17 October 2026; the place review is dated 18 October 2026.
Coverage, access and place pins need field checks before safety-critical or navigation use.
There is no guarantee that every campus path or Google Maps label is included.

Only map material is included. No production accounts, passwords, database configuration,
signing keys, QR identities, riddles, real team records, APK or full organizer dashboard.
