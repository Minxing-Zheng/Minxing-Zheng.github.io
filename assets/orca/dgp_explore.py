"""Offline screening of transparent ORCA/PCP toy DGPs (not a paper benchmark)."""

from __future__ import annotations

import argparse
import json
import time

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import coo_matrix


CASES = {
    "one_tail": {"d": 1, "weights": [.90, .10], "means": [[-1.5], [2.7]], "sd": [.38, 1.35]},
    "one_two_modes": {"d": 1, "weights": [.50, .40, .10], "means": [[-1.8], [1.4], [3.0]], "sd": [.30, .28, 1.40]},
    "one_hetero": {"d": 1, "weights": [.75, .18, .07], "means": [[-1.4], [1.5], [3.4]], "sd": [.28, .68, 1.80]},
    "one_sparse_outliers": {"d": 1, "weights": [.92, .08], "means": [[-1.0], [12.0]], "sd": [.32, 2.60]},
    "two_tail": {"d": 2, "weights": [.90, .10], "means": [[-1.5, 0], [2.4, .5]], "sd": [.42, 1.35]},
    "two_two_modes": {"d": 2, "weights": [.46, .44, .10], "means": [[-1.7, -.3], [1.6, -.3], [0, 2.3]], "sd": [.34, .38, 1.55]},
    "two_hetero": {"d": 2, "weights": [.74, .18, .08], "means": [[-1.4, -.3], [1.5, .2], [1.8, 2.4]], "sd": [.32, .72, 1.50]},
    "two_sparse_outliers": {"d": 2, "weights": [.92, .08], "means": [[-1.0, 0], [5.0, 5.0]], "sd": [.32, 2.50]},
    "two_sparse_three_modes": {"d": 2, "weights": [.46, .46, .08], "means": [[-2.0, 0], [2.0, 0], [0, 6.0]], "sd": [.30, .36, 2.50]},
}


def draw(case, n, k, rng):
    weights = np.asarray(case["weights"])
    means = np.asarray(case["means"])
    sd = np.asarray(case["sd"])
    labels = rng.choice(len(weights), size=n, p=weights)
    y = means[labels] + rng.normal(size=(n, case["d"])) * sd[labels, None]
    plabels = rng.choice(len(weights), size=(n, k), p=weights)
    points = means[plabels] + rng.normal(size=(n, k, case["d"])) * sd[plabels, None]
    pair = np.linalg.norm(points[:, :, None, :] - points[:, None, :, :], axis=-1)
    near = np.sort(pair, axis=-1)[:, :, 1:5].mean(axis=-1)
    order = np.argsort(near, axis=1, kind="stable")
    ranked = np.take_along_axis(points, order[:, :, None], axis=1)
    distances = np.linalg.norm(y[:, None, :] - ranked, axis=-1)
    return y, ranked, distances


def conformal_quantile(values, target):
    index = int(np.ceil((len(values) + 1) * target)) - 1
    return np.sort(values)[index]


def grid_milp(explore, target, d, levels_count=15, time_limit=15):
    n, k = explore.shape
    needed = int(np.ceil(n * target))
    percentiles = np.linspace(.08, 1, levels_count - 1)
    levels = np.column_stack([
        np.r_[.005, np.quantile(explore[:, r], percentiles)] for r in range(k)
    ]).T
    n_choice = k * levels_count
    n_var = n_choice + n
    objective = np.zeros(n_var)
    objective[:n_choice] = (levels ** d).ravel()
    rows, cols, values = [], [], []
    # Each rank chooses one radius, including the near-zero radius.
    for r in range(k):
        for l in range(levels_count):
            rows.append(r)
            cols.append(r * levels_count + l)
            values.append(1)
    # A response can count as covered only if a chosen rank radius covers it.
    for i in range(n):
        row = k + i
        rows.append(row)
        cols.append(n_choice + i)
        values.append(1)
        for r in range(k):
            covered = np.flatnonzero(explore[i, r] <= levels[r])
            rows.extend([row] * len(covered))
            cols.extend((r * levels_count + covered).tolist())
            values.extend([-1] * len(covered))
    for i in range(n):
        rows.append(k + n)
        cols.append(n_choice + i)
        values.append(1)
    matrix = coo_matrix((values, (rows, cols)), shape=(k + n + 1, n_var)).tocsr()
    lower = np.r_[np.ones(k), np.full(n, -np.inf), needed]
    upper = np.r_[np.ones(k), np.zeros(n), np.inf]
    start = time.monotonic()
    result = milp(objective, integrality=np.ones(n_var), bounds=Bounds(0, 1),
                  constraints=LinearConstraint(matrix, lower, upper),
                  options={"time_limit": time_limit, "mip_rel_gap": .02})
    runtime = time.monotonic() - start
    if result.x is None:
        return None, {"status": int(result.status), "message": result.message, "seconds": runtime}
    chosen = np.argmax(result.x[:n_choice].reshape(k, levels_count), axis=1)
    q = levels[np.arange(k), chosen]
    return q, {"status": int(result.status), "message": result.message,
               "seconds": round(runtime, 2), "mip_gap": float(getattr(result, "mip_gap", np.nan))}


