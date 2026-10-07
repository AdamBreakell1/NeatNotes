# Four-week RecallStride pilot and measurement contract

Prepared 7 October 2026. Plan only: no recruitment messages, advertising, purchases or participants have been created. Aim for approximately 20–30 relevant H446 Year 12/13 students through an approved school/teacher channel. This is a practical starting cohort, not a statistically conclusive study. Complete academic/policy/under-18 gates before exposing coding drafts to participants. Student participation, observation and analytics consent are distinct choices; opting out of analytics must not remove study access.

## Run the pilot

| Stage | Activity | Evidence and decision |
| --- | --- | --- |
| Preparation | Assign pilot/support owner and H446 reviewer; approve safeguarding/consent route; choose a small reviewed bank; verify Free/Pro flows in staging; prepare anonymous study IDs. | Named reviewers, approved task versions, support contact, participant information and provider checks. Do not imply a teacher has approved a task merely by inviting students. |
| Week 1 | Observe a short first revision/coding session; ask the student to find the next action, predict, write, run, inspect a boundary failure, improve and self-review. | First-session completion, exact point of confusion, assistive-technology barriers and time spent requesting help. Free participants select 2.2.1 Programming techniques before their one-deck choice is fixed. |
| Week 2 | Allow ordinary independent use. Conduct a short optional follow-up after the observation period. Keep invitation/reminder times in a separate minimal study log. | Return on a different day; student explanation of what prompted it; repeat usage days. Class-required/reminded use must not be labelled unprompted. |
| Week 3 | Offer a fresh transfer task after the three-day revisit suggestion; interview about useful feedback and alternatives they would otherwise use. | First independent check versus outcomes after runs/hints/solutions, observed misunderstanding and support minutes. Self-reported difficulty is not an OCR attainment result. |
| Week 4 | Ask a neutral price/value question at the unchanged £3.99/month and review optional purchase intent without charging in this pilot. If a later real purchase study is approved, use its actual provider evidence. | Separate stated willingness to pay, an uncharged intent/action, and an actual paid conversion. Summarise retention/support and decide whether to revise, continue a controlled pilot or request release approval. |

Do not fabricate pass/fail thresholds. Before participants start, the owner can record practical decision criteria suitable for this cohort: which confusions would block use, support time available, which feedback students must understand and which tasks need review. Report numerators, denominators, missing data and sample size. A student who cannot code on a phone is a product observation, not a learner deficiency.

## Implemented event definitions

`POST /api/pilot/events` requires an authenticated account, opt-in usageAnalytics, valid enum/IDs and rate limits. The coding client also checks consent before sending. No source, fixture, answer, prediction, note text, names, emails or free-form details are accepted. Raw source stays on device. Data is account-bound, exported/deleted with the account, capped at 2,000 events/account and retained for 30 days. Admin-only `GET /api/internal/pilot-metrics` returns aggregates; do not share individual account exports as a pilot report.

| Event | Trigger | Interpretation |
| --- | --- | --- |
| coding_session_started | Coding catalogue loads for the current page/account session. | Interest/entry only. Starts deduplicate per account/session; page reload creates another client session. This is not a universally defined 30-minute analytics session. |
| coding_task_opened | An accessible task and any valid local draft load. | Task selection, not completion. |
| coding_run | A local worker run returns, including a diagnostic. | Feedback use. Never mastery or a retention success by itself. |
| coding_check | A public case suite returns. | Attempt/check activity. Local provenance and assistance counters persist separately in coding_practice_attempts. |
| coding_hint / coding_solution | A clue or deliberately requested worked solution is revealed. | Assistance, not an independent attempt. |
| coding_session_completed | Student checks the rubric and finishes after a current functional check. | Self-reviewed completion; can include failed tests. Deduplicated per session. Does not prove correct algorithm or exam performance. |

Metrics: first observed session completion joins the earliest observed session_start to session_completed for that account/session. It is the first session in the available 30-day window, not necessarily first-ever use. Return usage counts students on at least two distinct UTC dates. Weekly counts and repeated weekly use use UTC Monday-based SQLite `%Y-%W` week buckets; crossing a calendar boundary is not automatically seven days of retention. There is no unprompted-return inference. Missing consent/connectivity is missing evidence, not non-use. Compare Free/Pro only with separately approved aggregate subscription data; coding events never grant paid access.

A minimal manual log template is below. Store it in an approved location with access/retention decided before collection. Use study IDs, no code or personal text; discuss concerns using a predefined category.

| Study ID | Week/date | Required / reminded / self-initiated | Completion observed | Confusion category | Assistance used | Support minutes | Stated willingness to pay | Actual purchase evidence |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| blank | blank | blank | blank | navigation / language / diagnostics / feedback / access / other | runs / hints / solution / none | blank | not asked / yes / no / uncertain | none until separately approved |

At the end, compare reasons for returning with free alternatives such as Isaac Computer Science and Physics & Maths Tutor, without assuming this editor is enough differentiation. Publish no testimonials, efficacy claims or conversion numbers without actual permission/evidence.

## Cost and support considerations

Run/Check consume student-device CPU in bounded workers. There is no per-run LLM bill and no hosted user-code execution. The existing Express instance handles catalogue/access/metadata requests and SQLite writes; browser asset download and task case arrays add bandwidth. A measured local record-size benchmark can be generated with `npm run benchmark:storage` (synthetic metadata only). Its physical SQLite file growth is an estimate for those records, not a Render invoice, concurrency limit or production load test.

The 7 October [measurement](operational-storage-benchmark.json) inserted 1,200 attempts and 3,000 enum events for 30 synthetic accounts. Incremental SQLite growth after WAL checkpoints was 1,683,456 bytes (about 1.6 MiB), with mean attempt JSON size 679 bytes. The batched insert elapsed time is not HTTP throughput. No provider bill or live database was inspected.

Capacity ceilings: 500 coding attempts and 2,000 pilot events/account per 30 days; local retry queues hold at most 20 records. Do not estimate an unlimited subscriber capacity from those caps. For 30 participants, 10 checks/person/week for four weeks means 1,200 attempt records; 25 events/person/week means 3,000 events. These are illustrative workloads, not observed usage. Actual asset cache misses, consent, metadata sizes, WAL/checkpoint behaviour, other notes/history and backup growth must be measured in staging.

Owner-time scenarios: 10 support enquiries at 10 minutes each plus 60 minutes of weekly review would consume 160 minutes that week; 30 enquiries at 10 minutes plus the review would consume 360 minutes. These are assumptions to test, not predictions or paid support commitments. Log actual triage, reproduction, content corrections, provider reconciliation and safeguarding/escalation time.

Revenue arithmetic only: 100 / 500 / 1,000 subscribers × £3.99 = £399 / £1,995 / £3,990 gross monthly. Subtract actual hosting/inbox/domain/backup costs, applicable payment fees, refunds/taxes and owner time. No current invoice, fee schedule or net-margin forecast is supplied. Exam cohorts leave, so new acquisition and support remain ongoing work.

Trusted server assessment is deferred. Before proposing it: measure expected attempts/second and worst-case process memory/CPU/wall time; price disposable isolated execution, queueing, logs/alerts and abuse controls; staff error/support handling. A worker thread inside Express would not meet the required isolation boundary.
