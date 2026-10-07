# Find the first match

Task: first-match · 2026-10-07.1 · rs-h446-1.0.0

SHA-256: `3eec317ed1a99d2868e35af11a31d901b9a019452603298a50369e01b4470fe0`

Status: draft. Reviewer: **not assigned**. No approval is implied.

## Mapping and learner task
2.3.1(a), 2.3.1(b)
Array population, duplicate matches and the not-found sentinel require distinct reasoning.
Read four integers into an array, then read a target integer. Print the zero-based index of the first matching element, or -1 if no element matches. Duplicates are allowed. Each integer is between -100 and 100.
What should happen if the target appears at both index 0 and index 3?

Starter:
```text
array values[4]
for i=0 to 3
  values[i]=int(input("Value"))
next i
target=int(input("Target"))
// Find the first match

```

## Public functional cases
Comparison: {"kind":"exact","whitespace":"exact per output line","ordering":"significant","returns":"Print the required result; return values alone are not task output"}

| Case | Input queue | Expected output |
| --- | --- | --- |
| case-1: Duplicate first | ["8","3","8","1","8"] | ["0"] |
| case-2: Final position | ["1","2","3","4","4"] | ["3"] |
| case-3: Absent | ["1","2","3","4","5"] | ["-1"] |
| case-4: All equal | ["2","2","2","2","2"] | ["0"] |
| case-5: Middle match | ["-1","9","5","9","9"] | ["1"] |
| case-6: Negative match | ["-5","0","2","8","-5"] | ["0"] |

## Correct alternatives

Alternative 1:
```text
array a[4]
for i=0 to 3
a[i]=int(input("Value"))
next i
t=int(input("Target"))
pos=-1
for i=0 to 3
if a[i]==t AND pos==-1 then
pos=i
endif
next i
print(pos)
```

Alternative 2:
```text
array a[4]
for i=0 to 3
a[i]=int(input("Value"))
next i
t=int(input("Target"))
i=0
while i<4 AND a[i]!=t
i=i+1
endwhile
if i==4 then
print(-1)
else
print(i)
endif
```

## Deliberate faulty variants

last instead of first:
```text
array a[4]
for i=0 to 3
a[i]=int(input("Value"))
next i
t=int(input("Target"))
p=-1
for i=0 to 3
if a[i]==t then
p=i
endif
next i
print(p)
```

hard-coded first index:
```text
print(0)
```

## Hints
1. Choose a sentinel that cannot be a valid index.
2. Only set the answer when a match is found and no earlier match was recorded.
3. Start position=-1; test values[i]==target AND position==-1 before changing it.

## Self-review criteria
- I can explain why duplicates do not overwrite the first match.
- I initialise a not-found value outside the index range.
- I can trace the search and describe its worst-case work.

## Known misconceptions
- Returning last match
- Defaulting to zero
- Off-by-one array bounds

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
