import styles from "./index.module.css";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Error404() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>404 Not found</h1>
        <p>La page à laquelle vous avez tenté d'accéder n'existe pas.</p>
        <Button variant="contained" onClick={() => navigate("/")}>
          Se connecter
        </Button>
      </div>
    </div>
  );
}
