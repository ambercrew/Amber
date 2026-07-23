import { RootState } from "../store";

export const selectSources = (state: RootState) => state.sources.sources;
export const selectSourcesLoaded = (state: RootState) => state.sources.loaded;
