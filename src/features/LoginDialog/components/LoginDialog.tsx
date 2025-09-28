import styles from "./styles.module.css";
import Dialog from "../../../components/Dialog/Dialog";
import { mdiLogin } from "@mdi/js";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../components/Form/Form";

interface IProps {
	onClose: () => void;
}

// TODO: add registion from here
export default function LoginDialog({ onClose }: IProps) {
	return (
		<Dialog className={styles.box} onHide={onClose}>
			<Form>
				<FormHeader icon={mdiLogin} title="Login" />
				<FormRows
					rows={[
						{
							label: "Username: ",
							labelHtmlFor: "username",
							children: (
								<input
									id="username"
									type="text"
									placeholder="Enter your username..."
									maxLength={30}
									minLength={3}
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
									minLength={8}
								/>
							),
						},
					]}
				/>

				<FormButtons onClose={onClose} submitText="Login" />
			</Form>
		</Dialog>
	);
}
