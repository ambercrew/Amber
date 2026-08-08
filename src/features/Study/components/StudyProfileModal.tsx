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
import { useMediaQuery, useResizeObserver } from "@mantine/hooks";
import { PlusIcon } from "@phosphor-icons/react";
import {
	getEffectiveStudyProfile,
	listStudyProfiles,
} from "../../../api/study/api/studyProfileApi";
import { StudyProfileDto } from "../../../api/study/dto/studyProfileDto";
import useAppDispatch from "../../../hooks/useAppDispatch";
import useAppSelector from "../../../hooks/useAppSelector";
import { closeStudyProfileModal } from "../../../stores/app/appReducer";
import { selectIsStudyProfileModalOpened } from "../../../stores/app/appSelectors";
import { selectCurrentElement } from "../../../stores/elements/elementsSelectors";
import ProfileForm from "./ProfileForm";

function StudyProfileModal() {
	const opened = useAppSelector(selectIsStudyProfileModalOpened);
	const currentElement = useAppSelector(selectCurrentElement);
	const dispatch = useAppDispatch();
	const [profiles, setProfiles] = useState<StudyProfileDto[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const theme = useMantineTheme();
	const isMobile =
		useMediaQuery(`(max-width: ${theme.breakpoints.sm})`) ?? false;
	const [formRef, formRect] = useResizeObserver();

	function refresh(
		pickInitialId?: (list: StudyProfileDto[]) => string | null,
	) {
		void listStudyProfiles().then(list => {
			setProfiles(list);
			setSelectedId(prev => {
				const initialId = pickInitialId?.(list);
				if (initialId && list.some(profile => profile.id === initialId))
					return initialId;
				if (prev && list.some(profile => profile.id === prev))
					return prev;
				return list[0]?.id ?? null;
			});
		});
	}

	useEffect(() => {
		if (!opened) return;

		if (currentElement) {
			void getEffectiveStudyProfile(currentElement.data.meta.elementId)
				.then(effective => refresh(() => effective.profile.id))
				.catch(() =>
					refresh(
						list =>
							list.find(profile => profile.isDefault)?.id ?? null,
					),
				);
		} else {
			refresh(
				list => list.find(profile => profile.isDefault)?.id ?? null,
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
					style={{ flexShrink: 0 }}
					styles={{ label: { flex: 1, minWidth: 0 } }}
					rightSection={
						profile.isDefault ? (
							<Badge size="xs" variant="light">
								Default
							</Badge>
						) : undefined
					}
					onClick={() => setSelectedId(profile.id)}>
					<Text truncate="end" style={{ minWidth: 0 }}>
						{profile.name}
					</Text>
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
			size="xl"
			closeButtonProps={{ "aria-label": "Close" }}>
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
						mah={formRect.height || undefined}
						offsetScrollbars>
						<Stack gap={6} w={180}>
							{profileButtons}
						</Stack>
					</ScrollArea.Autosize>
				)}

				<Box ref={formRef} flex={1}>
					<ProfileForm
						key={selectedId ?? "new"}
						profile={selected}
						onSaved={refresh}
						onSubmitted={() => dispatch(closeStudyProfileModal())}
					/>
				</Box>
			</Flex>
		</Modal>
	);
}

export default StudyProfileModal;
