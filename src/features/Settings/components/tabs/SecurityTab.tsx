import { useNavigate } from "react-router";
import { FormRows } from "../../../../components/Form/Form";
import useAppDispatch from "../../../../hooks/useAppDispatch";
import { SecurityTabState } from "../../types/securityTabState";
import { TabProps } from "../../types/tabProps";
import { signOut } from "../../../../stores/user/userActions";

export default function SecurityTab({
	state,
	setState,
	executeRequest,
}: TabProps) {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();

	const updateState = (newState: Partial<SecurityTabState>) => {
		setState({
			...state,
			securityTabState: {
				...state.securityTabState,
				...newState,
			},
		});
	};

	const handleSignOut = () =>
		executeRequest(async () => {
			await dispatch(signOut(navigate));
		});

	return (
		<FormRows
			rows={[
				{
					label: "Current password",
					labelHtmlFor: "current-password",
					children: (
						<input
							id="current-password"
							type="password"
							value={state.securityTabState.currentPassword}
							onChange={e =>
								updateState({ currentPassword: e.target.value })
							}
							minLength={8}
							autoFocus
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
							value={state.securityTabState.newPassword}
							onChange={e =>
								updateState({ newPassword: e.target.value })
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
							value={state.securityTabState.confirmNewPassword}
							onChange={e =>
								updateState({
									confirmNewPassword: e.target.value,
								})
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
								updateState({ showDeleteUserDialog: true })
							}>
							Delete my account
						</button>
					),
				},
			]}
		/>
	);
}
