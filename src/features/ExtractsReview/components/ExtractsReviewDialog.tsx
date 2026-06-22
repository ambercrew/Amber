import { useCallback, useEffect, useRef, useState } from "react";
import Dialog from "../../../components/Dialog/Dialog";
import styles from "./styles.module.css";
import {
	createClozeFromExtract,
	getPendingExtractsWithContent,
	updateExtractStatus,
} from "../../../api/incrementalReading/api/extractsApi";
import useApi from "../../../hooks/useApi";
import { Icon } from "@mdi/react";
import {
	mdiArrowRight,
	mdiClose,
	mdiCreation,
	mdiStopCircleOutline,
} from "@mdi/js";
import {
	stopAiGeneration,
	suggestClozeContent,
} from "../../../api/aiIntegration/api/aiApi";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectSettings } from "../../../stores/settings/settingsSelector";
import Spinner from "../../../components/Spinner/Spinner";
import Alert from "../../../components/Alert/Alert";
import { PendingExtractDto } from "../../../api/incrementalReading/dto/pendingExtractDto";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import ProgressBar from "../../../components/ProgressBar/ProgressBar";
import { ClozeFloatingMenuButtons } from "../../EditableCell/plugins/clozeFloatingMenuButtons";
import { ClozeNode } from "../../EditableCell/plugins/clozeNode";
import { ClozePlugin } from "../../EditableCell/plugins/clozePlugin";
import getCellIcon from "../../../utils/getCellIcon";

export interface CellToReview {
	id: string;
	title: string;
}

interface Props {
	cells: CellToReview[];
	onClose: () => void;
}

export default function ExtractsReviewDialog({ cells, onClose }: Props) {
	const [cellIndex, setCellIndex] = useState(0);
	const [extracts, setExtracts] = useState<PendingExtractDto[]>([]);
	const [extractIndex, setExtractIndex] = useState(0);
	const isAiEnabled = useAppSelector(selectSettings)?.enableAi ?? false;
	const { callApi, isSendingRequest: isLoading } = useApi();
	const {
		callApi: callSuggestApi,
		isSendingRequest: isGenerating,
		errorMessage: suggestionError,
		clearErrorMessage: clearSuggestionError,
	} = useApi();
	const editorContentRef = useRef<string>("");
	const [editorContent, setEditorContent] = useState("");
	const [editorKey, setEditorKey] = useState(0);

	const setEditorTo = useCallback((content: string) => {
		editorContentRef.current = content;
		setEditorContent(content);
		setEditorKey(k => k + 1);
	}, []);

	const loadExtracts = useCallback(
		async (idx: number) => {
			await stopAiGeneration();
			if (idx >= cells.length) {
				onClose();
				return;
			}
			await callApi(async () => {
				const pending = await getPendingExtractsWithContent(
					cells[idx].id,
				);
				if (pending.length === 0) {
					setCellIndex(idx + 1);
				} else {
					setEditorTo(pending[0].innerHtml);
					setExtracts(pending);
					setExtractIndex(0);
				}
			});
		},
		[cells, callApi, onClose, setEditorTo],
	);

	useEffect(() => {
		void loadExtracts(cellIndex);
	}, [cellIndex, loadExtracts]);

	const advance = () => {
		if (extractIndex + 1 < extracts.length) {
			setEditorTo(extracts[extractIndex + 1].innerHtml);
			setExtractIndex(i => i + 1);
		} else if (cellIndex + 1 < cells.length) {
			setCellIndex(i => i + 1);
		} else {
			onClose();
		}
	};

	const handleSuggest = async () => {
		clearSuggestionError();
		const suggestion = await callSuggestApi(() =>
			suggestClozeContent(editorContentRef.current),
		);
		if (suggestion != null) {
			setEditorTo(suggestion);
		}
	};

	const handleStop = () => void stopAiGeneration();

	const handleDismiss = async () => {
		await callApi(() =>
			updateExtractStatus(extracts[extractIndex].id, "Dismissed"),
		);
		advance();
	};

	const handleAdd = async () => {
		await callApi(() =>
			createClozeFromExtract(
				extracts[extractIndex].id,
				cells[cellIndex].id,
				editorContentRef.current,
			),
		);
		advance();
	};

	if (cells.length === 0 || extracts.length === 0) return;

	const currentCell = cells[cellIndex];
	const currentExtract = extracts[extractIndex];
	const progressPct = ((extractIndex + 1) / extracts.length) * 100;

	return (
		<Dialog
			focusTrap
			onHide={onClose}
			className={styles.dialog}
			fullScreenOnSmallDevices>
			<form
				onSubmit={e => {
					e.preventDefault();
					void handleAdd();
				}}
				className={styles.form}>
				<div className={styles.header}>
					<h2 className={styles.title}>Make cloze cards</h2>
					<button
						className={`transparent ${styles["close-button"]}`}
						type="button"
						onClick={onClose}
						aria-label="Close"
						title="Close">
						<Icon path={mdiClose} size={1} />
					</button>
				</div>

				<div className={styles.body}>
					<div className={styles.progressSection}>
						<div className={styles.progressInfo}>
							<span className={styles.progressLabel}>
								<Icon path={getCellIcon("Cloze")} size={1} />
								Cloze
							</span>
							<span className={styles.progressCount}>
								Highlight {extractIndex + 1} of{" "}
								{extracts.length}
							</span>
						</div>
						<ProgressBar value={progressPct} />
					</div>

					<div className={styles.card}>
						<div className={styles.cardMeta}>
							<p className={styles.title}>
								<Icon
									path={getCellIcon("IncrementalReading")}
									size={1}
									className={styles.icon}
								/>
								<span>{currentCell.title}</span>
							</p>
							<span className={styles.cardMetaCount}>
								Cell {cellIndex + 1} of {cells.length}
							</span>
						</div>
						{isLoading ? (
							<Spinner text="Loading..." />
						) : (
							<>
								<RichTextEditor
									key={editorKey}
									eagerLoadRichTextEditor
									content={editorContent}
									onChange={content => {
										editorContentRef.current = content;
									}}
									extraNodes={[ClozeNode]}
									additionalFloatingMenuButtons={
										ClozeFloatingMenuButtons
									}
									plugins={[<ClozePlugin key={1} />]}
									containerClassName={styles.editor}
								/>
								{isAiEnabled && (
									<div className={styles.suggestRow}>
										{isGenerating ? (
											<button
												className={`grey-button ${styles.suggestButton}`}
												type="button"
												onClick={handleStop}>
												<Icon
													path={mdiStopCircleOutline}
													size={1}
												/>
												Stop
											</button>
										) : (
											<button
												className={`grey-button ${styles.suggestButton}`}
												type="button"
												onClick={() =>
													void handleSuggest()
												}>
												<Icon
													path={mdiCreation}
													size={1}
												/>
												Suggest with AI
											</button>
										)}
									</div>
								)}
								{suggestionError && (
									<Alert
										type="error"
										onClose={clearSuggestionError}>
										{suggestionError}
									</Alert>
								)}
							</>
						)}
					</div>
				</div>

				<div className={styles.footer}>
					<button
						className="transparent"
						type="button"
						onClick={() => void handleDismiss()}
						disabled={isLoading || isGenerating || !currentExtract}>
						Dismiss
					</button>
					<button
						className="primary"
						type="submit"
						disabled={isLoading || isGenerating || !currentExtract}>
						Save &amp; next
						<Icon path={mdiArrowRight} size={1} />
					</button>
				</div>
			</form>
		</Dialog>
	);
}
