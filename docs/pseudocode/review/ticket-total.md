# Return the ticket total

Task: ticket-total · 2026-10-07.1 · rs-h446-1.0.0

SHA-256: `60585870f2845b4ec37c5b5fc7c20d0df6b1c2cf15b41fb60f1c1c52ece970ea`

Status: draft. Reviewer: **not assigned**. No approval is implied.

## Mapping and learner task
2.2.1(a), 2.2.1(c), 2.2.1(d)
Separates parameters, local computation, return value and printed output.
Read an integer ticket count from 0 to 10 and a unit price from 0 to 25 (up to two decimal places). Print their product. Practise writing a function total(count, price) and calling it. The checks assess output; reviewing whether you used and understood a function is your separate checklist.
Which values are parameters, and what should the function return for 3 tickets at 2.50?

Starter:
```text
// Define a function, read the two inputs, then print the result

```

## Public functional cases
Comparison: {"kind":"numeric","absoluteTolerance":0.000001,"whitespace":"surrounding whitespace accepted for one numeric line","ordering":"significant","returns":"Print result; method reviewed manually"}

| Case | Input queue | Expected output |
| --- | --- | --- |
| case-1: Example | ["3","2.50"] | ["7.5"] |
| case-2: No tickets | ["0","12"] | ["0"] |
| case-3: Free ticket | ["4","0"] | ["0"] |
| case-4: Fractional price | ["7","1.25"] | ["8.75"] |
| case-5: Upper bounds | ["10","25"] | ["250"] |
| case-6: Small price | ["3","0.01"] | ["0.03"] |

## Correct alternatives

Alternative 1:
```text
function total(count,price)
return count*price
endfunction
n=int(input("Tickets"))
p=float(input("Price"))
print(total(n,p))
```

Alternative 2:
```text
n=int(input("Tickets"))
p=float(input("Price"))
print(n*p)
```

## Deliberate faulty variants

price truncated:
```text
n=int(input("Tickets"))
p=int(input("Price"))
print(n*p)
```

adds inputs:
```text
n=int(input("Tickets"))
p=float(input("Price"))
print(n+p)
```

## Hints
1. A function returns a value that another expression can use.
2. The main program reads inputs, then passes two numbers to the function.
3. Use return count*price inside function total(count, price); print(total(...)) in the main program.

## Self-review criteria
- I can identify the parameters and distinguish them from arguments.
- My function computes a value without reading main-program variables.
- I know the output tests alone cannot tell whether I understand functions.

## Known misconceptions
- Printing inside a procedure used as a value
- Using main-scope variables
- Integer-casting the price

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
