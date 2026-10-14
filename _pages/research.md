---
layout: single
title: "Research"
permalink: /research/
excerpt: "Research in uncertainty quantification, conformal prediction, reliable AI, and scientific machine learning."
author_profile: true
---

My research focuses on {{ site.data.profile.research_focus[0] }}; I also work on {{ site.data.profile.research_focus[1] }}. I am interested in settings where standard point predictions are not enough: complex outputs, hidden targets, distribution shifts, and high-stakes scientific systems.

<div class="research-theme-grid">
  <article>
    <span>01</span>
    <h2>Conformal prediction &amp; inference</h2>
    <p>I design distribution-free methods that turn model outputs into calibrated uncertainty sets. Current work studies generative prediction, efficient coverage allocation, and inference for latent distributional parameters that are never directly observed.</p>
  </article>
  <article>
    <span>02</span>
    <h2>Reliable &amp; secure machine learning</h2>
    <p>I study how learning systems can preserve utility while remaining robust to misuse and changing operating conditions, including model-extraction defense and statistically controlled monitoring.</p>
  </article>
  <article>
    <span>03</span>
    <h2>Scientific AI &amp; decision-making</h2>
    <p>I combine physical structure, learned representations, and statistical testing to support decisions in scientific and engineering systems where simulation is costly and uncertainty matters.</p>
  </article>
  <article>
    <span>04</span>
    <h2>Interpretable machine learning</h2>
    <p>My earlier work uses interactive visualization and representation analysis to diagnose models and data, with applications to geospatial deep learning and network analysis.</p>
  </article>
</div>

## Current questions

- How can conformal guarantees be transferred from observable outcomes to scientifically meaningful but unobserved quantities?
- How should uncertainty-set geometry adapt to multimodal, high-dimensional, or structured outputs?
- How can physical knowledge and statistical calibration support fast, trustworthy monitoring under distribution shift?
- How should uncertainty be communicated so that people and AI systems make better joint decisions?

## Ongoing projects

- **[ORCA: Generative Conformal Prediction with Optimized Coverage Allocation](/orca/).** A [NeurIPS 2026 paper](https://neurips.cc/virtual/2026/poster/149988) on adaptive prediction-set geometry, with an interactive project page.
- **[Sample-Efficient Generative Conformal Prediction](/publication/sample-efficient-generative-conformal-prediction).** CASA allocates generator samples across inputs under an average sampling budget.
- **[Deciding When to Decide: Testing Operational Suboptimality under Distributional Shift](/publication/deciding-when-to-decide).** RADAR tests whether a deployed decision has become materially suboptimal after distribution shift.
- **[Beyond Prediction: Conformal Inference for Latent Distributional Parameters](/publication/latent-conformal-inference).** Conformal inference for latent quantities; a short version was accepted at the NeurIPS 2026 Workshop on ML×OR.

<div class="research-contact">
  <p>Interested in one of these questions?</p>
  <a href="mailto:minxingz@andrew.cmu.edu">Start a conversation <span aria-hidden="true">→</span></a>
</div>
