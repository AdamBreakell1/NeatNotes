# Time for a warm-up

Task: minutes-to-seconds · 2026-10-07.1 · rs-h446-1.0.0

SHA-256: `e9fcb5e61f60692f0173f9e0df6ed1fd75180ea42d6f960c15bb17fd93e1dd0f`

Status: draft. Reviewer: **not assigned**. No approval is implied.

## Mapping and learner task
2.2.1(a)
One input, one conversion and one output; separates numeric input from text.
Read a whole number of minutes from 0 to 120. Print the equivalent number of seconds as one number, with no label. All supplied inputs are valid integers.
What must happen to the input before you can multiply it? Predict the output for 3 minutes.

Starter:
```text
// Read minutes, calculate seconds, print the result

```

## Public functional cases
Comparison: {"kind":"exact","whitespace":"exact per output line","ordering":"significant","returns":"Print the required result; return values alone are not task output"}

| Case | Input queue | Expected output |
| --- | --- | --- |
| case-1: Typical input | ["3"] | ["180"] |
| case-2: Zero minutes | ["0"] | ["0"] |
| case-3: One minute | ["1"] | ["60"] |
| case-4: Different value | ["17"] | ["1020"] |
| case-5: Upper bound | ["120"] | ["7200"] |

## Correct alternatives

Alternative 1:
```text
minutes=int(input("Minutes"))
seconds=minutes*60
print(seconds)
```

Alternative 2:
```text
print(60*int(input("Minutes")))
```

## Deliberate faulty variants

hard-coded example:
```text
print(180)
```

wrong conversion:
```text
print(int(input("Minutes"))/60)
```

## Hints
1. Input is text. Think about converting it before arithmetic.
2. Multiply the number of minutes by the number of seconds in a minute.
3. Use int(input("Minutes")), multiply by 60, then print the result.

## Self-review criteria
- I converted the input to a number before calculating.
- I can explain why multiplying by 60 works for all permitted inputs.
- I checked zero and a value different from the example.

## Known misconceptions
- Concatenating strings
- Hard-coding 180
- Dividing by 60

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
