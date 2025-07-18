import { TypedUseSelectorHook, useSelector } from "react-redux";
import { RootState } from "../stores/store";

const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export default useAppSelector;
