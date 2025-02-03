interface Rule {
  predicate: (password: string) => number | boolean;
  label: string;
  scoreCount?: number;
}

export interface CheckedRule {
  label: string;
  passed: boolean;
}

const RULES: Rule[] = [
  {
    predicate: (password) => password.match(/[a-z]/) != null,
    label: "Au moins une lettre minuscule",
  },
  {
    predicate: (password) => password.match(/[A-Z]/) != null,
    label: "Au moins une lettre majuscule",
  },
  {
    predicate: (password) => password.match(/[0-9]/) != null,
    label: "Au moins un chiffre",
  },
  {
    predicate: (password) => password.match(/[^a-zA-Z0-9]/) != null,
    label: "Au moins un caractère spécial",
  },
  {
    predicate: (password) => password.length / 8,
    label: "Minimum 8 caractères",
    scoreCount: 2,
  },
];

export const MAX_SCORE = RULES.map(({ scoreCount }) =>
  scoreCount == null ? 1 : scoreCount,
).reduce((a, b) => a + b);

export function checkPassword(password: string) {
  const checkedRules: CheckedRule[] = [];
  let score = 0;

  for (const { predicate, label, scoreCount } of RULES) {
    const result = predicate(password);
    let passed, passCount;
    if (typeof result === "number") {
      if (result >= 1) {
        passCount = 1;
        passed = true;
      } else if (result <= 0) {
        passed = false;
        passCount = 0;
      } else {
        passed = false;
        passCount = result;
      }
    } else {
      passed = result;
      passCount = result ? 1 : 0;
    }
    checkedRules.push({ label, passed });
    score += passCount * (scoreCount == null ? 1 : scoreCount);
  }

  return { checkedRules, score };
}

export default function isPasswordStrong(password: string): boolean {
  const { score } = checkPassword(password);
  return score === MAX_SCORE;
}