def union_length(points, radii):
    intervals = np.column_stack([points[:, 0] - radii, points[:, 0] + radii])
    intervals = intervals[np.argsort(intervals[:, 0])]
    total = 0.0
    start, end = intervals[0]
    for left, right in intervals[1:]:
        if left <= end:
            end = max(end, right)
        else:
            total += end - start
            start, end = left, right
    return total + end - start


def union_area(points, radii, cells=50):
    low = np.min(points - radii[:, None], axis=0)
    high = np.max(points + radii[:, None], axis=0)
    x = low[0] + (np.arange(cells) + .5) * (high[0] - low[0]) / cells
    y = low[1] + (np.arange(cells) + .5) * (high[1] - low[1]) / cells
    grid = np.stack(np.meshgrid(x, y), axis=-1).reshape(-1, 2)
    inside = np.any(np.sum((grid[:, None] - points[None]) ** 2, axis=-1) <= radii[None] ** 2, axis=1)
    return inside.mean() * np.prod(high - low)


def run_case(name, seed, n_explore, n_cal, n_test, k, target, time_limit):
    case = CASES[name]
    rng = np.random.default_rng(seed)
    _, _, e_explore = draw(case, n_explore, k, rng)
    q, opt = grid_milp(e_explore, target, case["d"], time_limit=time_limit)
    if q is None:
        return {"case": name, "seed": seed, "optimizer": opt}
    _, _, e_cal = draw(case, n_cal, k, rng)
    pcp_radius = conformal_quantile(e_cal.min(axis=1), target)
    t = conformal_quantile(np.min(e_cal / q[None], axis=1), target)
    orca_radii = t * q
    _, test_points, e_test = draw(case, n_test, k, rng)
    pcp_cover = np.mean(e_test.min(axis=1) <= pcp_radius)
    orca_cover = np.mean(np.min(e_test / q[None], axis=1) <= t)
    area_n = min(n_test, 250 if case["d"] == 1 else 80)
    measure = union_length if case["d"] == 1 else union_area
    pcp_size = np.mean([measure(points, np.full(k, pcp_radius)) for points in test_points[:area_n]])
    orca_size = np.mean([measure(points, orca_radii) for points in test_points[:area_n]])
    return {"case": name, "seed": seed, "optimizer": opt, "pcp_coverage": float(pcp_cover),
            "orca_coverage": float(orca_cover), "pcp_size": float(pcp_size),
            "orca_size": float(orca_size), "size_ratio": float(orca_size / pcp_size),
            "pcp_radius": float(pcp_radius), "smaller_radii": int(np.sum(orca_radii < pcp_radius)),
            "radii": orca_radii.round(3).tolist()}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", nargs="*", default=list(CASES))
    parser.add_argument("--seeds", type=int, nargs="*", default=[713])
    parser.add_argument("--explore", type=int, default=250)
    parser.add_argument("--cal", type=int, default=1000)
    parser.add_argument("--test", type=int, default=1000)
    parser.add_argument("--k", type=int, default=20)
    parser.add_argument("--target", type=float, default=.9)
    parser.add_argument("--time-limit", type=float, default=15)
    args = parser.parse_args()
    for case_name in args.cases:
        for seed in args.seeds:
            print(json.dumps(run_case(case_name, seed, args.explore, args.cal, args.test,
                                      args.k, args.target, args.time_limit)), flush=True)
