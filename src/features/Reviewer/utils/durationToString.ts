function durationToString(startDate: Date, endDate: Date) {
	const durationInMinutes = Math.floor(
		(endDate.getTime() - startDate.getTime()) / (1000 * 60),
	);
	if (durationInMinutes < 60) {
		return durationInMinutes + "m";
	}
	const durationInHours = Math.floor(durationInMinutes / 60);
	if (durationInHours < 24) {
		return durationInHours + "h";
	}
	const durationInDays = Math.floor(durationInHours / 24);
	if (durationInDays < 30) {
		return durationInDays + "d";
	}
	const durationInMonths = Math.floor(durationInDays / 30);
	return durationInMonths === 1 ? "1 month" : durationInMonths + " months";
}

export default durationToString;
