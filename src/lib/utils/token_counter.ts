export function countTokens(blob: Blob): number {
	return Math.ceil(blob.size / 4);
}

export function countUserTokens(userTokens: number, files: Blob[]) {
	const filesThatFit: Blob[] = [];
	const totalTokens = files.reduce((acc, file) => {
		const count = acc + countTokens(file);
		if (count <= userTokens) {
			filesThatFit.push(file);
		}
		return count;
	}, 0);
	return { totalTokens, filesThatFit };
}
