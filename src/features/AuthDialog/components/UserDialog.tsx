import styles from "./styles.module.css";
import Dialog from "../../../components/Dialog/Dialog";
import SignInForm from "./forms/SignInForm";
import { useState } from "react";
import SignUpForm from "./forms/SignUpForm";

interface Props {
	onClose: () => void;
}

export default function UserDialog({ onClose }: Props) {
	const [typeOfForm, setTypeOfForm] = useState<"sign-in" | "sign-up">(
		"sign-in",
	);
	const [isSendingRequest, setIsSendingRequest] = useState(false);

	const handleClose = () => {
		if (!isSendingRequest) onClose();
	};

	return (
		<Dialog className={styles.box} onHide={handleClose} focusTrap={true}>
			{typeOfForm === "sign-in" && (
				<SignInForm
					isSendingRequest={isSendingRequest}
					onRequestStart={() => setIsSendingRequest(true)}
					onRequestEnd={() => setIsSendingRequest(false)}
					onClose={handleClose}
					onSignUpClick={() => setTypeOfForm("sign-up")}
				/>
			)}

			{typeOfForm === "sign-up" && (
				<SignUpForm
					isSendingRequest={isSendingRequest}
					onRequestStart={() => setIsSendingRequest(true)}
					onRequestEnd={() => setIsSendingRequest(false)}
					onClose={handleClose}
					onSignInClick={() => setTypeOfForm("sign-in")}
				/>
			)}
		</Dialog>
	);
}
