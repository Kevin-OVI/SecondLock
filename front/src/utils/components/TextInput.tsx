import { TextField, TextFieldProps } from "@mui/material";
import genericStyles from "../../styles/generic.module.css";

type TextInputProps = {
  error?: string;
} & Omit<TextFieldProps, "error">;

export default function TextInput({ error, ...props }: TextInputProps) {
  return (
    <div>
      {error && <p className={genericStyles.error}>{error}</p>}
      <TextField error={!!error} {...props} />
    </div>
  );
}
