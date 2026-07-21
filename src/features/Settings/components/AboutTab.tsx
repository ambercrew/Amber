import { useEffect, useState } from "react";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import {
	BugIcon,
	ChatCircleDotsIcon,
	GithubLogoIcon,
} from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getAppVersion } from "../../../utils/tauriUtils";

// TODO: replace with the real links and add them to permissions
const GITHUB_URL = "TODO";
const FEEDBACK_URL = "TODO";
const DISCORD_URL = "TODO";

function AboutTab() {
	const [version, setVersion] = useState<string | null>(null);

	useEffect(() => {
		void getAppVersion().then(setVersion);
	}, []);

	return (
		<Stack gap="lg" pt="md">
			<Group gap="xs">
				<Text fw={500} size="sm">
					Version
				</Text>
				<Badge variant="light">{version ?? "…"}</Badge>
			</Group>

			<Stack gap="xs">
				<Text size="sm">Feedback</Text>
				<Button
					variant="default"
					leftSection={<BugIcon />}
					onClick={() => void openUrl(FEEDBACK_URL)}>
					Send feedback
				</Button>
			</Stack>

			<Stack gap="xs">
				<Text fw={500} size="sm">
					Community
				</Text>
				<Group gap="sm">
					<Button
						variant="default"
						leftSection={<GithubLogoIcon />}
						onClick={() => void openUrl(GITHUB_URL)}>
						GitHub
					</Button>
					<Button
						variant="default"
						leftSection={<ChatCircleDotsIcon />}
						onClick={() => void openUrl(DISCORD_URL)}>
						Discord
					</Button>
				</Group>
			</Stack>
		</Stack>
	);
}

export default AboutTab;
