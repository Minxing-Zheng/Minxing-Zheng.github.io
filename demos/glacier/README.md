# Glacier Observatory

A browser-based reconstruction of the interactive results accompanying **Interactive Visualization and Representation Analysis Applied to Glacier Segmentation**, Minxing Zheng, Xinran Miao, and Kris Sankaran (2022).

## Run locally

Serve `dist` with any static web server, for example:

```sh
python3 -m http.server 8917 --directory dist
```

Open http://localhost:8917. No Node build, Shiny server, or account is required. Use the contents of `dist` as the root for GitHub Pages or another static host. Basemap tiles require an internet connection.

## Explore

Click a map marker, accuracy point, or patch row to select the same case across the map and comparison views. The desktop workbench keeps the map and three image panels together. Use expand controls for detailed inspection, synchronized zoom and pan, swipe, opacity overlay, or visual mask differences. Filter by displayed accuracy, search by patch ID, and keep a local review queue with notes. Notes stay in that browser and can be exported with the selection as CSV.

## Research provenance

All 147 input/reference/prediction triplets and reported pixel accuracies were recovered from the public original Shiny panel. All 147 coordinates were read from its public marker popups, preserving the displayed 0.001-degree precision. These coordinates locate cases; the images are not georeferenced overlays. The collection contains archived outputs, not a model inference service. Visual difference layers are inspection aids and are not new IoU or accuracy measurements.

The default Glacier palette recolors archived mask classes without changing their assignment. The original colors remain available. `dist/assets/provenance.json`, `palette.json`, `glaciers-summary.json`, and preparation scripts document the processing. Glacier context derives from 30,096 archived vector features, with invalid geometries repaired, empty geometries omitted, and class footprints simplified for display. Asset preparation dependencies are separate from the dependency-free browser app.

Original paper: https://doi.org/10.3390/ijgi11080415

Original project: https://github.com/krisrs1128/geo_mlvis

Original panel: https://bruce-zheng.shinyapps.io/glacier_segmententation/

Leaflet and Leaflet.markercluster retain their third-party notices in `lib`. Satellite and map provider attribution is displayed on the map. Original research data and imagery remain subject to their source rights.
