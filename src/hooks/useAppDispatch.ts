import { useDispatch } from "react-redux";
import { AppDispatch } from "../stores/store";

const useAppDispatch: () => AppDispatch = useDispatch;
export default useAppDispatch;
