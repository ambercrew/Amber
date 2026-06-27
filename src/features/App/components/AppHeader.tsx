import { ActionIcon, Anchor, Breadcrumbs, Group } from "@mantine/core";
import { SidebarSimpleIcon } from "@phosphor-icons/react";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { setSelectedElementId } from "../../../stores/elements/elementsReducer";
import { selectElementPath } from "../../../stores/elements/elementsSelectors";

interface AppHeaderProps {
	onToggleSidebar: () => void;
}

function AppHeader({ onToggleSidebar }: AppHeaderProps) {
	const dispatch = useAppDispatch();
	const path = useAppSelector(selectElementPath);

	return (
		<Group h="100%" p="md" gap="xs" align="center">
			<ActionIcon variant="subtle" onClick={onToggleSidebar}>
				<SidebarSimpleIcon size={20} />
			</ActionIcon>
			{path.length > 0 && (
				<Breadcrumbs>
					{path.map(item => (
						<Anchor
							key={item.id.id}
							onClick={() =>
								dispatch(setSelectedElementId(item.id))
							}>
							{item.name}
						</Anchor>
					))}
				</Breadcrumbs>
			)}
		</Group>
	);
}

export default AppHeader;
