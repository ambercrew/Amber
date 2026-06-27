import { ActionIcon, Anchor, Breadcrumbs, Group } from "@mantine/core";
import { SidebarSimpleIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useElementParams } from "../../../hooks/useElementParams";
import useAppSelector from "../../../hooks/useAppSelector";
import {
	getElementPath,
	selectElementTree,
} from "../../../stores/elements/elementsSelectors";
import { paths } from "../../../paths";

interface AppHeaderProps {
	onToggleSidebar: () => void;
}

function AppHeader({ onToggleSidebar }: AppHeaderProps) {
	const navigate = useNavigate();
	const selected = useElementParams();
	const tree = useAppSelector(selectElementTree);
	const path = useMemo(
		() => getElementPath(tree, selected),
		[tree, selected],
	);

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
								void navigate(
									paths.element(item.id.type, item.id.id),
								)
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
