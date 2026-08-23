# Minxing Zheng — Personal Academic Website

Source for [minxing-zheng.github.io](https://minxing-zheng.github.io), a Jekyll site hosted by GitHub Pages.

## The easiest update workflow

1. Pull the newest version before editing:

   ```bash
   git pull origin master
   ```

2. Update content in the small set of files below.
3. Preview locally with `bundle exec jekyll serve` and open `http://localhost:4000`.
4. Publish:

   ```bash
   git add .
   git commit -m "Update website"
   git push origin master
   ```

GitHub Pages rebuilds the public site automatically after the push. The deployment status appears under the repository’s **Actions** tab.

## Where to edit

- Homepage and selected work: `_pages/about.md`
- Research overview: `_pages/research.md`
- CV: `_pages/cv.md`
- Publications: one Markdown file per paper in `_publications/`
- Name, email, profiles, and site metadata: `_config.yml`
- Navigation: `_data/navigation.yml`
- Visual design: `_sass/_custom.scss`
- Profile photo: `images/profile.png`

## Add a publication

Copy an existing file in `_publications/`, rename it with the publication date and a short title, then update its front matter. Use `category: preprints` for working papers or `category: journals` for peer-reviewed publications.

## Local setup (first time only)

On macOS:

```bash
brew install ruby
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
- Review the homepage’s three selected papers every 3–6 months.
- Keep the web CV concise; link a PDF only when the PDF is current.
- Remove empty sections rather than publishing placeholders.
