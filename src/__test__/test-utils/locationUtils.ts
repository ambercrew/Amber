import { screen } from "@testing-library/react";
import { LOCATION_DISPLAY_TEST_ID } from "./renderWithProviders";

export async function getCurrentLocation(): Promise<string> {
	return (await screen.findByTestId(LOCATION_DISPLAY_TEST_ID)).textContent;
}
