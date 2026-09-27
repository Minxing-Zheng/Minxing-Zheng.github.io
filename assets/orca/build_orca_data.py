"""Prepare reproducible, offline ORCA project-page toy experiments."""

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from dgp_explore import CASES, conformal_quantile, draw, grid_milp, union_area, union_length


def one_run(name, seed):
    case = CASES[name]
    d, k, target = case["d"], 30, .9
    rng = np.random.default_rng(seed)
    _, _, e_explore = draw(case, 300, k, rng)
    q, optimizer = grid_milp(e_explore, target, d, time_limit=15)
    if q is None or optimizer["status"] != 0:
        raise RuntimeError(f"MILP failed for {name}, seed {seed}: {optimizer}")
    y_cal, _, e_cal = draw(case, 1000, k, rng)
    mean = np.sum(np.asarray(case["means"]) * np.asarray(case["weights"])[:, None], axis=0)
    cp_radius = conformal_quantile(np.linalg.norm(y_cal - mean, axis=1), target)
    pcp_radius = conformal_quantile(e_cal.min(axis=1), target)
    multiplier = conformal_quantile(np.min(e_cal / q[None], axis=1), target)
    orca_radii = multiplier * q
    y_test, points_test, e_test = draw(case, 1000, k, rng)
    coverage = {
        "cp": float(np.mean(np.linalg.norm(y_test - mean, axis=1) <= cp_radius)),
        "pcp": float(np.mean(e_test.min(axis=1) <= pcp_radius)),
        "orca": float(np.mean(np.min(e_test / q[None], axis=1) <= multiplier)),
    }
    measure = union_length if d == 1 else lambda p, r: union_area(p, r, cells=100)
    area_count = 250
    sizes = {
        "cp": float(np.mean([measure(mean[None], np.array([cp_radius])) for _ in range(area_count)])),
        "pcp": float(np.mean([measure(p, np.full(k, pcp_radius)) for p in points_test[:area_count]])),
        "orca": float(np.mean([measure(p, orca_radii) for p in points_test[:area_count]])),
    }
    # Use the first test draw with a generated point in the diffuse component
    # so the saved geometry visibly includes both the dense and diffuse parts.
    draw_index = next((i for i, points in enumerate(points_test)
                       if np.any(points[:, 0] > (2.0 if d == 1 else 2.5))), 0)
    display_points = points_test[draw_index]
    display_sizes = {
        "cp": measure(mean[None], np.array([cp_radius])),
        "pcp": measure(display_points, np.full(k, pcp_radius)),
        "orca": measure(display_points, orca_radii),
    }
    return {
        "seed": seed, "coverage": coverage, "size": sizes,
        "optimizer": optimizer,
        "smallerRadii": int(np.sum(orca_radii < pcp_radius)),
        "display": {
            "index": draw_index + 1,
            "response": y_test[draw_index].round(4).tolist(),
            "points": display_points.round(4).tolist(),
            "mean": mean.round(4).tolist(),
            "radii": {"cp": float(cp_radius), "pcp": float(pcp_radius),
                      "orca": orca_radii.round(4).tolist()},
            "size": display_sizes,
        },
    }


def main():
    data = {"method": {
        "target": .9, "exploration": 300, "calibration": 1000,
        "test": 1000, "sizeDraws": 250, "samplesPerResponse": 30,
        "screenedSeeds": [101, 202, 303, 404, 505, 606],
        "displaySeeds": [202, 303, 404], "rankNeighbors": 4,
        "radiusCandidatesPerRank": 15, "mipRelativeGap": .02,
        "areaGridCellsPerAxis": 100,
    }, "cases": {}}
    for name in ["one_visible", "two_visible"]:
        case = CASES[name]
        runs = [one_run(name, s) for s in data["method"]["screenedSeeds"]]
        for run in runs:
            print(name, run["seed"], run["coverage"], run["size"], flush=True)
        data["cases"][name] = {"d": case["d"], "weights": case["weights"],
                              "means": case["means"], "sd": case["sd"],
                              "runs": runs}
    target = Path(__file__).parent / "experiments.json"
    target.write_text(json.dumps(data, separators=(",", ":")))
    print(target)


if __name__ == "__main__":
    main()
