function errorToString(e: unknown) {
	if (e instanceof Error) return e.message;
	return e as string;
}

export default errorToString;
