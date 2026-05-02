export default interface CreateProfileRequestDto {
	name: string;
	requestRetention: number;
	maximumInterval: number;
	weights: number[];
}
