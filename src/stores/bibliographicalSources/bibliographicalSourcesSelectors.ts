import { RootState } from "../store";

export const selectBibliographicalSources = (state: RootState) =>
	state.bibliographicalSources.bibliographicalSources;
export const selectBibliographicalSourcesLoaded = (state: RootState) =>
	state.bibliographicalSources.loaded;
