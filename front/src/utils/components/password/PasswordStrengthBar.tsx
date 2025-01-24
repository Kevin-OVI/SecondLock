import {CSSProperties, useEffect, useState} from "react";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import styles from "./PasswordStrengthBar.module.css";
import genericStyles from "../../../styles/generic.module.css";

interface Rule {
  predicate: (password: string) => number | boolean;
  label: string;
  scoreCount?: number;
}

interface CheckedRule {
  label: string;
  passed: boolean;
}

interface PasswordStrengthBarProps {
  password: string;
}

const RULES: Rule[] = [
  {predicate: (password) => password.match(/[a-z]/) != null, label: "Au moins une lettre minuscule"},
  {predicate: (password) => password.match(/[A-Z]/) != null, label: "Au moins une lettre majuscule"},
  {predicate: (password) => password.match(/[0-9]/) != null, label: "Au moins un chiffre"},
  {predicate: (password) => password.match(/[^a-zA-Z0-9]/) != null, label: "Au moins un caractère spécial"},
  {predicate: (password) => password.length / 8, label: "Minimum 8 caractères", scoreCount: 2},
]

const MAX_SCORE = RULES.map(({scoreCount}) => scoreCount == null ? 1 : scoreCount).reduce((a, b) => a + b);

function checkPassword(password: string) {
  let checkedRules: CheckedRule[] = [];
  let score = 0;

  for (let {predicate, label, scoreCount} of RULES) {
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
    checkedRules.push({label, passed})
    score += passCount * (scoreCount == null ? 1 : scoreCount);
  }

  return {checkedRules, score};
}

export function isPasswordStrong(password: string): boolean {
  const {score} = checkPassword(password);
  return score === MAX_SCORE;
}

export default function PasswordStrengthBar({password}: PasswordStrengthBarProps) {
  const [strength, setStrength] = useState<number>(0);
  const [checkedRules, setCheckedRules] = useState<CheckedRule[]>([]);

  useEffect(() => {
    const {checkedRules, score} = checkPassword(password);
    checkedRules.sort((a, b) => a.passed === b.passed ? 0 : (a.passed ? 1 : -1));
    setStrength(score / MAX_SCORE);
    setCheckedRules(checkedRules);
  }, [password]);


  return <div className={styles.PasswordStrengthBar} style={{"--password-strength": strength} as CSSProperties}>
    <div className={styles.progressContainer}>
      <div className={styles.progress}></div>
      <div className={styles.progressText}>Mot de passe {strength < 0.4 ? "faible" : (strength === 1 ? "fort" : "moyen")}</div>
    </div>

    <div>
      {checkedRules.map(({label, passed}) => (
        <div className={styles.check} key={label}>{passed ? <CheckIcon className={genericStyles.colorGreen}/> : <CloseIcon className={genericStyles.colorRed}/>} {label}</div>
      ))}
    </div>
  </div>
}