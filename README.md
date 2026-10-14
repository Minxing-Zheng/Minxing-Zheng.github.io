# Minxing Zheng — Personal Academic Website

Source for [minxing-zheng.github.io](https://minxing-zheng.github.io), a Jekyll site hosted by GitHub Pages.

The local website folder is `~/Documents/GitHub/Minxing-Zheng.github.io`. This is the permanent checkout to edit; the folders under `~/Documents/Codex/` are task workspaces.

## The easiest update workflow

1. Pull the newest version before editing:

   ```bash
   git pull origin master
   ```

2. Update the shared data and content listed below.
3. Run `ruby scripts/check_cv_consistency.rb`, then preview locally with `bundle exec jekyll serve` and open `http://localhost:4000`.
4. Publish:

   ```bash
   git add .
   git commit -m "Update website"
   git push origin master
   ```

GitHub Pages rebuilds the public site automatically after the push. The deployment status appears under the repository’s **Actions** tab.

## Where to edit

- Shared research focus, degrees, dates, and advisors: `_data/profile.yml`
- Homepage layout and selected work: `_pages/about.md`
- Research overview: `_pages/research.md`
- Web CV layout: `_pages/cv.md`
- PDF CV and its LaTeX source: `assets/cv/MinxingZheng_CV.pdf` and `assets/cv/MinxingZheng_CV.tex`
- Publications: one Markdown file per paper in `_publications/`; these records feed the homepage, web CV, and Publications page
- Name, email, profiles, and site metadata: `_config.yml`
- Navigation: `_data/navigation.yml`
- Visual design: `_sass/_custom.scss`
- Profile photo: `images/profile.png`

## Add a publication

Copy an existing file in `_publications/`, rename it with the publication date and a short title, then update its front matter. Use `category: preprints` for working papers, `category: conferences` for conference papers, or `category: journals` for journal papers.

## Keep the CV and website aligned

- Edit `_data/profile.yml` for shared biographical facts. The homepage, Research page, Publications intro, and web CV read from it.
- Edit a paper's `_publications/` file for its title, authors, status, citation, and links. The homepage's featured cards use records with `featured: true`; set `featured_order` to control their order. The web CV lists the same records, ordered by `cv_order` within its two sections.
- Edit `assets/cv/MinxingZheng_CV.tex` when the PDF CV changes. Recompile it and replace `assets/cv/MinxingZheng_CV.pdf`. The PDF is a snapshot, while the web CV is assembled from the shared site data. Run `ruby scripts/check_cv_consistency.rb` to catch mismatches in research focus, education, and publication titles before pushing.

## Local setup (first time only)

On macOS:

```bash
brew install ruby@3.3
export PATH="$(brew --prefix ruby@3.3)/bin:$PATH"
gem install bundler
bundle config set --local path 'vendor/bundle'
bundle install
```

Then run:

```bash
bundle exec jekyll serve
```

## Recommended maintenance rhythm

- Add papers and preprints as soon as they become public.
- Review the homepage’s featured publications every 3–6 months.
- Update the PDF and LaTeX source together, then run the consistency check.
- Remove empty sections rather than publishing placeholders.
