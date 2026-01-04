import styles from "../styles.module.css";
import { useState } from "react";
import useAppSelector from "../../../../hooks/useAppSelector";
import { selectUserInformation } from "../../../../stores/user/userSelectors";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../../components/Form/Form";
import { mdiAccountOutline } from "@mdi/js";
import Alert from "../../../../components/Alert/Alert";
import Spinner from "../../../../components/Spinner/Spinner";
import useAppDispatch from "../../../../hooks/useAppDispatch";
import {
	setLoggedOf,
	setUserInformation,
} from "../../../../stores/user/userReducer";
import errorToString from "../../../../utils/errorToString";
import {
	getUserInformation,
	updateUserInformation,
} from "../../../../api/userApi";
import { signOut, updatePassword } from "../../../../api/authApi";
import DeleteUserDialog from "../DeleteUserDialog";

interface Props {
	isSendingRequest: boolean;
	onRequestStart: () => void;
	onRequestEnd: () => void;
	onClose: () => void;
}

export default function ProfileForm({
	isSendingRequest,
	onRequestStart,
	onRequestEnd,
	onClose,
}: Props) {
	const userInformation = useAppSelector(selectUserInformation)!;
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmNewPassword, setConfirmNewPassword] = useState("");
	const [firstName, setFirstName] = useState(userInformation.firstName);
	const [lastName, setLastName] = useState(userInformation.lastName);
	const [errorMessage, setErrorMessage] = useState("");
	const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
	const dispatch = useAppDispatch();

	const executeRequest = async (cb: () => Promise<void>) => {
		setErrorMessage("");

		try {
			onRequestStart();
			await cb();
		} catch (e) {
			console.error(e);
			setErrorMessage(errorToString(e));
		} finally {
			onRequestEnd();
		}
	};

	const handleSignOut = () =>
		executeRequest(async () => {
			await signOut();
			dispatch(setLoggedOf());
		});

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage("");

		if (newPassword !== confirmNewPassword) {
			setErrorMessage("Passwords do not match!");
			return;
		}

		if (
			newPassword.length === 0 &&
			userInformation.firstName === firstName &&
			userInformation.lastName === lastName
		) {
			onClose();
			return;
		}

		await executeRequest(async () => {
			if (newPassword.length > 0) {
				await updatePassword(currentPassword, newPassword);
			}

			if (
				userInformation.firstName !== firstName ||
				userInformation.lastName !== lastName
			) {
				await updateUserInformation(firstName, lastName);
				dispatch(setUserInformation(await getUserInformation()));
			}

			onClose();
		});
	};

	return (
		<>
			<Form onSubmit={e => void handleSubmit(e)}>
				<FormHeader icon={mdiAccountOutline} title="Profile" />
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
									value={userInformation.username}
									readOnly
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
									value={userInformation.email}
									readOnly
									required
								/>
							),
						},
						{
							label: "Current password",
							labelHtmlFor: "current-password",
							children: (
								<input
									id="current-password"
									type="password"
									value={currentPassword}
									onChange={e =>
										setCurrentPassword(e.target.value)
									}
									minLength={8}
								/>
							),
						},
						{
							label: "New password",
							labelHtmlFor: "new-password",
							children: (
								<input
									id="new-password"
									type="password"
									value={newPassword}
									onChange={e =>
										setNewPassword(e.target.value)
									}
									minLength={8}
								/>
							),
						},
						{
							label: "Confirm new password",
							labelHtmlFor: "confirm-password",
							children: (
								<input
									id="confirm-password"
									type="password"
									value={confirmNewPassword}
									onChange={e =>
										setConfirmNewPassword(e.target.value)
									}
									minLength={8}
								/>
							),
						},
						{
							children: (
								<button
									className="red"
									type="button"
									onClick={() => void handleSignOut()}>
									Sign-out
								</button>
							),
						},
						{
							children: (
								<button
									className="link"
									type="button"
									onClick={() =>
										setShowDeleteUserDialog(true)
									}>
									Delete my account
								</button>
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
					<FormButtons onClose={onClose} submitText="Update" />
				)}
			</Form>

			{showDeleteUserDialog && (
				<DeleteUserDialog
					onHide={() => setShowDeleteUserDialog(false)}
				/>
			)}
		</>
	);
}
