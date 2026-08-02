import { ActionIcon, Alert, Menu, Stack } from "@mantine/core";
import { HouseIcon, PlusSquareIcon } from "@phosphor-icons/react";
import { useNavigate } from "react-router";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { clearTreeError } from "../../../stores/elements/elementsReducer";
import CreateElementDropDown from "./CreateElementMenuDropDown";
import {
	selectElementTree,
	selectElementTreeError,
} from "../../../stores/elements/elementsSelectors";
import ElementTree from "./ElementTree/ElementTree";
import { paths } from "../../../paths";
import PanelHeader from "./PanelHeader";

function ElementTreePanel() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const tree = useAppSelector(selectElementTree);
	const error = useAppSelector(selectElementTreeError);

	return (
		<Stack gap="xs">
			{error && (
				<Alert
					color="red"
					title={error}
					withCloseButton
					onClose={() => dispatch(clearTreeError())}
				/>
			)}
			<PanelHeader title="Elements">
				<ActionIcon
					variant="subtle"
					size="md"
					title="Home"
					onClick={() => void navigate(paths.root())}>
					<HouseIcon size={20} />
				</ActionIcon>
				<Menu position="bottom-end">
					<Menu.Target>
						<ActionIcon
							variant="subtle"
							size="md"
							title="New element">
							<PlusSquareIcon size={20} />
						</ActionIcon>
					</Menu.Target>
					<CreateElementDropDown elementId={null} />
				</Menu>
			</PanelHeader>
			<ElementTree tree={tree} />
		</Stack>
	);
}

export default ElementTreePanel;
