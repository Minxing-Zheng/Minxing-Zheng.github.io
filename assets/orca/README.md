# ORCA project-page examples

The project page embeds `experiments.json` so its 1D and 2D panels work without
network requests. The same JSON is published separately for inspection.

To regenerate it from the synthetic Gaussian-mixture settings:

```sh
python3 -m pip install numpy scipy
python3 assets/orca/build_orca_data.py
```

The script uses four fixed seeds, 300 exploration cases, 1,000 calibration
cases, 1,000 independent test cases, and 30 generated samples per case. ORCA
radii come from a discretized MILP with 15 candidates per rank and a 2% MIP
gap. Mean set size uses the first 250 test draws. One-dimensional union length
is exact; two-dimensional union area uses a 100 × 100 integration grid.

These settings illustrate coverage allocation. They are not the paper's
benchmark data or its full-candidate exact MILP. At the 90% target, the rare,
diffuse mixture component is intentionally positioned where reallocation can
help; the four seeds show variation, including a near tie in one 2D run.
