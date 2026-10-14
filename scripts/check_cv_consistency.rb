#!/usr/bin/env ruby
# Check the shared website facts against the public PDF and its LaTeX source.
require 'date'
require 'open3'
require 'yaml'

root = File.expand_path('..', __dir__)
profile = YAML.safe_load_file(File.join(root, '_data/profile.yml'), permitted_classes: [Date])
pdf_path = File.join(root, 'assets/cv/CV_github.pdf')
tex = File.read(File.join(root, 'assets/cv/MinxingZheng_CV.tex'))
web_cv = File.read(File.join(root, '_pages/cv.md'))
pdf, status = Open3.capture2('pdftotext', '-layout', pdf_path, '-')
abort 'pdftotext failed; install Poppler before running this check.' unless status.success?

def normalize(value)
  value.to_s.unicode_normalize(:nfkd).downcase.gsub(/[^[:alnum:]]+/, ' ').strip.gsub(/\s+/, ' ')
end

errors = []
check = lambda do |source, expected, description|
  errors << "#{description} missing: #{expected}" unless normalize(source).include?(normalize(expected))
end

profile.fetch('research_focus').each do |focus|
  check.call(pdf, focus, 'PDF research focus')
  check.call(tex, focus, 'LaTeX research focus')
end

profile.fetch('education').each do |entry|
  credentials = if entry['degrees']
                  entry['degrees'].map { |item| "#{item.fetch('degree')}, #{item.fetch('field')}" }.join('; ')
                else
                  [entry.fetch('degree'), entry['field']].compact.join(', ')
                end
  check.call(pdf, "#{entry.fetch('institution')}, #{credentials}", 'PDF education')
  check.call(tex, entry.fetch('institution').gsub('–', '--'), 'LaTeX institution')
end

publication_files = Dir.glob(File.join(root, '_publications/*.md')).sort
publication_files.each do |path|
  front_matter = File.read(path).match(/\A---\s*\n(.*?)\n---\s*\n/m)
  abort "Missing front matter: #{path}" unless front_matter
  paper = YAML.safe_load(front_matter[1], permitted_classes: [Date])
  title = paper.fetch('title')
  check.call(pdf, title, 'PDF publication')
  check.call(tex, title, 'LaTeX publication')
end

%w[Argonne AAAI].each do |term|
  check.call(pdf, term, 'PDF CV detail')
  check.call(tex, term, 'LaTeX CV detail')
end

errors << 'CV page does not embed the public PDF' unless web_cv.include?('src="/assets/cv/CV_github.pdf#view=FitH"')
errors << 'CV download link does not use the public PDF' unless web_cv.include?('](/assets/cv/CV_github.pdf)')
errors << 'Public CV source contains the internship search line' if tex.include?('Seeking Ph.D. Research Scientist Internships')
errors << 'Public CV PDF contains the internship search line' if pdf.include?('Seeking Ph.D. Research Scientist Internships')
legacy_pdf_path = File.join(root, 'assets/cv/MinxingZheng_CV.pdf')
errors << 'Legacy CV URL differs from the public PDF' unless File.binread(legacy_pdf_path) == File.binread(pdf_path)

if errors.empty?
  puts "CV and website facts agree (#{publication_files.length} publications)."
else
  warn errors.join("\n")
  exit 1
end
