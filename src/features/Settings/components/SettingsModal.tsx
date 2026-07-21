import { ReactNode, useState } from "react";
import { Box, Burger, Drawer, Group, Modal, NavLink } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DatabaseIcon, InfoIcon, PaletteIcon } from "@phosphor-icons/react";
import { useIsSmallScreen } from "../../../hooks/useIsSmallScreen";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { closeSettingsModal } from "../../../stores/app/appReducer";
import { selectIsSettingsModalOpened } from "../../../stores/app/appSelectors";
import AppearanceTab from "./AppearanceTab";
import DataTab from "./DataTab";
import AboutTab from "./AboutTab";

interface Section {
	value: string;
	label: string;
	icon: ReactNode;
	render: () => ReactNode;
}

/** Fixed height of the modal body on desktop so it stays constant across
 * sections instead of resizing to fit each one's content. */
const MODAL_CONTENT_HEIGHT = 500;

const SECTIONS: Section[] = [
	{
		value: "appearance",
		label: "Appearance",
		icon: <PaletteIcon />,
		render: () => <AppearanceTab />,
	},
	{
		value: "data",
		label: "Data",
		icon: <DatabaseIcon />,
		render: () => <DataTab />,
	},
	{
		value: "about",
		label: "About",
		icon: <InfoIcon />,
		render: () => <AboutTab />,
	},
];

function SettingsModal() {
	const opened = useAppSelector(selectIsSettingsModalOpened);
	const dispatch = useAppDispatch();
	const isSmallScreen = useIsSmallScreen();
	const [active, setActive] = useState(SECTIONS[0].value);
	const [navOpened, { open: openNav, close: closeNav }] =
		useDisclosure(false);

	const activeSection =
		SECTIONS.find(section => section.value === active) ?? SECTIONS[0];

	function renderNavLinks(onSelect?: () => void) {
		return SECTIONS.map(section => (
			<NavLink
				key={section.value}
				active={section.value === active}
				label={section.label}
				leftSection={section.icon}
				onClick={() => {
					setActive(section.value);
					onSelect?.();
				}}
			/>
		));
	}

	return (
		<Modal
			opened={opened}
			onClose={() => dispatch(closeSettingsModal())}
			title={
				<Group gap="xs">
					{isSmallScreen && (
						<Burger
							opened={navOpened}
							onClick={openNav}
							size="sm"
							aria-label="Open settings navigation"
						/>
					)}
					Settings
				</Group>
			}
			fullScreen={isSmallScreen}
			centered
			size="lg"
			closeButtonProps={{ "aria-label": "Close" }}>
			{isSmallScreen ? (
				<>
					<Drawer
						opened={navOpened}
						onClose={closeNav}
						title="Settings"
						size="70%"
						closeButtonProps={{ "aria-label": "Close" }}>
						{renderNavLinks(closeNav)}
					</Drawer>
					<Box>{activeSection.render()}</Box>
				</>
			) : (
				<Group
					align="stretch"
					gap="lg"
					wrap="nowrap"
					h={MODAL_CONTENT_HEIGHT}>
					<Box w={180}>{renderNavLinks()}</Box>
					<Box
						style={{
							flex: 1,
							minWidth: 0,
							overflowY: "auto",
							overflowX: "hidden",
						}}>
						{activeSection.render()}
					</Box>
				</Group>
			)}
		</Modal>
	);
}

export default SettingsModal;
