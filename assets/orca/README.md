# ORCA project-page examples

The project page embeds `experiments.json` so its 1D and 2D panels work without
network requests. The same JSON is published separately for inspection.

To regenerate it from the synthetic Gaussian-mixture settings:

```sh
python3 -m pip install numpy scipy
python3 assets/orca/build_orca_data.py
```

The script uses six fixed seeds, 300 exploration cases, 1,000 calibration
cases, 1,000 independent test cases, and 30 generated samples per case. ORCA
radii come from a discretized MILP with 15 candidates per rank and a 2% MIP
gap. Mean set size uses the first 250 test draws. One-dimensional union length
is exact; two-dimensional union area uses a 100 × 100 integration grid.

The UI shows seeds 202, 303, and 404 as Experiments 1–3 because ORCA's mean
set size is smaller than PCP's in those runs for both dimensions. The JSON
retains all six screened seeds, including ties and unfavorable outcomes. The
displayed set is the first test draw containing a generated sample in the
diffuse component. This is a selected illustration, not a random-sample
performance estimate.

The 1D mixture has weights 60/32/8 and three components. The 2D mixture has
weights 92/8, with a closer and narrower diffuse component than the earlier
page. Tested 60/20/20 mixtures did not generally give smaller ORCA sets at
the 90% target. These experiments are not the paper's benchmark data or its
full-candidate exact MILP.
