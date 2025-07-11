export function countTokens(blob: Blob): number {
	return Math.ceil(blob.size / 4);
}

export function countUserTokens(files: Blob[]) {
	return files.reduce((acc, file) => acc + countTokens(file), 0);
}

export function countUserTokensDirectories(files: Blob[][]) {
	return countUserTokens(files.flat());
}
