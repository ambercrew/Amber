import styles from "./styles.module.css";
import { useState } from "react";
import useAppDispatch from "../../../hooks/useAppDispatch";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../components/Form/Form";
import { mdiAccountPlusOutline } from "@mdi/js";
import Alert from "../../../components/Alert/Alert";
import Spinner from "../../../components/Spinner/Spinner";
import { signUp } from "../../../api/authApi";
import errorToString from "../../../utils/errorToString";
import { setUserInformation } from "../../../stores/user/userReducer";
import { getUserInformation } from "../../../api/userApi";

interface IProps {
	isSendingRequest: boolean;
	onRequestStart: () => void;
	onRequestEnd: () => void;
	onClose: () => void;
	onSignInClick: () => void;
}

export default function SignUpForm({
	isSendingRequest,
	onRequestStart,
	onRequestEnd,
	onClose,
	onSignInClick,
}: IProps) {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const dispatch = useAppDispatch();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage("");

		if (password !== confirmPassword) {
			alert("Passwords do not match!");
			return;
		}

		try {
			onRequestStart();
			await signUp(username, password, email, firstName, lastName);
			const userInformation = await getUserInformation();
			dispatch(setUserInformation(userInformation));
			onClose();
		} catch (e) {
			console.error(e);
			setErrorMessage(errorToString(e));
		} finally {
			onRequestEnd();
		}
	};

	return (
		<Form onSubmit={e => void handleSubmit(e)}>
			<FormHeader icon={mdiAccountPlusOutline} title="Sign-up" />
			<FormRows
				rows={[
					{
						label: "Firstname",
						labelHtmlFor: "firstname",
						children: (
							<input
								id="firstname"
								type="text"
								maxLength={50}
								minLength={1}
								value={firstName}
								onChange={e => setFirstName(e.target.value)}
								autoFocus
								required
							/>
						),
					},
					{
						label: "Lastname",
						labelHtmlFor: "lastname",
						children: (
							<input
								id="lastname"
								type="text"
								maxLength={50}
								minLength={1}
								value={lastName}
								onChange={e => setLastName(e.target.value)}
								required
							/>
						),
					},
					{
						label: "Username",
						labelHtmlFor: "username",
						children: (
							<input
								id="username"
								type="text"
								maxLength={30}
								minLength={3}
								value={username}
								onChange={e => setUsername(e.target.value)}
								required
							/>
						),
					},
					{
						label: "Email",
						labelHtmlFor: "email",
						children: (
							<input
								id="email"
								type="text"
								maxLength={50}
								value={email}
								onChange={e => setEmail(e.target.value)}
								required
							/>
						),
					},
					{
						label: "Password",
						labelHtmlFor: "password",
						children: (
							<input
								id="password"
								type="password"
								value={password}
								onChange={e => setPassword(e.target.value)}
								minLength={8}
								required
							/>
						),
					},
					{
						label: "Confirm password",
						labelHtmlFor: "confirm-password",
						children: (
							<input
								id="confirm-password"
								type="password"
								value={confirmPassword}
								onChange={e =>
									setConfirmPassword(e.target.value)
								}
								minLength={8}
								required
							/>
						),
					},
				]}
			/>

			{errorMessage && (
				<Alert
					message={errorMessage}
					className={styles.errorAlert}
					type="error"
				/>
			)}

			{isSendingRequest && (
				<Spinner containerClassName={styles.spinner} />
			)}

			{!isSendingRequest && (
				<>
					<button
						className={`link ${styles.buttonLink}`}
						type="button"
						onClick={onSignInClick}>
						Alreday have an account? Sign-in instead
					</button>

					<FormButtons onClose={onClose} submitText="Sign-up" />
				</>
			)}
		</Form>
	);
}
