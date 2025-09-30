import styles from "./styles.module.css";
import Dialog from "../../../components/Dialog/Dialog";
import LoginForm from "./LoginForm";
import { useState } from "react";
import SignupForm from "./SignupForm";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectUserIsSendingRequest } from "../../../stores/user/userSelectors";

interface IProps {
	onCancel: () => void;
}

export default function AuthenticationDialog({ onCancel }: IProps) {
	const [typeOfForm, setTypeOfForm] = useState<"login" | "signup">("login");
	const isSendingRequest = useAppSelector(selectUserIsSendingRequest);

	const handleCancel = () => {
		if (!isSendingRequest) onCancel();
	};

	return (
		<Dialog className={styles.box} onHide={handleCancel}>
			{typeOfForm == "login" ? (
				<LoginForm
					onCancel={handleCancel}
					onSignupClick={() => setTypeOfForm("signup")}
				/>
			) : (
				<SignupForm
					onCancel={handleCancel}
					onLoginClick={() => setTypeOfForm("login")}
				/>
			)}
		</Dialog>
	);
}
