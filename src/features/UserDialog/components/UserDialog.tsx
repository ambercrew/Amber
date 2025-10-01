import styles from "./styles.module.css";
import Dialog from "../../../components/Dialog/Dialog";
import LoginForm from "./LoginForm";
import { useState } from "react";
import SignupForm from "./SignupForm";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectIsSignedIn } from "../../../stores/user/userSelectors";
import ProfileForm from "./ProfileForm";

interface IProps {
	onClose: () => void;
}

export default function UserDialog({ onClose }: IProps) {
	const [typeOfForm, setTypeOfForm] = useState<"login" | "signup">("login");
    const [isSendingRequest, setIsSendingRequest] = useState(false);
    const isSignedIn = useAppSelector(selectIsSignedIn);

	const handleClose = () => {
		if (!isSendingRequest) onClose();
	};

	return (
		<Dialog className={styles.box} onHide={handleClose}>
            {!isSignedIn && (typeOfForm == "login" ? (
				<LoginForm
                    isSendingRequest={isSendingRequest}
                    onRequestStart={() => setIsSendingRequest(true)}
                    onRequestEnd={() => setIsSendingRequest(false)}
					onClose={handleClose}
					onSignupClick={() => setTypeOfForm("signup")}
				/>
			) : (
				<SignupForm
                    isSendingRequest={isSendingRequest}
                    onRequestStart={() => setIsSendingRequest(true)}
                    onRequestEnd={() => setIsSendingRequest(false)}
					onClose={handleClose}
					onLoginClick={() => setTypeOfForm("login")}
				/>
			))}

            {isSignedIn && <ProfileForm
                isSendingRequest={isSendingRequest}
                onRequestStart={() => setIsSendingRequest(true)}
                onRequestEnd={() => setIsSendingRequest(false)}
                onClose={handleClose} />}
		</Dialog>
	);
}
