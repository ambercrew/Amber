import { Alert, Stack } from "@mantine/core";
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
			<PanelHeader
				title="Elements"
				actions={[
					{
						icon: <HouseIcon />,
						label: "Home",
						onClick: () => void navigate(paths.root()),
					},
					{
						icon: <PlusSquareIcon />,
						label: "New element",
						menu: <CreateElementDropDown elementId={null} />,
					},
				]}
			/>
			<ElementTree tree={tree} />
		</Stack>
	);
}

export default ElementTreePanel;
