---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

[Download the PDF CV](/assets/cv/MinxingZheng_CV.pdf)

**Research:** {{ site.data.profile.research_focus[0] }}; {{ site.data.profile.research_focus[1] }}.

Education
======
<ul>
{% for entry in site.data.profile.education %}
  <li><strong>{{ entry.institution }}</strong> — {% if entry.degrees %}{% for credential in entry.degrees %}{{ credential.degree }}, {{ credential.field }}{% unless forloop.last %}; {% endunless %}{% endfor %}{% else %}{{ entry.degree }}{% if entry.field %}, {{ entry.field }}{% endif %}{% endif %}, {{ entry.dates }}{% if entry.advisors %}<br>{% if entry.advisors.size == 1 %}Advisor{% else %}Advisors{% endif %}: {% for advisor in entry.advisors %}<a href="{{ advisor.url }}">Prof. {{ advisor.name }}</a>{% unless forloop.last %} and {% endunless %}{% endfor %}{% endif %}</li>
{% endfor %}
</ul>

Publications
======

### Conference and journal papers

<ul>
{% assign cv_papers = site.publications | sort: "cv_order" %}
{% for post in cv_papers %}
  {% if post.category == 'conferences' or post.category == 'journals' %}
    {% include archive-single-cv.html %}
  {% endif %}
{% endfor %}
</ul>

### Preprints

<ul>
{% for post in cv_papers %}
  {% if post.category == 'preprints' or post.category == 'workshops' %}
    {% include archive-single-cv.html %}
  {% endif %}
{% endfor %}
</ul>

Internship experience
======
**Argonne National Laboratory**, Lemont, IL — Ph.D. Research Intern, ESI Grid Optimization and Analytics, May–July 2026<br>
Mentor: Feng Qiu. Developed conformal survival models to predict forced outages of hydropower units from equipment sensor telemetry and outage-event records, in collaboration with the Hydropower Research Institute. Manuscript in preparation.

Honors and fellowships
======
- Heinz College Dean’s Fellowship, Carnegie Mellon University, 2025–2026
- Marshall School Fellowship, University of Southern California, 2022–2024

Service
======
Conference reviewer: NeurIPS, ICLR, ICML, AISTATS, AAAI

Technical skills
======
Uncertainty estimation and calibration for generative models · LLM fine-tuning and large-scale sampling · Differentiable optimization for decision-focused learning · Large-scale HPC experiments (Slurm, HTCondor) · Python (PyTorch, JAX), R, C++, MATLAB

Professional links
======
[Google Scholar](https://scholar.google.com/citations?user=JM-PxSQAAAAJ&hl=en) · [GitHub](https://github.com/Minxing-Zheng) · [arXiv](https://arxiv.org/search/?searchtype=author&query=Zheng%2C+Minxing) · [Email](mailto:minxingz@andrew.cmu.edu)
