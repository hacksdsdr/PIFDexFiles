export default class Context {
	#index = 0;
	#buffer = "";
	/** @param {string} buffer */
	constructor(buffer) {
		this.#buffer = buffer;
	}

	/**
	 * @param {RegExp} re
	 * @return {RegExpExecArray?}
	 */
	match(re) {
		re.lastIndex = this.#index;
		const result = re.exec(this.#buffer);
		if (result != null) this.#index = re.lastIndex;
		return result;
	}

	/** @return {boolean} */
	get end() {
		return this.#index >= this.#buffer.length;
	}
}
