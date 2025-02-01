import {ReactNode} from "react";
import styles from "./index.module.css";

interface NoteProps {
  children: ReactNode;
}

export function WarningNote({children}: NoteProps) {
  return (
    <div className={styles.warningNote}>
      <div>{children}</div>
    </div>
  );

}