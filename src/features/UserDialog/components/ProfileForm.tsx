import styles from "./styles.module.css";
import { useState } from "react";
import useAppSelector from "../../../hooks/useAppSelector";
import {
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
import useAppDispatch from "../../../hooks/useAppDispatch";
import { getUserInformation, updateUserInformation } from "../../../api/authApi";
import { setUserInformation } from "../../../stores/user/userReducer";
import errorToString from "../../../utils/errorToString";

interface IProps {
	onClose: () => void;
}

// TODO: add signout button
export default function ProfileForm({onClose}: IProps) {
    const userInformation = useAppSelector(selectUserInformation)!;
	const [firstName, setFirstName] = useState(userInformation.firstName);
	const [lastName, setLastName] = useState(userInformation.lastName);
    const [errorMessage, setErrorMessage] = useState("");
	const isSendingRequest = useAppSelector(selectUserIsSendingRequest);
    const dispatch = useAppDispatch();

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

        if (userInformation.firstName == firstName && userInformation.lastName == lastName) {
            onClose();
            return;
        }

        try {
            await updateUserInformation(firstName, lastName);
            const userInformation = await getUserInformation();
            dispatch(setUserInformation(userInformation));
            onClose();
        } catch (e) {
            console.error(e);
            setErrorMessage(errorToString(e));
        }
	};

	return (
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
                <FormButtons onClose={onClose} submitText="Update" />
			)}
		</Form>
	);

}
