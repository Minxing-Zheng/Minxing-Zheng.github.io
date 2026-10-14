---
layout: single
permalink: /
title: "About me"
excerpt: "About Minxing Zheng"
author_profile: true
redirect_from:
  - /about/
  - /about.html
---

{% assign education = site.data.profile.education %}
{% assign phd = education[0] %}
{% assign usc = education[1] %}
{% assign wisconsin = education[2] %}
{% assign renmin = education[3] %}

I am a {{ phd.degree }} at {{ phd.institution }}, advised by {% for advisor in phd.advisors %}[Prof. {{ advisor.name }}]({{ advisor.url }}){% unless forloop.last %} and {% endunless %}{% endfor %}. My research focuses on {{ site.data.profile.research_focus[0] }} and {{ site.data.profile.research_focus[1] }}.

<aside class="homepage-actions" aria-label="Papers and research contact">
  <p><strong>Full paper list</strong><a href="{{ site.author.googlescholar }}">Google Scholar</a></p>
  <p><strong>Research collaborations &amp; opportunities</strong><a href="mailto:{{ site.author.email }}">{{ site.author.email }}</a></p>
</aside>

Before joining Carnegie Mellon, I received an {{ usc.degree }} in {{ usc.field }} from the {{ usc.institution }}, where I worked with [Prof. {{ usc.advisors[0].name }}]({{ usc.advisors[0].url }}) on change-point detection for metric-space data. I also earned an {{ wisconsin.degree }} in {{ wisconsin.field }} from the {{ wisconsin.institution }}, where I worked with [Prof. {{ wisconsin.advisors[0].name }}]({{ wisconsin.advisors[0].url }}) and [Prof. {{ wisconsin.advisors[1].name }}]({{ wisconsin.advisors[1].url }}) on machine-learning interpretability and statistical network analysis. I earned a {{ renmin.degrees[0].degree }} in {{ renmin.degrees[0].field }} and a {{ renmin.degrees[1].degree }} in {{ renmin.degrees[1].field }} from {{ renmin.institution }}.

## Research interests

{% for interest in site.data.profile.research_interests %}- {{ interest }}
{% endfor %}

## Recent work

<div class="recent-work">
{% assign featured_papers = site.publications | where: "featured", true | sort: "featured_order" %}
{% for paper in featured_papers %}
  <article class="recent-paper{% if forloop.first %} recent-paper--featured{% endif %}">
    <h3><a href="{{ paper.url }}">{{ paper.title }}</a></h3>
    <p class="paper-authors">{{ paper.authors }}</p>
    <p class="paper-venue">{% if paper.status == 'published' %}<strong class="paper-venue__badge">{{ paper.venue }} {{ paper.date | date: "%Y" }}</strong><span class="paper-venue__status">Conference paper</span>{% elsif paper.status == 'accepted' %}<strong class="paper-venue__badge">{{ paper.acceptance_note }}</strong><span class="paper-venue__status">{{ paper.publication_type | default: "Workshop paper" }}</span>{% else %}<strong class="paper-venue__badge paper-venue__badge--preprint">Preprint</strong><span class="paper-venue__status">{{ paper.venue }} · {{ paper.date | date: "%Y" }}</span>{% endif %}</p>
    <p>{{ paper.feature_summary }}</p>
    <p class="paper-links"><a href="{{ paper.url }}">Paper details</a>{% if paper.paperurl %} · <a href="{{ paper.paperurl }}">{{ paper.paper_label | default: "Read paper" }}</a>{% endif %}{% if paper.projecturl %} · <a href="{{ paper.projecturl }}">Project page &amp; demo</a>{% endif %}{% if paper.preprinturl %} · <a href="{{ paper.preprinturl }}">Earlier arXiv version</a>{% endif %}</p>
  </article>
{% endfor %}
</div>
