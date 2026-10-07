# Modify a character counter

Task: count-letter · 2026-10-07.1 · rs-h446-1.0.0

SHA-256: `14998985aa5eb040538099527833f970cf339b7d80e7c9b0e308244988fad2b2`

Status: draft. Reviewer: **not assigned**. No approval is implied.

## Mapping and learner task
2.2.1(a)
Uses zero-based positions and an empty-string boundary.
The starter counts lowercase a. Modify it to count lowercase e in one input string (0–40 lowercase ASCII letters). Print just the count. The empty string must produce 0.
Predict the starter result for "recall" and the required result for "reference".

Starter:
```text
word=input("Word")
count=0
for i=0 to word.length-1
  if word.subString(i,1)=="a" then
    count=count+1
  endif
next i
print(count)
```

## Public functional cases
Comparison: {"kind":"exact","whitespace":"exact per output line","ordering":"significant","returns":"Print the required result; return values alone are not task output"}

| Case | Input queue | Expected output |
| --- | --- | --- |
| case-1: Example | ["reference"] | ["4"] |
| case-2: Empty | [""] | ["0"] |
| case-3: No e | ["abc"] | ["0"] |
| case-4: Single e | ["e"] | ["1"] |
| case-5: Every character | ["eeee"] | ["4"] |
| case-6: Last character | ["abcde"] | ["1"] |

## Correct alternatives

Alternative 1:
```text
word=input("Word")
count=0
for i=0 to word.length-1
if word.subString(i,1)=="e" then
count=count+1
endif
next i
print(count)
```

Alternative 2:
```text
word=input("Word")
i=0
n=0
while i<word.length
if word.subString(i,1)=="e" then
n=n+1
endif
i=i+1
endwhile
print(n)
```

## Deliberate faulty variants

skips first:
```text
w=input("Word")
n=0
for i=1 to w.length-1
if w.subString(i,1)=="e" then
n=n+1
endif
next i
print(n)
```

hard-coded count:
```text
print(4)
```

## Hints
1. One literal determines the character being counted.
2. subString(i,1) gives the single character at position i.
3. Change the comparison literal, and keep positions from 0 to length-1.

## Self-review criteria
- I can explain why the last index is length-1.
- I trace count only when the selected character matches.
- I have considered the empty string without reading outside it.

## Known misconceptions
- Index starts at 1
- Length is the final index
- Missing the last character

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
