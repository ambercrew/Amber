import { mdiPencilOutline } from "@mdi/js";
import Dialog from "../../../components/Dialog/Dialog";
import Form, {
	FormHeader,
	FormRows,
	FormButtons,
} from "../../../components/Form/Form";
import styles from "./styles.module.css";
import { useState } from "react";

interface Props {
	initialTitle: string;
	onHide: () => void;
	onSubmit: (e: React.SubmitEvent, newTitle: string) => void;
}

export default function RenameDialog({
	initialTitle,
	onHide,
	onSubmit,
}: Props) {
	const [newTitle, setNewTitle] = useState(initialTitle);

	return (
		<Dialog
			focusTrap={true}
			className={styles.renameDialog}
			onHide={onHide}>
			<Form onSubmit={e => onSubmit(e as React.SubmitEvent, newTitle)}>
				<FormHeader icon={mdiPencilOutline} title="Enter new name" />
				<FormRows
					rows={[
						{
							children: (
								<input
									type="text"
									id="new-name"
									value={newTitle}
									onChange={e => setNewTitle(e.target.value)}
									onFocus={e => e.target.select()}
									required
									autoFocus
								/>
							),
							labelHtmlFor: "new-name",
						},
					]}
				/>
				<FormButtons onClose={onHide} submitText="Rename" />
			</Form>
		</Dialog>
	);
}
