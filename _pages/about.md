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

I am a {{ phd.degree }} at {{ phd.institution }}, advised by {% for advisor in phd.advisors %}[Prof. {{ advisor.name }}]({{ advisor.url }}){% unless forloop.last %} and {% endunless %}{% endfor %}. My research focuses on {{ site.data.profile.research_focus[0] }}; I also work on {{ site.data.profile.research_focus[1] }}.

Before joining Carnegie Mellon, I received an {{ usc.degree }} in {{ usc.field }} from the {{ usc.institution }}, where I worked with [Prof. {{ usc.advisors[0].name }}]({{ usc.advisors[0].url }}) on change-point detection for metric-space data. I also earned an {{ wisconsin.degree }} in {{ wisconsin.field }} from the {{ wisconsin.institution }}, where I worked with [Prof. {{ wisconsin.advisors[0].name }}]({{ wisconsin.advisors[0].url }}) and [Prof. {{ wisconsin.advisors[1].name }}]({{ wisconsin.advisors[1].url }}) on machine-learning interpretability and statistical network analysis. I earned a {{ renmin.degrees[0].degree }} in {{ renmin.degrees[0].field }} and a {{ renmin.degrees[1].degree }} in {{ renmin.degrees[1].field }} from {{ renmin.institution }}.

## News

<ul class="news-list">
{% for item in site.data.news %}
  <li><span class="news-list__date">{{ item.date }}</span><span class="news-list__text">{{ item.text | markdownify | remove: "<p>" | remove: "</p>" | strip }}</span></li>
{% endfor %}
</ul>

## Publications

{% include paper-list.html %}
