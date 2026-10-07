# Build a running total

Task: running-total · 2026-10-07.1 · rs-h446-1.0.0

SHA-256: `b04b61dba3392540af3dc96b17a085c6e073a3f08d049c6dcc37beecd7fccf09`

Status: draft. Reviewer: **not assigned**. No approval is implied.

## Mapping and learner task
2.2.1(a)
Requires a correct initial value, inclusive endpoint and update.
Read an integer n from 0 to 20. Print the total of the whole numbers from 1 through n inclusive. For n=0 print 0. Try an accumulation loop; a formula is also functionally valid, but explain both methods in self-review.
Trace the total after each addition when n is 4.

Starter:
```text
n=int(input("Upper bound"))
// Add your algorithm here

```

## Public functional cases
Comparison: {"kind":"exact","whitespace":"exact per output line","ordering":"significant","returns":"Print the required result; return values alone are not task output"}

| Case | Input queue | Expected output |
| --- | --- | --- |
| case-1: Example | ["4"] | ["10"] |
| case-2: Empty range | ["0"] | ["0"] |
| case-3: Single value | ["1"] | ["1"] |
| case-4: Two values | ["2"] | ["3"] |
| case-5: Unseen value | ["9"] | ["45"] |
| case-6: Upper bound | ["20"] | ["210"] |

## Correct alternatives

Alternative 1:
```text
n=int(input("Upper bound"))
total=0
for i=1 to n
total=total+i
next i
print(total)
```

Alternative 2:
```text
n=int(input("Upper bound"))
s=0
i=1
while i<=n
s=s+i
i=i+1
endwhile
print(s)
```

Alternative 3:
```text
n=int(input("Upper bound"))
print(n*(n+1)/2)
```

## Deliberate faulty variants

misses endpoint:
```text
n=int(input("n"))
s=0
for i=1 to n-1
s=s+i
next i
print(s)
```

wrong initial value:
```text
n=int(input("n"))
s=1
for i=1 to n
s=s+i
next i
print(s)
```

nontermination:
```text
n=int(input("n"))
i=1
while i<=n
endwhile
```

## Hints
1. Start the total at the identity value for addition.
2. For each number from 1 to n, add it to the running total.
3. Use total=0 before the loop, total=total+i inside, then print after next i.

## Self-review criteria
- I can trace how my accumulator changes.
- I can justify the empty-range result.
- I can compare an iterative solution with n*(n+1)/2; tests do not prove which method I used.

## Known misconceptions
- Starting at 1
- Missing last term
- Printing each partial total
- Missing loop update

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
