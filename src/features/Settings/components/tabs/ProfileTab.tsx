import { FormRows } from "../../../../components/Form/Form";
import { UserInformationDto } from "../../../../types/backend/dto/userInformationDto";
import { TabProps } from "../../types/tabProps";

export default function ProfileTab({ state, setState }: TabProps) {
	const updateUserInformation = (newValues: Partial<UserInformationDto>) => {
		setState({
			...state,
			userInformation: {
				...state.userInformation!,
				...newValues,
			},
		});
	};

	return (
		state.userInformation && (
			<FormRows
				rows={[
					{
						label: "First name",
						labelHtmlFor: "first-name",
						children: (
							<input
								id="first-name"
								type="text"
								maxLength={50}
								minLength={1}
								value={state.userInformation.firstName}
								onChange={e =>
									updateUserInformation({
										firstName: e.target.value,
									})
								}
								autoFocus
							/>
						),
					},
					{
						label: "Last name",
						labelHtmlFor: "last-name",
						children: (
							<input
								id="last-name"
								type="text"
								maxLength={50}
								minLength={1}
								value={state.userInformation.lastName}
								onChange={e =>
									updateUserInformation({
										lastName: e.target.value,
									})
								}
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
								value={state.userInformation.username}
								readOnly
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
								value={state.userInformation.email}
								readOnly
							/>
						),
					},
				]}
			/>
		)
	);
}
