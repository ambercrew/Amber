import styles from "./styles.module.css";
import { useState } from "react";
import useAppSelector from "../../../hooks/useAppSelector";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { selectLoginError } from "../../../stores/user/userSelectors";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../components/Form/Form";
import { mdiLogin } from "@mdi/js";
import { login } from "../../../stores/user/userActions";
import Alert from "../../../components/Alert/Alert";

interface IProps {
	onCancel: () => void;
	onSignupClick: () => void;
}

export default function LoginForm({ onCancel, onSignupClick }: IProps) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const loginErrorMessage = useAppSelector(selectLoginError);
	const dispatch = useAppDispatch();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		await dispatch(login(username, password));
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

			<button
				className={`link ${styles.signupButtonLink}`}
				type="button"
				onClick={onSignupClick}>
				Don&apos;t have an account? Signup instead
			</button>

			<FormButtons onClose={onCancel} submitText="Login" />
		</Form>
	);
}
