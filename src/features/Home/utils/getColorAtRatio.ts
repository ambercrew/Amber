import RGB from "../../../types/ui/rgb";

export function getColorAtRatio(ratio: number, fromColor: RGB, toColor: RGB) {
	if (ratio === 0) return null;
	if (ratio > 1) ratio = 1;

	const r = Math.ceil(fromColor.r + (toColor.r - fromColor.r) * ratio);
	const g = Math.ceil(fromColor.g + (toColor.g - fromColor.g) * ratio);
	const b = Math.ceil(fromColor.b + (toColor.b - fromColor.r) * ratio);

	return `rgb(${r}, ${g}, ${b})`;
}
