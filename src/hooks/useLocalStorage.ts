import { useEffect, useState } from "react";

export default function useLocalStorage<T>(
	key: string,
	defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
	const [value, setValue] = useState<T>(() => {
		const storedValue = localStorage.getItem(key);
		return storedValue ? (JSON.parse(storedValue) as T) : defaultValue;
	});

	useEffect(() => {
		localStorage.setItem(key, JSON.stringify(value));
	}, [key, value]);

	return [value, setValue];
}
