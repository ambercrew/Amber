import styles from "./styles.module.css";
import Dialog from "../../../components/Dialog/Dialog";
import { mdiLogin } from "@mdi/js";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../components/Form/Form";
import { useState } from "react";
import Alert from "../../../components/Alert/Alert";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { login } from "../../../stores/user/userActions";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectLoginError } from "../../../stores/user/userSelectors";

interface IProps {
	onClose: () => void;
}

// TODO: add registion here
export default function LoginDialog({ onClose }: IProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const loginErrorMessage = useAppSelector(selectLoginError);
	const dispatch = useAppDispatch();

    const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await dispatch(login(username, password));
    };

	return (
		<Dialog className={styles.box} onHide={onClose}>
			<Form onSubmit={(e) => void handleLoginSubmit(e)}>
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
									placeholder="Enter your username..."
									maxLength={30}
									minLength={3}
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
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
									placeholder="Enter your password..."
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
									minLength={8}
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

				<FormButtons onClose={onClose} submitText="Login" />
			</Form>
		</Dialog>
	);
}
