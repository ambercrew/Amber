import styles from "./styles.module.css";
import Alert from "../../../components/Alert/Alert";
import { mdiAccountRemoveOutline } from "@mdi/js";
import Dialog from "../../../components/Dialog/Dialog";
import Spinner from "../../../components/Spinner/Spinner";
import Form, {
	FormHeader,
	FormRows,
	FormButtons,
} from "../../../components/Form/Form";
import { useState, useTransition } from "react";
import errorToString from "../../../utils/errorToString";
import { deleteUser } from "../../../api/userApi";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { setLoggedOf } from "../../../stores/user/userReducer";

interface Props {
	onHide: () => void;
}

// TODO: move to settings folder since iti s used only there, move css classes too
export default function DeleteUserDialog({ onHide }: Props) {
	const [isSendingRequest, startRequest] = useTransition();
	const [errorMessage, setErrorMessage] = useState("");
	const [inputText, setInputText] = useState("");
	const dispatch = useAppDispatch();

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrorMessage("");

		if (inputText !== "DELETE MY ACCOUNT") {
			setErrorMessage(
				"You need to write 'DELETE MY ACCOUNT' in the input to verify the deletion.",
			);
			return;
		}

		startRequest(async () => {
			try {
				await deleteUser();
				dispatch(setLoggedOf());
				onHide();
			} catch (e) {
				console.error(e);
				setErrorMessage(errorToString(e));
			}
		});
	};

	return (
		<Dialog focusTrap onHide={onHide} className={styles.box}>
			<Form onSubmit={handleSubmit}>
				<FormHeader
					icon={mdiAccountRemoveOutline}
					title="Delete your account"
				/>
				<p className={`${styles.instructionText}`}>
					<b>Deleting your account cannot be undone.</b> If you are
					sure, write &quot;DELETE MY ACCOUNT&quot; in the input field
					and mark the checkbox.
				</p>

				<FormRows
					rows={[
						{
							children: (
								<input
									type="text"
									value={inputText}
									onChange={e => setInputText(e.target.value)}
								/>
							),
						},
						{
							children: (
								<div className={`${styles.checkboxRow}`}>
									<input
										type="checkbox"
										id="delete-my-account"
										name="delete-my-account"
										required
									/>
									<label htmlFor="delete-my-account">
										Delete my account
									</label>
								</div>
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
					<FormButtons
						onClose={onHide}
						submitText="Delete"
						submitButtonType="red"
					/>
				)}
			</Form>
		</Dialog>
	);
}
