/**
 * @file
 * @source ./lib/builder-queue/index.js
 * @description Cola de promesas de build: cada app encola sus compilaciones con add() y
 * app.listen las espera con all(). Un initPromise opcional (constructor) se espera antes
 * que todo: cada job se encadena al init, así ningún build corre antes de la preparación.
 */

/**
 * @typedef {() => Promise<unknown>} Job
 */

/**
 * Cola global de promesas de build. La lista guarda PROMESAS, no funciones: add()
 * encadena cada job al initPromise del constructor (o a una ya resuelta), así los jobs
 * se ejecutan solo cuando el init completa — orden garantizado sin carreras.
 * all() drena la cola e incluye el init si no se consumió.
 */
const BuilderQueue = class
{
	/**@type {Array<Promise<unknown>>}*/
	#queue = [];

	/**@type {Promise<unknown>|null}*/
	#init;

	/**
	 * @param {Job|null} init
	 */
	constructor(init = null)
	{
		this.#init = init ? init() : Promise.resolve();
	}

	/**
	 * @returns {Promise<unknown>|null}
	 */
	get init()
	{
		return this.#init;
	}
	/**
	 * Ejecuta el job cuando el init resuelva y encola la promesa resultante.
	 * @param {Job} job
	 * @returns {void}
	 */
	add(job)
	{
		const init = this.#init ?? Promise.resolve();
		this.#queue.push(init.then(job));
	}

	/**
	 * Espera todas las promesas encoladas y el init (aunque la cola esté vacía),
	 * drena la cola y consume el init. El resultado del init va al final del array.
	 * Si el init ya se consumió en un all() anterior, no se incluye.
	 * @returns {Promise<unknown[]>}
	 */
	async all()
	{
		const jobs = this.#queue;
		this.#queue = [];

		const init = this.#init;
		this.#init = null;

		const jobsResults = Promise.all(jobs);

		if(init === null)
		{
			return jobsResults;
		}

		const [initResult, results] = await Promise.all([init, jobsResults]);

		return [...results, initResult];
	}
};

module.exports = BuilderQueue;
