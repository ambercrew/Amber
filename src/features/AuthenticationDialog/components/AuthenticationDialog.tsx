import styles from "./styles.module.css";
import Dialog from "../../../components/Dialog/Dialog";
import LoginForm from "./LoginForm";
import { useState } from "react";
import SignupForm from "./SignupForm";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectIsSignedIn, selectUserIsSendingRequest } from "../../../stores/user/userSelectors";
import ProfileForm from "./ProfileForm";

interface IProps {
	onClose: () => void;
}

// TODO: change name
export default function AuthenticationDialog({ onClose }: IProps) {
	const [typeOfForm, setTypeOfForm] = useState<"login" | "signup">("login");
	const isSendingRequest = useAppSelector(selectUserIsSendingRequest);
    const isSignedIn = useAppSelector(selectIsSignedIn);

	const handleClose = () => {
		if (!isSendingRequest) onClose();
	};

	return (
		<Dialog className={styles.box} onHide={handleClose}>
            {!isSignedIn && (typeOfForm == "login" ? (
				<LoginForm
					onClose={handleClose}
					onSignupClick={() => setTypeOfForm("signup")}
				/>
			) : (
				<SignupForm
					onClose={handleClose}
					onLoginClick={() => setTypeOfForm("login")}
				/>
			))}

            {isSignedIn && <ProfileForm onCancel={handleClose} />}
		</Dialog>
	);
}
