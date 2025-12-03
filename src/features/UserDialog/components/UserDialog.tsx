import styles from "./styles.module.css";
import Dialog from "../../../components/Dialog/Dialog";
import SignInForm from "./SignInForm";
import { useState } from "react";
import SignUpForm from "./SignUpForm";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectIsSignedIn } from "../../../stores/user/userSelectors";
import ProfileForm from "./ProfileForm";

interface IProps {
	onClose: () => void;
}

export default function UserDialog({ onClose }: IProps) {
	const [typeOfForm, setTypeOfForm] = useState<"sign-in" | "sign-up">(
		"sign-in",
	);
	const [isSendingRequest, setIsSendingRequest] = useState(false);
	const isSignedIn = useAppSelector(selectIsSignedIn);

	const handleClose = () => {
		if (!isSendingRequest) onClose();
	};

	return (
		<Dialog className={styles.box} onHide={handleClose}>
			{!isSignedIn &&
				(typeOfForm === "sign-in" ? (
					<SignInForm
						isSendingRequest={isSendingRequest}
						onRequestStart={() => setIsSendingRequest(true)}
						onRequestEnd={() => setIsSendingRequest(false)}
						onClose={handleClose}
						onSignUpClick={() => setTypeOfForm("sign-up")}
					/>
				) : (
					<SignUpForm
						isSendingRequest={isSendingRequest}
						onRequestStart={() => setIsSendingRequest(true)}
						onRequestEnd={() => setIsSendingRequest(false)}
						onClose={handleClose}
						onSignInClick={() => setTypeOfForm("sign-in")}
					/>
				))}

			{isSignedIn && (
				<ProfileForm
					isSendingRequest={isSendingRequest}
					onRequestStart={() => setIsSendingRequest(true)}
					onRequestEnd={() => setIsSendingRequest(false)}
					onClose={handleClose}
				/>
			)}
		</Dialog>
	);
}
