export function countTokens(text: string): number {
	const encoder = new TextEncoder();
	const encoded = encoder.encode(text);
	return encoded.length / 4;
}

export function countUserTokens(userTokens: number, files: string[]) {
	let nrOfFilesThatFit = 0;
	const totalTokens = files.reduce((acc, file) => {
		const count = acc + countTokens(file);
		if (count <= userTokens) {
			nrOfFilesThatFit++;
		}
		return count;
	}, 0);
	return { totalTokens, nrOfFilesThatFit };
}
