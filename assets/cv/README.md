# CV files

- `MinxingZheng_CV.tex` is the editable source for the public GitHub CV.
- `CV_github.pdf` is the public PDF previewed and linked from `/cv/`.
- `MinxingZheng_CV.pdf` is the same public PDF at its former URL, kept for existing links.

To rebuild the public PDF, compile `MinxingZheng_CV.tex` twice, copy the result to both public PDF filenames, and run `ruby ../../scripts/check_cv_consistency.rb`. Keep internship-only wording in the separate local internship CV, outside this public repository.

The website's shared biography lives in `../../_data/profile.yml`, and paper records live in `../../_publications/`. Update those records whenever this CV changes.
