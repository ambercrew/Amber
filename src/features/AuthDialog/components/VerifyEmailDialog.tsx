import styles from "./styles.module.css";
import { useState } from "react";
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
import useAppSelector from "../../../hooks/useAppSelector";
import { selectUserInformation } from "../../../stores/user/userSelectors";
import { getUserInformation } from "../../../api/backend/api/userApi";
import { setUserInformation } from "../../../stores/user/userReducer";
import {
	resendEmailVerificationCode,
	verifyUserEmail,
} from "../../../api/backend/api/authApi";
import Dialog from "../../../components/Dialog/Dialog";
import useApi from "../../../hooks/useApi";

interface Props {
	onClose: () => void;
}

export default function VerifyEmailDialog({ onClose }: Props) {
	const [verificationCode, setVerificationCode] = useState("");
	const [
		showVerificationCodeSentSuccessMessage,
		setShowVerificationCodeSentSuccessMessage,
	] = useState(false);
	const { errorMessage, isSendingRequest, clearErrorMessage, callApi } =
		useApi();
	const userInformation = useAppSelector(selectUserInformation);
	const dispatch = useAppDispatch();

	const handleClose = () => {
		if (!isSendingRequest) onClose();
	};

	const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		clearErrorMessage();

		void callApi(async () => {
			await verifyUserEmail(verificationCode);

			const userInformation = await getUserInformation();
			dispatch(setUserInformation(userInformation));

			handleClose();
		});
	};

	const handleResendVerificationCode = () => {
		clearErrorMessage();

		void callApi(async () => {
			await resendEmailVerificationCode();
			setShowVerificationCodeSentSuccessMessage(true);
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
