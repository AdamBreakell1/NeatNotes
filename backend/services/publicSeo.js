"use strict";

const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const canonicalOrigin = (baseUrl) => new URL(baseUrl).origin;
const topicUrl = (baseUrl, topic) => `${canonicalOrigin(baseUrl)}/ocr-h446/${encodeURIComponent(topic.code)}`;

function robotsTxt(baseUrl) {
  // Authentication remains the access control. These rules only avoid useless
  // crawling; Google may fetch a URL to see its separate X-Robots-Tag header.
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /__migration/\nSitemap: ${canonicalOrigin(baseUrl)}/sitemap.xml\n`;
}

function sitemapXml(baseUrl, topics) {
  const urls = [`${canonicalOrigin(baseUrl)}/`, ...topics.map((topic) => topicUrl(baseUrl, topic))];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escape(url)}</loc></url>`).join("")}</urlset>`;
}

function renderPublicTopicPage(topic, topics, baseUrl) {
  const origin = canonicalOrigin(baseUrl);
  const canonical = topicUrl(origin, topic);
  const component = topic.code.startsWith("2.") ? "02" : "01";
  const componentTitle = component === "02" ? "Algorithms and programming" : "Computer systems";
  const description = String(topic.summary || `Revise OCR H446 ${topic.code} ${topic.title} with RecallStride.`);
  const snippet = `Revise ${topic.title.toLowerCase()} for OCR A-Level Computer Science (H446 ${topic.code}). ${description}`.slice(0, 160);
  const concepts = (topic.cards || []).slice(0, 6).map((card) => `<li><strong>${escape(card.front)}</strong><span>${escape(card.category || "Knowledge")}</span></li>`).join("");
  const index = topics.findIndex((item) => item.id === topic.id);
  const related = [topics[index - 1], topics[index + 1]].filter(Boolean);
  const links = related.map((item) => `<a href="${escape(topicUrl(origin, item))}">${escape(item.code)} ${escape(item.title)}</a>`).join("");
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escape(topic.title)} Revision | OCR H446 ${escape(topic.code)} | RecallStride</title>
    <meta name="description" content="${escape(snippet)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${escape(canonical)}">
    <meta property="og:title" content="${escape(topic.title)} | OCR H446 revision | RecallStride"><meta property="og:description" content="${escape(snippet)}"><meta property="og:type" content="website"><meta property="og:site_name" content="RecallStride"><meta property="og:locale" content="en_GB"><meta property="og:url" content="${escape(canonical)}"><meta property="og:image" content="${escape(origin)}/assets/recallstride-social-preview.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="RecallStride — Revise. Practise. Code."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(topic.title)} | OCR H446 revision | RecallStride"><meta name="twitter:description" content="${escape(snippet)}"><meta name="twitter:image" content="${escape(origin)}/assets/recallstride-social-preview.png">
    <meta name="theme-color" content="#172740"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><script src="/theme-init.js?v=20260824-relaunch"></script><link rel="stylesheet" href="/styles-relaunch.css?v=20260907-student-r1"><link rel="stylesheet" href="/student-layout.css?v=20261010-launch-r1"></head>
    <body class="public-topic-page"><a class="skip-link" href="#topic-content">Skip to topic</a><header><a class="public-topic-brand" href="/"><span class="brand-mark">RS</span><span><strong>RecallStride</strong><small>A BreakellSystems product</small></span></a><a class="primary-account-button" href="/?signup=1">Start free</a></header>
    <main id="topic-content" itemscope itemtype="https://schema.org/LearningResource"><meta itemprop="learningResourceType" content="Revision topic overview"><meta itemprop="educationalLevel" content="A-Level"><meta itemprop="inLanguage" content="en-GB"><link itemprop="url" href="${escape(canonical)}">
    <nav class="public-topic-breadcrumb" aria-label="Breadcrumb"><a href="/">RecallStride</a><span aria-hidden="true"> / </span><a href="/#landing-topics">OCR H446 topics</a><span aria-hidden="true"> / </span><span>${escape(topic.code)}</span></nav>
    <p class="eyebrow">OCR H446 · Component ${component} · ${componentTitle}</p><h1 itemprop="name">${escape(topic.code)} ${escape(topic.title)}</h1><p class="public-topic-summary" itemprop="description">${escape(description)}</p>
    <section><div><p class="eyebrow">What to revise</p><h2>Practise ${escape(topic.title.toLowerCase())}.</h2><p>Start with these questions from the ${escape(topic.title.toLowerCase())} topic pack. In the workspace, explain each idea from memory, compare your reasoning with the feedback, then revisit the concepts that need practice.</p><p>Use the pack alongside your OCR H446 ${componentTitle.toLowerCase()} revision. Your self-reported confidence helps plan the next review; it is not an exam mark or predicted grade.</p></div><ul aria-label="Example retrieval questions">${concepts}</ul></section>
    <aside><div><strong>${Number(topic.cards?.length || 0)} original retrieval cards</strong><span>Free accounts choose one topic pack. Pro includes all 24 published packs.</span></div><a href="/?demo=1">Try revision</a><a href="/?signup=1">Create a free account</a></aside>
    <nav class="public-topic-related" aria-label="Explore more topics"><h2>Continue exploring</h2>${links}<a href="/#landing-topics">All OCR H446 topic previews</a><a href="/#landing-approach">Free pseudocode interpreter and 60 coding tasks</a></nav>
    <p class="public-topic-disclaimer">RecallStride is independently produced and is not endorsed by OCR. OCR is a registered trademark of OCR. Topic content is published by its owner and has not yet had an independent academic review.</p></main></body></html>`;
}

module.exports = { robotsTxt, sitemapXml, renderPublicTopicPage };
