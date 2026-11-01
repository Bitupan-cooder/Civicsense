# Dibrugarh University pixel vector atlas

Open `index.html` in a modern browser, or visit the local preview at
http://127.0.0.1:8160/ while its preview server is running.

The preview includes 207 source road ways, 4,030 building footprints and 91
reviewed named destinations (83 within the approximate campus outline, eight
nearby). Names and coordinates were checked against 99 visible Google Maps
references on 18 October 2026, with academic names from the university directory.
It covers a combined campus review outline and a 500 m
buffer. Coordinates and vectors are bundled; exploring and searching need no
internet connection once the page is loaded. `index.html` is self-contained.
Download buttons expect the companion files beside it.

## Controls

- Drag, pinch, scroll, double-click, or use +/− to zoom and pan.
- The campus button frames the campus; the full-map button includes the buffer.
- Search canonical names or source aliases, including departments, hostels and shops.
- Count badges group nearby places. Tap one for every member; zoom in to separate
  markers and show fuller names. Selected names wrap without truncation.
- Expand **Map key & GPS coordinates** to enter a latitude and longitude.
- Tap an empty map location to read its WGS84 coordinate.
- Press **◎** to request your device location, display its reported accuracy
  circle and follow it. Dragging stops following. GPS can be stopped explicitly.
- Arrow keys pan, +/− zoom, and Home fits the complete map.

Browser location requires HTTPS or localhost, permission, and a location-capable
device. Desktop browser positions can be much less accurate than outdoor phone
GPS. No GPS coordinates are uploaded by this preview. Real-phone GPS and pinch
gestures still need a device test; browser checks covered buttons, search and
manual coordinate placement.

## GPS compatibility and limits

Phone coordinates use WGS84 latitude/longitude. Map coordinates use WGS84 / UTM
zone 46N (EPSG:32646), in metres. The browser bundles Proj4js 2.22.0 offline.
`gps-projection.js` accepts `(latitude, longitude, metadata)` and converts the
fix to the same metric coordinate space as every road and building. GeoJSON
exports retain standard `[longitude, latitude]` order.

`utmOrigin` in `map-data.json` is the top-left easting/northing. Conversion is:

```
x = UTM easting − utmOrigin[0]
y = utmOrigin[1] − UTM northing
```

The projection was checked against Python PROJ at 532 points, including every
place and a 21×21 grid. `verification.json` records the numerical errors and
fix-validation checks. This validates coordinate conversion, not GPS sensor
accuracy or the actual positions of source features.

Fixes older than 15 seconds are displayed as stale. Reported accuracy worse
than 25 m is displayed as weak; it is never silently treated as precise. An
out-of-map position is rejected or reported outside, rather than snapped onto
the campus. A phone fix's accuracy circle must remain visible during an event.

**The campus outline is approximate.** It combines the OpenStreetMap university
polygon with an approximately georeferenced 2020 university audit outline that
includes the western section. It is not an official property survey. Some
public place listings have alternate pins that disagree; those references and
confirmation notes are retained. Some footprints are machine detected.
Current access, omitted paths, new buildings and boundary
changes must be checked on campus. There is no guarantee that every Google Maps
label, every campus place, or every real-world road is present.

Before using GPS to accept an event QR scan, survey that QR's actual outdoor
position, retain measured accuracy and inspection date, and check its approach
path. Android 2.3 uses this reviewed atlas for display. Actual signed event QR
coordinates and the PHP admin draft/database are unchanged. This update does
not publish a new event. `campus-data.geojson` is available for geographic import.

## Files

- `Dibrugarh-University-Pixel-Map.svg`: scalable vector artwork; full source-name
  labels and building/road geometry. Pixel tree symbols are embedded images.
- `Dibrugarh-University-Pixel-Map.png`: 6400×5383 high-resolution sheet.
- `.pgw` + `.prj`: metric georeferencing for the PNG, including its title margin.
- `Map-overview.png` / `Campus-detail.png`: compact review images.
- `campus-data.geojson`: geographic vectors and source IDs, WGS84.
- `map-data.json`: offline rendering data in local metric map coordinates.
- `place-index.csv`: all 91 reviewed destination names and coordinates.
- `data/reviewed-places.json`: 99 public references; excluded units and review method.
- `place-review-report.json`: duplicate, exclusion and source-collision decisions.
- `place-verification.json`: provenance, Android asset and lossless zoom checks.
- `coverage-report.json` / `verification.json`: coverage, limitations and checks.
- `assets/proj4-LICENSE.md`: Proj4js license. The original generated tree artwork
  is kept unchanged; a smaller packaged sprite is used for rendering speed.

## Sources and attribution

- © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright),
  [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
  [University way 1370897159](https://www.openstreetmap.org/way/1370897159).
  The raw source extract is included in the complete source folder under
  `data/dibrugarh-source.osm`. Every source highway way intersecting the buffer
  is retained, including unnamed ways. Road *ways* are source segments, not
  necessarily distinct named streets.
- [Overture Maps Foundation](https://docs.overturemaps.org/attribution/), release
  2026-09-23.1. Building sources include OpenStreetMap, Google Open Buildings
  and Microsoft, under the applicable ODbL / CC BY terms. Place data comes from
  Meta and Microsoft under CDLA Permissive 2.0. Public source positions have
  not been verified by a campus survey.
- [Google Maps](https://www.google.com/maps) public place cards and
  [Dibrugarh University department directory](https://www.dibru.ac.in/department-centre):
  manually reviewed names/coordinates on 18 October 2026. Every mapped place
  retains its direct reference URL. Five duplicate listings are merged and three
  conflicting/generic listings are excluded. Languages and Physical Education &
  Sports are omitted at the user's request. The Mechanical Engineering alias
  uses the institute pin; its individual wing has not been independently located.
- [Dibrugarh University Green and Carbon Audit 2020](https://oldweb.dibru.ac.in/wp-content/uploads/2021/11/Green-and-Carbon-Audit_BP2.pdf),
  printed page 30: historical land cover and approximate western outline.
  The original report is linked for provenance rather than included in the
  downloadable map bundle. The land-cover layer can be turned off.
- Decorative pixel tree canopy made with the built-in image-generation tool.
  It does not identify or position individual real trees. See `ASSET_PROMPT.md`.

Geometry retrieved 17 October 2026; place review 18 October 2026. This is an
original map style with open source geometry and manually reviewed public names.

## Rebuild

The portable ZIP contains the finished viewer and geographic import files.
The build scripts and cached downloads remain in the project's `map-preview`
source folder; they are not required to view the ZIP.

Use the project's Python virtual environment with Pillow, OpenCV, NumPy,
Shapely, pyproj and PyMuPDF. Node is needed only for verification.

```
python build_map.py
python package_map.py
python verify_projection.py
python verify_places.py
```

`build_map.py` uses the cached source files. Downloads are not repeated during
a rebuild. `fetch_overture.py` is an optional range-read fallback for retrieval;
the main download used the official Overture CLI. No map keys are required.
