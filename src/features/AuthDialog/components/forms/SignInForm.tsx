import styles from "../styles.module.css";
import { useState } from "react";
import useAppDispatch from "../../../../hooks/useAppDispatch";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../../components/Form/Form";
import { mdiLoginVariant } from "@mdi/js";
import Alert from "../../../../components/Alert/Alert";
import Spinner from "../../../../components/Spinner/Spinner";
import errorToString from "../../../../utils/errorToString";
import { useNavigate } from "react-router";
import { signIn } from "../../../../stores/user/userActions.ts";

interface Props {
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
}: Props) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage("");

		try {
			onRequestStart();
			await dispatch(signIn(navigate, username, password));
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
			<FormHeader icon={mdiLoginVariant} title="Sign-in" />
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
				<Alert className={styles.alert} type="error">
					<p>{errorMessage}</p>
				</Alert>
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
