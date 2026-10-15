"""System Usability Scale scoring for the usability study (paper Section V-E).

Input: CSV with one row per participant and columns q1..q10 holding answers 1-5.
  q1,q2,...,q10
Odd items (1,3,5,7,9) are positively worded: score = answer - 1.
Even items (2,4,6,8,10) are negatively worded: score = 5 - answer.
SUS = 2.5 * sum(scores)  ->  0..100.

Usage:  python -m eval.sus responses.csv
Nothing is invented here: with no CSV it prints usage and exits.
"""
import csv
import statistics
import sys


def sus_score(answers):
    assert len(answers) == 10 and all(1 <= a <= 5 for a in answers), "need 10 answers in 1..5"
    total = 0
    for i, a in enumerate(answers, start=1):
        total += (a - 1) if i % 2 == 1 else (5 - a)
    return 2.5 * total


def adjective(score):
    # Bangor, Kortum & Miller (2008) adjective ratings (approximate cut-points)
    if score >= 85.5:
        return "Excellent"
    if score >= 72.75:
        return "Good"
    if score >= 52.0:
        return "OK"
    if score >= 38.0:
        return "Poor"
    return "Awful"


def main(path):
    scores = []
    with open(path, newline="", encoding="utf8") as f:
        for row in csv.DictReader(f):
            scores.append(sus_score([int(row[f"q{i}"]) for i in range(1, 11)]))
    n = len(scores)
    mean = statistics.mean(scores)
    sd = statistics.stdev(scores) if n > 1 else float("nan")
    print(f"n = {n}\nSUS mean = {mean:.1f}  (SD {sd:.1f})\nmin/max = {min(scores):.1f} / {max(scores):.1f}\nrating = {adjective(mean)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
