import {DetailedHTMLProps, HTMLAttributes} from "react";
import styles from "./index.module.css";

type NoteProps = DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export function WarningNote({className, ...props}: NoteProps) {
  return <div className={styles.warningNote + (className ? ` ${className}` : "")} {...props}/>;
}