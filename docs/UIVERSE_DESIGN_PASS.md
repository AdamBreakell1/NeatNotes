# Uiverse interaction pass — 13 September 2026

Four components were selected after inspecting their supplied HTML/CSS. They are adapted to the existing navy/mint tokens, not embedded as external widgets.

- [Voxybuns tactile button](https://uiverse.io/Voxybuns/lucky-fireant-71): a restrained raised/pressed treatment on the landing CTA, Today session start, answer reveal and written-answer submit. Uses shadows without a nested label wrapper, preserving existing button text updates.
- [Allyhere input](https://uiverse.io/Allyhere/slippery-fly-8): consistent field focus and invalid states across authentication, contact, settings, notes and exam responses. Labels stay visible rather than floating; errors wait for user interaction.
- [njesenberger switch](https://uiverse.io/njesenberger/friendly-otter-40): the settings analytics checkbox retains its ID, native keyboard semantics and unchecked default. The author’s shaped track is retained with a lighter sliding thumb, without blur filters. Touch target is 56 × 44px. On/off symbols and thumb position supplement colour.
- [kennyotsu notification](https://uiverse.io/kennyotsu/fast-emu-70): compact bordered status notices for existing save/auth/contact feedback, using semantic success/error accents and unchanged live-region text.

An original small busy indicator uses the existing `aria-busy` state on authentication buttons. Animations respect reduced motion; the switch includes forced-colour styles. No new runtime dependencies, remote scripts, analytics changes or curriculum changes.

Attribution and MIT permission notices are retained in `UIVERSE-LICENSE.txt`, also available through the public asset route. The shell cache and stylesheet URL are versioned together.

Verification: syntax/content checks, full backend regression suite and browser smoke suite. Added browser checks cover switch defaults, keyboard toggling, focus visibility, minimum target size and reduced-motion behaviour in the isolated test account. Responsive checks cover 320/390/768/1280px and dark mode.
