# Reuse the native Kotlin map

These are map components, not a full APK project. Add them to an existing native Android
application (the original app uses minSdk 28). No Google Maps SDK, Compose or map key is needed.

1. Copy app/src/main/java/com/campushunt/app/*.kt into your module; rename package declarations if needed.
2. Copy app/src/main/assets/* to your module's assets directory.
3. Create `CampusMapView(context)` and give it screen space.
4. Connect your own Android GPS provider and runtime permission flow.

```kotlin
val map = CampusMapView(this)
setContentView(map)
map.setData(
    JSONObject().put("team_name", "Example team").put("avatar_id", 12),
    null,
    JSONObject().put("lat", 27.448067).put("lon", 94.8953513).put("accuracy", 8.0)
)
```

Import `org.json.JSONObject`. The source uses only Android/platform APIs and Kotlin's
standard library. Android provides org.json. The view reads campus_atlas.json, atlas_tree.png
and team_characters.webp. MapLabels handles clustering; CampusCoordinates handles GPS projection.

For rival characters, call setOpponents with an object containing `mode: "live"` and
a `points` array of `{name, avatar_id, lat, lon, as_of, radius_m, stale}` objects, plus
the current server time in milliseconds. This kit includes no rival-location backend.
Use measured GPS accuracy for radius_m and keep fix timestamps; respect participant privacy.

For place selection, set onNodeSelected/onPlaceGroupSelected and present your own UI.
Optional routing uses a supplied content package's verified checkpoints and edges.
No event/secret data is provided. See the root README's routing notes before enabling it.

If collecting device fixes, declare ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION,
request the appropriate runtime permissions, handle denial and stop updates with the lifecycle.
The view itself does not request permission, obtain GPS or make network calls.

The copied test sources are references for an existing Gradle project:
CampusCoordinatesTest/MapLabelsTest use JUnit 4; TeamCharactersTest also needs Robolectric.
projection-fixtures.json contains public place coordinates, not participant data.
No Gradle wrapper, signing configuration or application secrets are included.
