import styles from "./styles.module.css";
import { useState } from "react";
import useAppDispatch from "../../../hooks/useAppDispatch";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../components/Form/Form";
import { mdiLogin } from "@mdi/js";
import Alert from "../../../components/Alert/Alert";
import Spinner from "../../../components/Spinner/Spinner";
import { setUserInformation } from "../../../stores/user/userReducer";
import errorToString from "../../../utils/errorToString";
import { getUserInformation } from "../../../api/userApi";
import { signIn } from "../../../api/authApi";

interface IProps {
	isSendingRequest: boolean;
	onRequestStart: () => void;
	onRequestEnd: () => void;
	onClose: () => void;
	onSignUpClick: () => void;
}

export default function SignInForm({
	isSendingRequest,
	onRequestStart,
	onRequestEnd,
	onClose,
	onSignUpClick,
}: IProps) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const dispatch = useAppDispatch();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage("");

		try {
			onRequestStart();
			await signIn(username, password);
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
			<FormHeader icon={mdiLogin} title="Sign-in" />
			<FormRows
				rows={[
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
								autoFocus
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
						onClick={onSignUpClick}>
						Don&apos;t have an account? Sign-up instead
					</button>

					<FormButtons onClose={onClose} submitText="Sign-in" />
				</>
			)}
		</Form>
	);
}
