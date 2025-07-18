function secondsToLongString(seconds: number) {
	if (seconds < 60) {
		return seconds === 1 ? "1 second" : seconds + " seconds";
	}
	const durationInMinutes = seconds / 60;
	if (durationInMinutes < 60) {
		return (
			durationInMinutes.toFixed(1) +
			(durationInMinutes === 1 ? " minute" : " minutes")
		);
	}

	const durationInHours = Math.floor(durationInMinutes / 60);
	if (durationInHours < 24) {
		return (
			durationInHours.toFixed(1) +
			(durationInHours === 1 ? " hour" : " hours")
		);
	}

	const durationInDays = Math.floor(durationInHours / 24);
	if (durationInDays < 30) {
		return (
			durationInDays.toFixed(1) +
			(durationInDays === 1 ? " day" : " days")
		);
	}

	const durationInMonths = Math.floor(durationInDays / 30);
	return (
		durationInMonths.toFixed(1) +
		(durationInMonths === 1 ? "  month" : " months")
	);
}

export default secondsToLongString;
