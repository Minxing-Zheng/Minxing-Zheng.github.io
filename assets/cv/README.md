# CV files

- `MinxingZheng_CV.tex` is the editable LaTeX source.
- `MinxingZheng_CV.pdf` is the public PDF previewed and linked from `/cv/`.

To rebuild the PDF in this folder, run `pdflatex -interaction=nonstopmode MinxingZheng_CV.tex` twice. The repository ignores LaTeX auxiliary files. After editing, run `ruby ../../scripts/check_cv_consistency.rb` from this folder or from the repository root.

The website's shared biography lives in `../../_data/profile.yml`, and paper records live in `../../_publications/`. Update those records whenever this CV changes.
