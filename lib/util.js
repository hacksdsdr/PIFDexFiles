/**
 * Determine if two values are equal using Object.is while treating arrays as
 * tuples and objects are records.
 *
 * @param {any} a
 * @param {any} b
 * @return {boolean}
 */
export const deepEqual = (a, b) => {
	// NaN is NaN, -0 is not +0, etc
	if (Object.is(a, b)) return true;

	// vars must be of same type
	const typeA = typeof a;
	const typeB = typeof b;
	if (typeA !== typeB || "object" !== typeA) return false;

	if (Array.isArray(a)) {
		if (!Array.isArray(b)) return false;
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; ++i) {
			if (!Object.is(a[i], b[i])) return false;
		}

		return true;
	}

	if (typeA === "object") {
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);
		if (keysA.length !== keysB.length) return false;
		for (const key of keysA) {
			if (!deepEqual(a[key], b[key])) return false;
		}

		return true;
	}

	return false;
};

/**
 * Returns the unique values of arrays while treating arrays as tuples and
 * objects as records.
 *
 * @param {...T[]} arrays
 * @return {T[]}
 * @template T
 */
export const unique = (...arrays) => {
	/** @type {T[]} */
	const output = [];
	for (const array of arrays) {
		for (const value of array) {
			if (output.every((a) => !deepEqual(a, value))) output.push(value);
		}
	}

	return output;
};
