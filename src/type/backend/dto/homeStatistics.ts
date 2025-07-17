export default interface HomeStatistics {
	numberOfReviews: number;
	totalTime: number;
	reviewCounts: Record<string, number>;
	dueCounts: Record<string, number>;
}
