export default interface FsrsProfile {
	id: string;
	name: string;
	requestRetention: number;
	maximumInterval: number;
	weights: number[];
}
