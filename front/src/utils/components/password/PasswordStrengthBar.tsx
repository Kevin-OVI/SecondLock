import {CSSProperties, useEffect, useState} from "react";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import styles from "./PasswordStrengthBar.module.css";
import genericStyles from "../../../styles/generic.module.css";
import {CheckedRule, checkPassword, MAX_SCORE} from "./checker.ts";

interface PasswordStrengthBarProps {
  password: string;
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