# Repair the boundary

Task: temperature-range · 2026-10-07.1 · rs-h446-1.0.0

SHA-256: `156379c4c499cc15d5636ada020347f87c60167c8cac68e282345bfecdc01f1e`

Status: draft. Reviewer: **not assigned**. No approval is implied.

## Mapping and learner task
2.2.1(a)
Two inclusive boundaries distinguish plausible code from correct selection.
Read an integer temperature. Print "inside" for values from 0 through 35 inclusive, otherwise print "outside". Repair the starter so both boundary values work.
Predict the starter's output for 0 and 35. Which comparison needs to change?

Starter:
```text
temperature=int(input("Temperature"))
if temperature>0 AND temperature<35 then
  print("inside")
else
  print("outside")
endif
```

## Public functional cases
Comparison: {"kind":"exact","whitespace":"exact per output line","ordering":"significant","returns":"Print the required result; return values alone are not task output"}

| Case | Input queue | Expected output |
| --- | --- | --- |
| case-1: Middle | ["12"] | ["inside"] |
| case-2: Lower boundary | ["0"] | ["inside"] |
| case-3: Upper boundary | ["35"] | ["inside"] |
| case-4: Just below | ["-1"] | ["outside"] |
| case-5: Just above | ["36"] | ["outside"] |
| case-6: Negative | ["-50"] | ["outside"] |

## Correct alternatives

Alternative 1:
```text
temperature=int(input("Temperature"))
if temperature>=0 AND temperature<=35 then
print("inside")
else
print("outside")
endif
```

Alternative 2:
```text
t=int(input("Temperature"))
if t<0 OR t>35 then
print("outside")
else
print("inside")
endif
```

## Deliberate faulty variants

both boundaries excluded:
```text
t=int(input("Temperature"))
if t>0 AND t<35 then
print("inside")
else
print("outside")
endif
```

OR accepts everything:
```text
t=int(input("Temperature"))
if t>=0 OR t<=35 then
print("inside")
else
print("outside")
endif
```

## Hints
1. Inclusive means the endpoint belongs to the interval.
2. Test each comparison separately for 0 and 35.
3. Use >= and <= together, or reject values below 0 OR above 35.

## Self-review criteria
- I can explain the two boundary errors in the starter.
- My two branches are mutually exclusive and cover every integer.
- I tested values just outside the interval.

## Known misconceptions
- Strict instead of inclusive comparisons
- OR inside the accepted interval
- Only fixing one bound

## Human review record
- [ ] Confirm qualification/objective mapping and difficulty rationale.
- [ ] Independently calculate every expected output, including boundaries.
- [ ] Check two or more correct algorithms; review parser limits separately from algorithm quality.
- [ ] Run each seeded misconception and inspect why it fails.
- [ ] Check hints/solution accuracy and whether self-review requires reasoning.
- [ ] Look for accidental success, hard-coded case banks and missing adversarial cases.
- [ ] Confirm plain language, accessibility, provenance and NEA boundaries.
- [ ] Record correction IDs, exact final version/hash and approval or withdrawal.

Reviewer / role:
Review date:
Corrections / concerns:
Expected outputs independently checked by:
Decision: pending / revise / approve / withdraw
Final version/hash:
Evidence attachment reference:

Approval must be recorded separately in pseudocode-review.json after the corrected bank and benchmark are validated. A completed checklist alone never unlocks publication.
