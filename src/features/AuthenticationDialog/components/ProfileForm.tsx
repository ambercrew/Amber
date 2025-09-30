import styles from "./styles.module.css";
import { useState } from "react";
import useAppSelector from "../../../hooks/useAppSelector";
import {
	selectSignupError,
	selectUserInformation,
	selectUserIsSendingRequest,
} from "../../../stores/user/userSelectors";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../components/Form/Form";
import { mdiAccountOutline } from "@mdi/js";
import Alert from "../../../components/Alert/Alert";
import Spinner from "../../../components/Spinner/Spinner";

interface IProps {
	onCancel: () => void;
}

// TODO: add signout button
export default function ProfileForm({onCancel}: IProps) {
    const userInformation = useAppSelector(selectUserInformation)!;
	const [firstName, setFirstName] = useState(userInformation.firstName);
	const [lastName, setLastName] = useState(userInformation.lastName);
	const signupErrorMessage = useAppSelector(selectSignupError);
	const isSendingRequest = useAppSelector(selectUserIsSendingRequest);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
        // TODO:
	};

	return (
		<Form onSubmit={e => handleSubmit(e)}>
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
				]}
			/>

			{signupErrorMessage && (
				<Alert
					message={signupErrorMessage}
					className={styles.errorAlert}
					type="error"
				/>
			)}

			{isSendingRequest && (
				<Spinner containerClassName={styles.spinner} />
			)}

			{!isSendingRequest && (
                <FormButtons onClose={onCancel} submitText="Update" />
			)}
		</Form>
	);

}
