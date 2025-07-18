import Settings from "../types/backend/model/settings";

function applySettings(settings: Settings) {
	if (
		settings.theme === "Dark" ||
		(settings.theme === "FollowSystem" &&
			window.matchMedia &&
			window.matchMedia("(prefers-color-scheme: dark)").matches)
	) {
		document.body.classList.add("dark");
	} else {
		document.body.classList.remove("dark");
	}

	document.documentElement.style.setProperty(
		"--zoom-level",
		(settings.zoomPercentage / 100).toString(),
	);
}

export default applySettings;
