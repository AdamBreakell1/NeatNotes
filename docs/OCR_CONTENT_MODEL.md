# OCR Content Model

## Purpose

Neat Notes treats curriculum identity as versioned product data rather than UI copy. `ocr-content.js` builds the current model from the existing reviewed Component 01 decks, preserving their topic and card identifiers.

The hierarchy is:

`Qualification -> Component -> Section -> Topic -> Concept`

The current specification identifier is `ocr-h446-2020`. Evidence refers to concepts using the stable form `topic-id:card-id`, for example `cs-1-1-1:mar`. Historic evidence therefore remains attributable if a display title changes.

## Published Scope

- Component 01 Computer Systems: published from the existing Neat Notes topic/card library.
- Component 02 Algorithms and Programming: qualification structure only. It is not exposed as authored revision content yet.
- Component 03/04 Programming Project: integrity guidance only. Neat Notes must not generate candidate-specific assessed NEA work.

The product may say that content is aligned to the OCR H446 specification structure. It must not say that it is OCR approved or endorsed.

## Content Metadata

Concepts currently include stable identity, topic/component/specification mapping, category, explanation, inferred search keywords, supported activity types, difficulty range and review status. Misconceptions, prerequisites and richer authoring metadata can be added without changing concept identity.

## Validation

Run:

```bash
npm run validate:content
```

The validator fails on duplicate identifiers, orphan concepts, empty explanations and unpublished concepts referenced by the published tree. Server startup also validates the content so a broken content release fails visibly rather than silently corrupting learning evidence.

## Versioning Rule

Never reuse an existing concept ID for a different learning objective. Minor wording corrections retain the ID. Substantive objective changes create a new specification/content version and a new concept ID, with an explicit migration or equivalence map if historic evidence should contribute.
