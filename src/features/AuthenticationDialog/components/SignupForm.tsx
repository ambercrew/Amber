import styles from "./styles.module.css";
import { useState } from "react";
import useAppSelector from "../../../hooks/useAppSelector";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { selectSignupError } from "../../../stores/user/userSelectors";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../components/Form/Form";
import { mdiAccountPlusOutline } from "@mdi/js";
import Alert from "../../../components/Alert/Alert";
import { signup } from "../../../stores/user/userActions";

interface IProps {
	onCancel: () => void;
	onLoginClick: () => void;
}

export default function SignupForm({ onCancel, onLoginClick }: IProps) {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const signupErrorMessage = useAppSelector(selectSignupError);
	const dispatch = useAppDispatch();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

		await dispatch(signup(username, password, email, firstName, lastName));
	};

	return (
		<Form onSubmit={e => void handleSubmit(e)}>
			<FormHeader icon={mdiAccountPlusOutline} title="Signup" />
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
								onChange={e => setConfirmPassword(e.target.value)}
								minLength={8}
								required
							/>
						),
					},
				]}
			/>

			{signupErrorMessage && (
				<Alert
					message={signupErrorMessage}
					className={styles.errorAlert}
					type="error"
				/>
			)}

			<button
				className={`link ${styles.signupButtonLink}`}
				type="button"
				onClick={onLoginClick}>
				Alreday have an account? Login instead
			</button>

			<FormButtons onClose={onCancel} submitText="Signup" />
		</Form>
	);
}
