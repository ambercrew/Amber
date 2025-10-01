import styles from "./styles.module.css";
import { useState } from "react";
import useAppSelector from "../../../hooks/useAppSelector";
import useAppDispatch from "../../../hooks/useAppDispatch";
import {
	selectLoginError,
	selectUserIsSendingRequest,
} from "../../../stores/user/userSelectors";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../components/Form/Form";
import { mdiLogin } from "@mdi/js";
import { login } from "../../../stores/user/userActions";
import Alert from "../../../components/Alert/Alert";
import Spinner from "../../../components/Spinner/Spinner";

interface IProps {
	onClose: () => void;
	onSignupClick: () => void;
}

export default function LoginForm({ onClose , onSignupClick }: IProps) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const loginErrorMessage = useAppSelector(selectLoginError);
	const isSendingRequest = useAppSelector(selectUserIsSendingRequest);
	const dispatch = useAppDispatch();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		await dispatch(login(username, password));
        onClose();
	};

	return (
		<Form onSubmit={e => void handleSubmit(e)}>
			<FormHeader icon={mdiLogin} title="Login" />
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

			{loginErrorMessage && (
				<Alert
					message={loginErrorMessage}
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
						className={`link ${styles.signupButtonLink}`}
						type="button"
						onClick={onSignupClick}>
						Don&apos;t have an account? Signup instead
					</button>

					<FormButtons onClose={onClose} submitText="Login" />
				</>
			)}
		</Form>
	);
}
