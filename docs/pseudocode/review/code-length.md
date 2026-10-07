# Keep asking until it fits

Task: code-length · 2026-10-07.1 · rs-h446-1.0.0

SHA-256: `bec5c6c8420b9c28a4b2fda049b94441419a3a21d6b36044cc3d0d4536b28ed7`

Status: draft. Reviewer: **not assigned**. No approval is implied.

## Mapping and learner task
2.2.1(a)
Combines string length with post-condition validation and input exhaustion.
Read candidate codes until one contains exactly four characters. Print the first four-character code and stop reading. Any four characters are allowed: this is length validation, not a numeric PIN check. Every test queue contains a valid code.
Predict how many inputs are read from ["a", "12345", "AB12", "later"].

Starter:
```text
// Keep reading until the code has length 4

```

## Public functional cases
Comparison: {"kind":"exact","whitespace":"exact per output line","ordering":"significant","returns":"Print the required result; return values alone are not task output"}

| Case | Input queue | Expected output |
| --- | --- | --- |
| case-1: Retry once | ["a","AB12"] | ["AB12"] |
| case-2: First is valid | ["xy!2"] | ["xy!2"] |
| case-3: Too long | ["12345","done"] | ["done"] |
| case-4: Empty then valid | ["","x","abcd"] | ["abcd"] |
| case-5: Stop at first valid | ["1234","5678"] | ["1234"] |

## Correct alternatives

Alternative 1:
```text
do
code=input("Code")
until code.length==4
print(code)
```

Alternative 2:
```text
code=input("Code")
while code.length!=4
code=input("Code")
endwhile
print(code)
```

## Deliberate faulty variants

accepts too long:
```text
do
code=input("Code")
until code.length>=4
print(code)
```

does not retry:
```text
print(input("Code"))
```

## Hints
1. The condition should check the length, not convert the code to a number.
2. A do/until loop reads at least once.
3. Read code=input("Code") inside do, and finish with until code.length==4.

## Self-review criteria
- I accept any four-character string, including punctuation.
- I can explain why the loop terminates for these fixtures.
- I understand that no valid code means input exhaustion, not an OCR mark of zero.

## Known misconceptions
- Checking >=4
- Reading only once
- Converting codes to numbers

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
