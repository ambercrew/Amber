import styles from "./styles.module.css";
import Dialog from "../../../components/Dialog/Dialog";
import LoginForm from "./LoginForm";
import { useState } from "react";
import SignupForm from "./SignupForm";

interface IProps {
	onCancel: () => void;
}

export default function AuthenticationDialog({ onCancel }: IProps) {
	const [typeOfForm, setTypeOfForm] = useState<"login" | "signup">("login");

	return (
		<Dialog className={styles.box} onHide={onCancel}>
			{typeOfForm == "login" ? (
				<LoginForm
					onCancel={onCancel}
					onSignupClick={() => setTypeOfForm("signup")}
				/>
			) : (
				<SignupForm
					onCancel={onCancel}
					onLoginClick={() => setTypeOfForm("login")}
				/>
			)}
		</Dialog>
	);
}
