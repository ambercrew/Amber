import styles from "./styles.module.css";
import { useState, useTransition } from "react";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { mdiEmailCheckOutline } from "@mdi/js";
import Alert from "../../../components/Alert/Alert";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
	FormRowsProps,
} from "../../../components/Form/Form";
import Spinner from "../../../components/Spinner/Spinner";
import errorToString from "../../../utils/errorToString";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectUserInformation } from "../../../stores/user/userSelectors";
import { getUserInformation } from "../../../api/userApi";
import { setUserInformation } from "../../../stores/user/userReducer";
import {
	resendEmailVerificationCode,
	verifyUserEmail,
} from "../../../api/authApi";
import Dialog from "../../../components/Dialog/Dialog";

interface Props {
	onClose: () => void;
}

export default function VerifyEmailDialog({ onClose }: Props) {
	const [isSendingRequest, startRequest] = useTransition();
	const [verificationCode, setVerificationCode] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [
		showVerificationCodeSentSuccessMessage,
		setShowVerificationCodeSentSuccessMessage,
	] = useState(false);
	const userInformation = useAppSelector(selectUserInformation);
	const dispatch = useAppDispatch();

	const handleClose = () => {
		if (!isSendingRequest) onClose();
	};

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage("");

		startRequest(async () => {
			try {
				await verifyUserEmail(verificationCode);

				const userInformation = await getUserInformation();
				dispatch(setUserInformation(userInformation));

				handleClose();
			} catch (e) {
				console.error(e);
				setErrorMessage(errorToString(e));
			}
		});
	};

	const handleResendVerificationCode = () => {
		setErrorMessage("");

		startRequest(async () => {
			try {
				await resendEmailVerificationCode();
				setShowVerificationCodeSentSuccessMessage(true);
			} catch (e) {
				console.error(e);
				setErrorMessage(errorToString(e));
			}
		});
	};

	const formRowsProps: FormRowsProps = {
		rows: [
			{
				label: "Verification code",
				labelHtmlFor: "verification-code",
				children: (
					<input
						id="verification-code"
						type="text"
						maxLength={8}
						minLength={8}
						value={verificationCode}
						onChange={e => setVerificationCode(e.target.value)}
						required
						autoFocus
					/>
				),
			},
		],
	};

	if (!showVerificationCodeSentSuccessMessage) {
		formRowsProps.rows.push({
			children: (
				<button
					type="button"
					className="primary"
					onClick={handleResendVerificationCode}>
					Resend verification code
				</button>
			),
		});
	}

	return (
		<Dialog className={styles.box} onHide={handleClose} focusTrap={true}>
			<Form onSubmit={handleSubmit}>
				<FormHeader
					icon={mdiEmailCheckOutline}
					title="Verify your email address"
				/>
				<p className={`${styles.instructionText}`}>
					A verification code to is sent to{" "}
					<b>{userInformation?.email}</b>. Please check your inbox and
					enter the code below to verify your account.
				</p>
				<FormRows {...formRowsProps} />

				{errorMessage && (
					<Alert className={styles.alert} type="error">
						<p>{errorMessage}</p>
					</Alert>
				)}

				{showVerificationCodeSentSuccessMessage && (
					<Alert type="success" className={styles.alert}>
						<p>Verification code has been resent to your email!</p>
					</Alert>
				)}

				{isSendingRequest && (
					<Spinner containerClassName={styles.spinner} />
				)}

				{!isSendingRequest && (
					<FormButtons onClose={onClose} submitText="Submit" />
				)}
			</Form>
		</Dialog>
	);
}
