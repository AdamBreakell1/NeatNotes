# Predict, then change the stride

Task: countdown-trace · 2026-10-07.1 · rs-h446-1.0.0

SHA-256: `2527dd5e8864efb4ffd1b0d2d90e53c7034c8cc006db5df988411b6b2471c106`

Status: draft. Reviewer: **not assigned**. No approval is implied.

## Mapping and learner task
2.2.1(a)
Predicts ordered loop output before changing an update and boundary.
First predict the starter output for n=6 in the plan box. Then modify the program: for any integer n from 0 to 12, print n, n-2, n-4 and so on while the value is positive. Print nothing for n=0. Each number is on its own line.
Before running: list each starter output for n=6, then each required output.

Starter:
```text
n=int(input("Start"))
while n>0
  print(n)
  n=n-1
endwhile
```

## Public functional cases
Comparison: {"kind":"exact","whitespace":"exact per output line","ordering":"significant","returns":"Print the required result; return values alone are not task output"}

| Case | Input queue | Expected output |
| --- | --- | --- |
| case-1: Even | ["6"] | ["6","4","2"] |
| case-2: Zero | ["0"] | [] |
| case-3: One | ["1"] | ["1"] |
| case-4: Odd | ["5"] | ["5","3","1"] |
| case-5: Upper bound | ["12"] | ["12","10","8","6","4","2"] |

## Correct alternatives

Alternative 1:
```text
n=int(input("Start"))
while n>0
print(n)
n=n-2
endwhile
```

Alternative 2:
```text
n=int(input("Start"))
for i=0 to (n-1) DIV 2
if n-2*i>0 then
print(n-2*i)
endif
next i
```

## Deliberate faulty variants

prints zero:
```text
n=int(input("Start"))
while n>=0
print(n)
n=n-2
endwhile
```

step one:
```text
n=int(input("Start"))
while n>0
print(n)
n=n-1
endwhile
```

## Hints
1. Keep output order separate from the final variable value.
2. The update controls the stride; the condition controls whether zero prints.
3. Subtract 2 each iteration and continue only while the value is greater than 0.

## Self-review criteria
- I predicted the starter before seeing a trace.
- I can explain why odd and even inputs end differently.
- I can account for each printed value and show that the loop terminates.

## Known misconceptions
- Printing zero
- Skipping initial output
- Removing the update

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
