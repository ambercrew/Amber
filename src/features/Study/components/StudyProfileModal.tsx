import { useEffect, useState } from "react";
import {
	Badge,
	Box,
	Button,
	Flex,
	Group,
	Modal,
	ScrollArea,
	Scroller,
	Stack,
	Text,
	useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { PlusIcon } from "@phosphor-icons/react";
import { listStudyProfiles } from "../../../api/study/api/studyProfileApi";
import { StudyProfileDto } from "../../../api/study/dto/studyProfileDto";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { closeStudyProfileModal } from "../../../stores/app/appReducer";
import { selectIsStudyProfileModalOpened } from "../../../stores/app/appSelectors";
import ProfileForm from "./ProfileForm";

function StudyProfileModal() {
	const opened = useAppSelector(selectIsStudyProfileModalOpened);
	const dispatch = useAppDispatch();
	const [profiles, setProfiles] = useState<StudyProfileDto[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const theme = useMantineTheme();
	const isMobile =
		useMediaQuery(`(max-width: ${theme.breakpoints.sm})`) ?? false;

	function refresh() {
		void listStudyProfiles().then(list => {
			setProfiles(list);
			setSelectedId(prev =>
				prev && list.some(profile => profile.id === prev)
					? prev
					: (list[0]?.id ?? null),
			);
		});
	}

	useEffect(() => {
		if (opened) refresh();
	}, [opened]);

	const selected =
		profiles.find(profile => profile.id === selectedId) ?? null;

	const profileButtons = (
		<>
			{profiles.map(profile => (
				<Button
					key={profile.id}
					variant={profile.id === selectedId ? "light" : "subtle"}
					color="gray"
					justify="space-between"
					fullWidth={!isMobile}
					rightSection={
						profile.isDefault ? (
							<Badge size="xs" variant="light">
								Default
							</Badge>
						) : undefined
					}
					onClick={() => setSelectedId(profile.id)}>
					<Text truncate="end">{profile.name}</Text>
				</Button>
			))}
			<Button
				variant="subtle"
				size="sm"
				leftSection={<PlusIcon size={14} />}
				onClick={() => setSelectedId(null)}>
				Create new profile
			</Button>
		</>
	);

	return (
		<Modal
			opened={opened}
			onClose={() => dispatch(closeStudyProfileModal())}
			title="Study profiles"
			fullScreen={isMobile}
			centered
			size="lg">
			<Flex
				direction={{ base: "column", sm: "row" }}
				align={{ base: "stretch", sm: "flex-start" }}
				gap="md">
				{isMobile ? (
					<Scroller w="100%">
						<Group gap={4} wrap="nowrap">
							{profileButtons}
						</Group>
					</Scroller>
				) : (
					<ScrollArea.Autosize
						mah={420}
						w={180}
						type="auto"
						scrollbarSize={6}>
						<Stack gap={6}>{profileButtons}</Stack>
					</ScrollArea.Autosize>
				)}

				<Box flex={1} w={{ base: "100%", sm: "auto" }}>
					<ProfileForm
						key={selectedId ?? "new"}
						profile={selected}
						onSaved={refresh}
					/>
				</Box>
			</Flex>
		</Modal>
	);
}

export default StudyProfileModal;
