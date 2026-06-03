import Dialog from "../../../components/Dialog/Dialog";
import { Icon } from "@mdi/react";
import {
	mdiFilePlusOutline,
	mdiCogOutline,
	mdiCreationOutline,
	mdiRefresh,
} from "@mdi/js";
import styles from "./styles.module.css";
import appIcon from "../../../../public/icon.svg";
import useLocalStorage from "../../../hooks/useLocalStorage";
import { openUrl } from "@tauri-apps/plugin-opener";

const INTRO_COMPLETED_KEY = "introCompleted";

const features = [
	{
		icon: mdiFilePlusOutline,
		title: "Create a file",
		description:
			"Give it a name and start writing your flashcards and notes in the editor.",
	},
	{
		icon: mdiCreationOutline,
		title: "Add flashcards",
		description:
			"Write them yourself or let AI generate them from your notes instantly.",
	},
	{
		icon: mdiRefresh,
		title: "Review every day",
		description:
			"Hit Study in any file or from Home — Brainy handles the scheduling automatically.",
	},
];

export default function IntroDialog() {
	const [showDialog, setShowDialog] = useLocalStorage(
		INTRO_COMPLETED_KEY,
		true,
	);

	if (!showDialog) return;

	return (
		<Dialog
			focusTrap={true}
			className={styles.dialog}
			fullScreenOnSmallDevices>
			<div className={styles.content}>
				<div className={styles.header}>
					<img
						src={appIcon}
						className={styles.appIcon}
						alt="Brainy"
					/>
					<h2 className={styles.title}>Welcome to Brainy Learn</h2>
				</div>

				<p className={styles.description}>
					Most study apps make you choose between good notes or good
					flashcards. Brainy does both — with AI and spaced repetition
					built in.
				</p>

				<div>
					<p className={styles.featureListTitle}>
						Get started in 3 steps
					</p>

					<ul className={styles.featureList}>
						{features.map(f => (
							<li key={f.title} className={styles.featureItem}>
								<div className={styles.featureIconBadge}>
									<Icon path={f.icon} size={1} />
								</div>
								<div>
									<p className={styles.featureTitle}>
										{f.title}
									</p>
									<p className={styles.featureDescription}>
										{f.description}
									</p>
								</div>
							</li>
						))}
					</ul>
				</div>

				<div className={styles.aiNote}>
					<Icon path={mdiCogOutline} size={2} />
					<div>
						<p>
							To use AI features, set up your AI provider in{" "}
							<strong>Settings → AI</strong>.
						</p>{" "}
						<a
							onClick={e => {
								e.preventDefault();
								void openUrl("https://help.brainylearn.app/");
							}}
							href="#">
							Read the docs →
						</a>
					</div>
				</div>

				<div className={styles.actions}>
					<button
						className={`primary ${styles.primaryButton}`}
						onClick={() => setShowDialog(false)}>
						Start using <strong>Brainy Learn</strong>
					</button>
				</div>
			</div>
		</Dialog>
	);
}
