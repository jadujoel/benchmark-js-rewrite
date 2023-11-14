import _ from 'lodash'
/*!
 * Benchmark.js <https://benchmarkjs.com/>
 * Copyright 2010-2016 Mathias Bynens <https://mths.be/>
 * Based on JSLitmus.js, copyright Robert Kieffer <http://broofa.com/>
 * Modified by John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <https://mths.be/mit>
 */

/** Used to assign each benchmark an incremented id. */
let counter = 0;

/** Used to detect primitive types. */
const rePrimitive = /^(?:boolean|number|string|undefined)$/;

/** Used to make every compiled test unique. */
const uidCounter = 0;

/** Used to avoid hz of Infinity. */
const divisors = {
  '1': 4096,
  '2': 512,
  '3': 64,
  '4': 8,
  '5': 0
};

/**
 * T-Distribution two-tailed critical values for 95% confidence.
 * For more info see http://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm.
 */
const tTable = {
  '1':  12.706, '2':  4.303, '3':  3.182, '4':  2.776, '5':  2.571, '6':  2.447,
  '7':  2.365,  '8':  2.306, '9':  2.262, '10': 2.228, '11': 2.201, '12': 2.179,
  '13': 2.16,   '14': 2.145, '15': 2.131, '16': 2.12,  '17': 2.11,  '18': 2.101,
  '19': 2.093,  '20': 2.086, '21': 2.08,  '22': 2.074, '23': 2.069, '24': 2.064,
  '25': 2.06,   '26': 2.056, '27': 2.052, '28': 2.048, '29': 2.045, '30': 2.042,
  'infinity': 1.96
};

/**
 * Critical Mann-Whitney U-values for 95% confidence.
 * For more info see http://www.saburchill.com/IBbiology/stats/003.html.
 */
const uTable = {
  '5':  [0, 1, 2],
  '6':  [1, 2, 3, 5],
  '7':  [1, 3, 5, 6, 8],
  '8':  [2, 4, 6, 8, 10, 13],
  '9':  [2, 4, 7, 10, 12, 15, 17],
  '10': [3, 5, 8, 11, 14, 17, 20, 23],
  '11': [3, 6, 9, 13, 16, 19, 23, 26, 30],
  '12': [4, 7, 11, 14, 18, 22, 26, 29, 33, 37],
  '13': [4, 8, 12, 16, 20, 24, 28, 33, 37, 41, 45],
  '14': [5, 9, 13, 17, 22, 26, 31, 36, 40, 45, 50, 55],
  '15': [5, 10, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59, 64],
  '16': [6, 11, 15, 21, 26, 31, 37, 42, 47, 53, 59, 64, 70, 75],
  '17': [6, 11, 17, 22, 28, 34, 39, 45, 51, 57, 63, 67, 75, 81, 87],
  '18': [7, 12, 18, 24, 30, 36, 42, 48, 55, 61, 67, 74, 80, 86, 93, 99],
  '19': [7, 13, 19, 25, 32, 38, 45, 52, 58, 65, 72, 78, 85, 92, 99, 106, 113],
  '20': [8, 14, 20, 27, 34, 41, 48, 55, 62, 69, 76, 83, 90, 98, 105, 112, 119, 127],
  '21': [8, 15, 22, 29, 36, 43, 50, 58, 65, 73, 80, 88, 96, 103, 111, 119, 126, 134, 142],
  '22': [9, 16, 23, 30, 38, 45, 53, 61, 69, 77, 85, 93, 101, 109, 117, 125, 133, 141, 150, 158],
  '23': [9, 17, 24, 32, 40, 48, 56, 64, 73, 81, 89, 98, 106, 115, 123, 132, 140, 149, 157, 166, 175],
  '24': [10, 17, 25, 33, 42, 50, 59, 67, 76, 85, 94, 102, 111, 120, 129, 138, 147, 156, 165, 174, 183, 192],
  '25': [10, 18, 27, 35, 44, 53, 62, 71, 80, 89, 98, 107, 117, 126, 135, 145, 154, 163, 173, 182, 192, 201, 211],
  '26': [11, 19, 28, 37, 46, 55, 64, 74, 83, 93, 102, 112, 122, 132, 141, 151, 161, 171, 181, 191, 200, 210, 220, 230],
  '27': [11, 20, 29, 38, 48, 57, 67, 77, 87, 97, 107, 118, 125, 138, 147, 158, 168, 178, 188, 199, 209, 219, 230, 240, 250],
  '28': [12, 21, 30, 40, 50, 60, 70, 80, 90, 101, 111, 122, 132, 143, 154, 164, 175, 186, 196, 207, 218, 228, 239, 250, 261, 272],
  '29': [13, 22, 32, 42, 52, 62, 73, 83, 94, 105, 116, 127, 138, 149, 160, 171, 182, 193, 204, 215, 226, 238, 249, 260, 271, 282, 294],
  '30': [13, 23, 33, 43, 54, 65, 76, 87, 98, 109, 120, 131, 143, 154, 166, 177, 189, 200, 212, 223, 235, 247, 258, 270, 282, 293, 305, 317]
};


/**
 * A specialized version of `_.cloneDeep` which only clones arrays and plain
 * objects assigning all other values by reference.
 * @private
 * @param {*} value The value to clone.
 * @returns {*} The cloned value.
 */
const cloneDeep = _.partial(_.cloneDeepWith, _, (value: unknown) => {
  // Only clone primitives, arrays, and plain objects.
  if (!Array.isArray(value) && !_.isPlainObject(value)) {
    return value;
  }
});

/**
 * Creates a function from the given arguments string and body.
 * @param {string} args The comma separated function arguments.
 * @param {string} body The function body.
 * @returns {Function} The new function.
 */
function createFunction(): Function {
  // Lazy define.
  let createFunction = function(args: string, body: string): Function {
    const anchor = Benchmark
    const prop = uid + 'createFunction'
    runScript('Benchmark.' + prop + '=function(' + args + '){' + body + '}');
    const result = anchor[prop];
    delete anchor[prop];
    return result;
  };
  createFunction = createFunction('', 'return"' + uid + '"')() === uid
    ? createFunction
    : Function
  return createFunction.apply(null, arguments);
}

/**
 * Delay the execution of a function based on the benchmark's `delay` property.
 * @param {Object} fn The function to execute.
 */
function delay(bench: Benchmark, fn: (...args: any[]) => any): void {
  bench._timerId = _.delay(fn, bench.delay * 1e3);
}

function destroyElement(element: HTMLElement): void {
  trash.appendChild(element);
  trash.innerHTML = '';
}

/**
 * Gets the name of the first argument from a function's source.
 * @param {Function} fn The function.
 * @returns {string} The argument name.
 */
function getFirstArgument(fn: Function): string {
  return (!_.has(fn, 'toString') &&
    (/^[\s(]*function[^(]*\(([^\s,)]+)/.exec(fn) || 0)[1]) || '';
}

/**
 * Computes the arithmetic mean of a sample.
 * @param {Array} sample The sample.
 * @returns {number} The mean.
 */
function getMean(sample: number[]): number {
  return sample.reduce((sum: number, x: number) => sum + x) / sample.length
}

const arrayRef = []
/** Native method shortcuts. */
const push = arrayRef.push
const shift = arrayRef.shift
const slice = arrayRef.slice
const unshift = arrayRef.unshift

/** Used to integrity check compiled tests. */
const uid = 'uid' + Date.now();

/** Used to avoid infinite recursion when methods call each other. */
const calledBy: Record<string, boolean> = {};

export type BenchmarkEventListener = (event: BenchmarkEvent) => void


export class BenchmarkEvent {
  /** A flag to indicate if the emitters listener iteration is aborted. */
  aborted = false
  /** A flag to indicate if the default action is cancelled. */
  cancelled = false
  /** * The object whose listeners are currently being processed. */
  currentTarget?: Object
  /** * The return value of the last executed listener. */
  result?: unknown
  /** The object to which the event was originally emitted. */
  target?: Object
  /** * A timestamp of when the event was created (ms). */
  timeStamp = 0
  constructor(public type: string = '') {
  }
}

export class BenchmarkEventTarget {
  listeners = new Map<string, BenchmarkEventListener[]>()
  emit(type: string | BenchmarkEvent, ...args: readonly unknown[]): unknown {
    const event = type instanceof BenchmarkEvent
      ? type
      : new BenchmarkEvent(type)
    event.currentTarget = event.currentTarget ?? this
    event.target = event.target ?? this
    delete event.result
    const listeners = this.listeners.get(event.type)
    if (listeners === undefined) {
      return
    }
    for (const listener of listeners) {
      event.result = listener.apply(this, ...args)
      if (event.result === false) {
        event.cancelled = true
      }
    }
    return event.result
  }
  /**
   * Unregisters a listener for the specified event type(s),
   * or unregisters all listeners for the specified event type(s),
   * or unregisters all listeners for all event types.
   *
   * @memberOf Benchmark, Benchmark.Suite
   * @param {string} [type] The event type.
   * @param {Function} [listener] The function to unregister.
   * @returns {Object} The current instance.
   * @example
   *
   * // unregister a listener for an event type
   * bench.off('cycle', listener);
   *
   * // unregister a listener for multiple event types
   * bench.off('start cycle', listener);
   *
   * // unregister all listeners for an event type
   * bench.off('cycle');
   *
   * // unregister all listeners for multiple event types
   * bench.off('start cycle complete');
   *
   * // unregister all listeners for all event types
   * bench.off();
   */
  off(type?: string, listener?: BenchmarkEventListener): this {
    if (type === undefined) {
      this.listeners = new Map()
      return this
    }
    if (listener === undefined) {
      this.listeners.set(type, [])
      return this
    }
    const listeners = this.listeners.get(type)
    if (listeners === undefined) {
      return this
    }
    const index = listeners.indexOf(listener)
    if (index === -1) {
      return this
    }
    listeners.splice(index, 1)
    return this
  }
  on(type: string, listener: BenchmarkEventListener): this {
    const listeners = this.listeners.get(type)
    if (listeners === undefined) {
      this.listeners.set(type, [listener])
      return this
    }
    listeners.push(listener)
    return this
  }
}

/**
 * The Benchmark constructor.
 *
 * Note: The Benchmark constructor exposes a handful of lodash methods to
 * make working with arrays, collections, and objects easier. The lodash
 * methods are:
 * [`each/forEach`](https://lodash.com/docs#forEach), [`forOwn`](https://lodash.com/docs#forOwn),
 * [`has`](https://lodash.com/docs#has), [`indexOf`](https://lodash.com/docs#indexOf),
 * [`map`](https://lodash.com/docs#map), and [`reduce`](https://lodash.com/docs#reduce)
 *
 * @constructor
 * @param {string} name A name to identify the benchmark.
 * @param {Function|string} fn The test to benchmark.
 * @param {Object} [options={}] Options object.
 * @example
 *
 * // basic usage (the `new` operator is optional)
 * const bench = new Benchmark(fn);
 *
 * // or using a name first
 * const bench = new Benchmark('foo', fn);
 *
 * // or with options
 * const bench = new Benchmark('foo', fn, {
 *
 *   // displayed by `Benchmark#toString` if `name` is not available
 *   'id': 'xyz',
 *
 *   // called when the benchmark starts running
 *   'onStart': onStart,
 *
 *   // called after each run cycle
 *   'onCycle': onCycle,
 *
 *   // called when aborted
 *   'onAbort': onAbort,
 *
 *   // called when a test errors
 *   'onError': onError,
 *
 *   // called when reset
 *   'onReset': onReset,
 *
 *   // called when the benchmark completes running
 *   'onComplete': onComplete,
 *
 *   // compiled/called before the test loop
 *   'setup': setup,
 *
 *   // compiled/called after the test loop
 *   'teardown': teardown
 * });
 *
 * // or name and options
 * const bench = new Benchmark('foo', {
 *
 *   // a flag to indicate the benchmark is deferred
 *   'defer': true,
 *
 *   // benchmark test function
 *   'fn': function(deferred) {
 *     // call `Deferred#resolve` when the deferred test is finished
 *     deferred.resolve();
 *   }
 * });
 *
 * // or options only
 * const bench = new Benchmark({
 *
 *   // benchmark name
 *   'name': 'foo',
 *
 *   // benchmark test as a string
 *   'fn': '[1,2,3,4].sort()'
 * });
 *
 * // a test's `this` binding is set to the benchmark instance
 * const bench = new Benchmark('foo', function() {
 *   'My name is '.concat(this.name); // "My name is foo"
 * });
 */
export interface BenchmarkOptions {
    /** A flag to indicate that benchmark cycles will execute asynchronously by default. */
    async?: boolean,
    /** A flag to indicate that the benchmark clock is deferred. */
    defer?: boolean,
    /** The delay between test cycles (secs). */
    delay?: number,
    /** Displayed by `Benchmark#toString` when a `name` is not available (auto-generated if absent). */
    id?: number,
    /** The default number of times to execute a test on a benchmark's first cycle. */
    initCount?: number,
    /** The maximum time a benchmark is allowed to run before finishing (secs). */
    maxTime?: number,
    /** The minimum sample size required to perform statistical analysis. */
    minSamples?: number,
    /** The time needed to reduce the percent uncertainty of measurement to 1% (secs). */
    minTime?: number,
    /** The name of the benchmark. */
    name?: string,
    /** An event listener called when the benchmark is aborted. */
    onAbort?: BenchmarkEventListener,
    /** An event listener called when the benchmark completes running. */
    onComplete?: BenchmarkEventListener,
    /** An event listener called after each run cycle. */
    onCycle?: BenchmarkEventListener,
    /** An event listener called when a test errors. */
    onError?: BenchmarkEventListener,
    /** An event listener called when the benchmark is reset. */
    onReset?: BenchmarkEventListener,
    /** An event listener called when the benchmark starts running. */
    onStart?: BenchmarkEventListener
}
export interface BenchmarkStats {
  /** The margin of error. */
  moe: number
  /** The relative margin of error (expressed as a percentage of the mean). */
  rme: number
  /** The standard error of the mean. */
  sem: number
  /** The sample standard deviation. */
  deviation: number
  /** The sample arithmetic mean (secs). */
  mean: number
  /** The array of sampled periods. */
  sample: number[]
  /** The sample constiance. */
  constiance: number
}
export interface BenchmarkTimes {
  /** The time taken to complete the last cycle (secs). */
  cycle: number
  /** * The time taken to complete the benchmark (secs). */
  elapsed: number
  /** * The time taken to execute the test once (secs). */
  period: number
  /** A timestamp of when the benchmark started (ms). */
  timeStamp: number
}

export const defaultOptions = {
  async: false,
  defer: false,
  delay: 0.005,
  initCount: 1,
  maxTime: 5,
  minSamples: 5,
  minTime: 0,
} as const satisfies BenchmarkOptions

export class Benchmark extends BenchmarkEventTarget {
  id: number
  stats: BenchmarkStats = {
    moe: 0,
    rme: 0,
    sem: 0,
    deviation: 0,
    mean: 0,
    sample: [],
    constiance: 0
  }
  times: BenchmarkTimes = {
    cycle: 0,
    elapsed: 0,
    period: 0,
    timeStamp: 0
  }
  initCount = 0
  delay = 0
  _timerId?: number
  name: string
  constructor(options: BenchmarkOptions) {
    super()
    this.name = options.name || ''
    setOptions(this, options);
    this.id = ++counter
    this.stats = cloneDeep(this.stats)
    this.times = cloneDeep(this.times)
  }
  /**
   * Creates a new benchmark using the same test and options.
   * @example
   * const bizarro = bench.clone({
   *   'name': 'doppelganger'
   * });
   */
  clone(options: BenchmarkOptions): Benchmark {
    const result = new Benchmark(Object.assign({}, this, options));
    // Correct the `options` object.
    result.options = _.assign({}, cloneDeep(this.options), cloneDeep(options));
    // Copy own custom properties.
    _.forOwn(this, (value, key)  => {
      if (!_.has(result, key)) {
        result[key] = cloneDeep(value);
      }
    })
    return result
  }
  /** Reset properties and abort if running. */
  reset(): this {
   if (this.running && !calledBy.abort) {
     // No worries, `reset()` is called within `abort()`.
     calledBy.reset = true;
     this.abort();
     delete calledBy.reset;
     return this
   }
   const index = 0
   const changes = []
   const queue = []

   // A non-recursive solution to check if properties have changed.
   // For more information see http://www.jslab.dk/articles/non.recursive.preorder.traversal.part4.
   let data = {
     destination: this,
     source: Object.assign(
      {},
      cloneDeep(this.constructor.prototype),
       cloneDeep(this.options)
      )
   }
   do {
     _.forOwn(data.source, (value, key) => {
       let changed = false
       const destination = data.destination
       let currValue = destination[key]

       // Skip pseudo private properties and event listeners.
       if (/^_|^events$|^on[A-Z]/.test(key)) {
         return;
       }
       if (typeof value === 'object' && value !== null) {
         if (Array.isArray(value)) {
            // Check if an array value has changed to a non-array value.
            if (!Array.isArray(currValue)) {
              changed = true;
              currValue = [];
            }
            // Check if an array has changed its length.
            if (currValue.length !== value.length) {
              changed = true;
              currValue = currValue.slice(0, value.length);
              currValue.length = value.length;
            }
        }
        // Check if an object has changed to a non-object value.
        else if (!(typeof currValue === 'object' && value !== null)) {
          changed = true;
          currValue = {};
        }
        // Register a changed object.
        if (changed) {
          changes.push({ 'destination': destination, 'key': key, 'value': currValue });
        }
          queue.push({ 'destination': currValue, 'source': value });
        }
        // Register a changed primitive.
        else if (!_.eq(currValue, value) && value !== undefined) {
          changes.push({ 'destination': destination, 'key': key, 'value': value });
        }
      });
    }
    while ((data = queue[index++]));

    // If changed emit the `reset` event and if it isn't cancelled reset the benchmark.
    if (changes.length &&
        (this.emit(event = Event('reset')), !event.cancelled)) {
      _.each(changes, function(data) {
        data.destination[data.key] = data.value;
      });
    }
    return this;
  }
  /** * Aborts the benchmark without recording times. */
  abort(): this {
    const resetting = calledBy.reset;
    if (!this.running) {
      return this
    }
    const event = Event('abort');
    this.emit(event);
    if (event.cancelled || resetting) {
      return this
    }
    // Avoid infinite recursion.
    calledBy.abort = true;
    this.reset();
    delete calledBy.abort;
    if (this._timerId !== undefined) {
      clearTimeout(this._timerId);
      delete this._timerId
    }
    if (!resetting) {
      this.aborted = true;
      this.running = false;
    }
    return this
  }
  /**
   * Determines if a benchmark is faster than another.
   * @returns {number} Returns `-1` if slower, `1` if faster, and `0` if indeterminate.
   */
  compare(other: Benchmark): 0 | 1 | -1 {
    // Exit early if comparing the same benchmark.
    if (this === other) {
      return 0;
    }
    const sample1 = this.stats.sample
    const sample2 = other.stats.sample
    const size1 = sample1.length
    const size2 = sample2.length
    const maxSize = Math.max(size1, size2)
    const minSize = Math.min(size1, size2)
    const u1 = getU(sample1, sample2)
    const u2 = getU(sample2, sample1)
    const u = Math.min(u1, u2)

    function getScore(xA: number, sampleB: number[]): number {
      return sampleB.reduce((total: number, xB: number): number => (
        total + (xB > xA ? 0 : xB < xA ? 1 : 0.5)
      ), 0)
    }

    function getU(sampleA: number[], sampleB: number[]): number {
      return sampleA.reduce(
        (total, xA) => total + getScore(xA, sampleB),
        0
      )
    }

    function getZ(u: number): number {
      return (u - ((size1 * size2) / 2)) / Math.sqrt((size1 * size2 * (size1 + size2 + 1)) / 12);
    }
    // Reject the null hypothesis the two samples come from the
    // same population (i.e. have the same median) if...
    if (size1 + size2 > 30) {
      // ...the z-stat is greater than 1.96 or less than -1.96
      // http://www.statisticslectures.com/topics/mannwhitneyu/
      const zStat = getZ(u);
      return Math.abs(zStat) > 1.96 ? (u == u1 ? 1 : -1) : 0;
    }
    // ...the U value is less than or equal the critical U value.
    const critical: number = (maxSize < 5) || (minSize < 3)
      ? 0
      : uTable[maxSize][minSize - 3]

    return u <= critical
      ? (u === u1 ? 1 : -1)
      : 0
  }
  /**
   * Runs the benchmark.
   * @example
   *
   * // basic usage
   * bench.run();
   *
   * // or with options
   * bench.run({ 'async': true });
   */
  run(options: BenchmarkOptions): this {
    const event = Event('start');
    // Set `running` to `false` so `reset()` won't call `abort()`.
    this.running = false;
    this.reset();
    this.running = true;
    this.count = this.initCount;
    this.times.timeStamp = _.now();
    this.emit(event);

    if (!event.cancelled) {
      options = { 'async': ((options = options && options.async) == null ? this.async : options) };
      // For clones created within `compute()`.
      if (this._original) {
        if (this.defer) {
          Deferred(this);
        } else {
          cycle(this, options);
        }
      }
      // For original tbenchmarks.
      else {
        compute(this, options);
      }
    }
    return this;
  }

  /** Displays relevant benchmark information when coerced to a string. */
  toString(): string {
    let error = this.error
    let hz = this.hz
    let id = this.id
    let stats = this.stats
    let size = stats.sample.length
    let pm = '\xb1'
    let result = this.name || (Number.isNaN(id) ? String(id) : '<Test #' + id + '>')
    if (error !== undefined) {
      let errorStr: string
      if (!_.isObject(error)) {
        errorStr = String(error);
      } else if (!_.isError(Error)) {
        errorStr = join(error);
      } else {
        // Error#name and Error#message properties are non-enumerable.
        errorStr = join(_.assign({ 'name': error.name, 'message': error.message }, error));
      }
      result += ': ' + errorStr;
    }
    else {
      result += ' x ' + formatNumber(hz.toFixed(hz < 100 ? 2 : 0)) + ' ops/sec ' + pm +
        stats.rme.toFixed(2) + '% (' + size + ' run' + (size == 1 ? '' : 's') + ' sampled)';
    }
    return result;
  }
  /** * The number of times a test was executed. */
  count = 0
  /** * The number of cycles performed while benchmarking. */
  cycles = 0
  /** * The number of executions per second. */
  hz = 0
  /** * The compiled test function. */
  compiled?: Function | string
  /** * The error object if the test failed. */
  error?: Error
  /** * A flag to indicate if the benchmark is aborted. */
  aborted = false
  /** * A flag to indicate if the benchmark is running. */
  running = false
  setup: () => {}
  /** * Compiled into the test and executed immediately **after** the test loop. */
  teardown: () => {}
  /** * The default options copied by benchmark instances. */
  options = defaultOptions
  /**
   * Platform object with properties describing things like browser name,
   * version, and operating system. See [`platform.js`](https://mths.be/platform).
   */
  platform = {
    description: navigator.userAgent,
    layout: null,
    product: null,
    name: null,
    manufacturer: null,
    os: null,
    prerelease: null,
    version: null,
    toString: () => navigator.userAgent
  }
  filter = filter
  formatNumber = formatNumber
  invoke = invoke
  join = join
  version: '2.1.4'
}

/**
 * The Deferred constructor.
 * @param {Object} clone The cloned benchmark instance.
 */
class Deferred {
  constructor (public benchmark: Benchmark) {
    clock(deferred)
  }
  /** The number of deferred cycles performed while benchmarking. */
  cycles = 0
  /** The time taken to complete the deferred benchmark (secs). */
  elapsed = 0
  /** A timestamp of when the deferred benchmark started (ms). */
  timeStamp = 0
  resolve = resolve
}

/**
 * The Event constructor.
 * @memberOf Benchmark
 * @param {Object|string} type The event type.
 */
function Event(type: string | BenchmarkEvent) {
  const event = this;
  if (type instanceof Event) {
    return type;
  }
  return (event instanceof Event)
    ? _.assign(event, { 'timeStamp': _.now() }, typeof type == 'string' ? { 'type': type } : type)
    : new Event(type);
}

export interface SuiteOptions {
  name: string
}

/**
 * The Suite constructor.
 *
 * Note: Each Suite instance has a handful of wrapped lodash methods to
 * make working with Suites easier. The wrapped lodash methods are:
 * [`each/forEach`](https://lodash.com/docs#forEach), [`indexOf`](https://lodash.com/docs#indexOf),
 * [`map`](https://lodash.com/docs#map), and [`reduce`](https://lodash.com/docs#reduce)
 *
 * @constructor
 * @param {string} name A name to identify the suite.
 * @param {Object} [options={}] Options object.
 * @example
 *
 * // basic usage (the `new` operator is optional)
 * const suite = new Benchmark.Suite;
 *
 * // or using a name first
 * const suite = new Benchmark.Suite('foo');
 *
 * // or with options
 * const suite = new Benchmark.Suite('foo', {
 *
 *   // called when the suite starts running
 *   'onStart': onStart,
 *
 *   // called between running benchmarks
 *   'onCycle': onCycle,
 *
 *   // called when aborted
 *   'onAbort': onAbort,
 *
 *   // called when a test errors
 *   'onError': onError,
 *
 *   // called when reset
 *   'onReset': onReset,
 *
 *   // called when the suite completes running
 *   'onComplete': onComplete
 * });
 */
class Suite extends BenchmarkEventTarget {
  /** The number of benchmarks in the suite. */
  length = 0
  /** A flag to indicate if the suite is aborted. */
  aborted = false
  /** * A flag to indicate if the suite is running. */
  running = false
  /** * The default options copied by suite instances. */
  constructor (public options: SuiteOptions) {
    super()
    setOptions(this, options);
  }
  join = arrayRef.join
  pop = arrayRef.pop
  push = push
  reverse = arrayRef.reverse
  shift = shift
  slice = slice
  sort = arrayRef.sort
  splice = arrayRef.splice
  unshift = unshift
  /** Aborts all benchmarks in the suite. */
  abort(): this {
    const resetting = calledBy.resetSuite;
    if (!this.running) {
      return this
    }
    const event = Event('abort')
    this.emit(event);
    if (!event.cancelled || resetting) {
      // Avoid infinite recursion.
      calledBy.abortSuite = true;
      this.reset();
      delete calledBy.abortSuite;

      if (!resetting) {
        this.aborted = true;
        invoke(this, 'abort')
      }
    }
    return this
  }
  /**
   * Adds a test to the benchmark suite.
   *
   * @memberOf Benchmark.Suite
   * @param {string} name A name to identify the benchmark.
   * @param {Function|string} fn The test to benchmark.
   * @param {Object} [options={}] Options object.
   * @returns {Object} The suite instance.
   * @example
   *
   * // basic usage
   * suite.add(fn);
   *
   * // or using a name first
   * suite.add('foo', fn);
   *
   * // or with options
   * suite.add('foo', fn, {
   *   'onCycle': onCycle,
   *   'onComplete': onComplete
   * });
   *
   * // or name and options
   * suite.add('foo', {
   *   'fn': fn,
   *   'onCycle': onCycle,
   *   'onComplete': onComplete
   * });
   *
   * // or options only
   * suite.add({
   *   'name': 'foo',
   *   'fn': fn,
   *   'onCycle': onCycle,
   *   'onComplete': onComplete
   * });
   */
  add(options: BenchmarkOptions): this {
    const bench = new Benchmark(options)
    const event = new BenchmarkEvent('add')
    event.target = bench
    if (this.emit(event) && !event.cancelled) {
      this.push(bench)
    }
    return this
  }

  /**
   * Creates a new suite with cloned benchmarks.
   *
   * @name clone
   * @memberOf Benchmark.Suite
   * @param {Object} options Options object to overwrite cloned options.
   * @returns {Object} The new suite instance.
   */
  clone(options) {
    const suite = this,
        result = new suite.constructor(_.assign({}, suite.options, options));

    // Copy own properties.
    _.forOwn(suite, function(value, key) {
      if (!_.has(result, key)) {
        result[key] = _.isFunction(_.get(value, 'clone'))
          ? value.clone()
          : cloneDeep(value);
      }
    });
    return result;
  }
  /**
   * An `Array#filter` like method.
   *
   * @name filter
   * @memberOf Benchmark.Suite
   * @param {Function|string} callback The function/alias called per iteration.
   * @returns {Object} A new suite of benchmarks that passed callback filter.
   */
  filter(callback: Function | string): Suite {
    const result = new Suite(this.options)
    result.push.apply(result, filter(this, callback));
    return result;
  }

  /**
   * Resets all benchmarks in the suite.
   */
  reset(): this {
    const aborting = calledBy.abortSuite;
    if (this.running && !aborting) {
      // No worries, `resetSuite()` is called within `abortSuite()`.
      calledBy.resetSuite = true;
      this.abort();
      delete calledBy.resetSuite;
    }
    // Reset if the state has changed.
    else if ((this.aborted || suite.running) &&
        (this.emit(event = Event('reset')), !event.cancelled)) {
      suite.aborted = suite.running = false;
      if (!aborting) {
        invoke(suite, 'reset');
      }
    }
    return suite;
  }

  /**
   * Runs the suite.
   *
   * @name run
   * @memberOf Benchmark.Suite
   * @param {Object} [options={}] Options object.
   * @returns {Object} The suite instance.
   * @example
   *
   * // basic usage
   * suite.run();
   *
   * // or with options
   * suite.run({ 'async': true, 'queued': true });
   */
  run(options: BenchmarkOptions): this {
    this.reset();
    this.running = true;
    options || (options = {});
    invoke(this, {
      name: 'run',
      args: options,
      queued: options.queued,
      onStart: (event) => {
        this.emit(event);
      },
      onCycle: (event): void => {
        const bench = event.target;
        if (bench.error) {
          this.emit({ 'type': 'error', 'target': bench });
        }
        this.emit(event);
        event.aborted = this.aborted;
      },
      onComplete: (event) => {
        this.running = false;
        this.emit(event);
      }
    });
    return this;
  }
}

/**
 * Gets the source code of a function.
 * @param {Function} fn The function.
 * @returns {string} The function's source code.
 */
function getSource(fn: Function): string {
  let result = '';
  if (isStringable(fn)) {
    result = String(fn);
  } else {
    // Escape the `{` for Firefox 1.
    result = _.result(/^[^{]+\{([\s\S]*)\}\s*$/.exec(fn), 1);
  }
  // Trim string.
  result = result.replace(/^\s+|\s+$/g, '');
  // Detect strings containing only the "use strict" directive.
  return /^(?:\/\*+[\w\W]*?\*\/|\/\/.*?[\n\r\u2028\u2029]|\s)*(["'])use strict\1;?$/.test(result)
    ? ''
    : result;
}

function isStringable<T>(value: T): value is T & { toString: () => string } {
  return typeof value === 'string' ||
    Object.prototype.hasOwnProperty.call(value, 'toString')
}

/**
 * Runs a snippet of JavaScript via script injection.
 *
 * @private
 * @param {string} code The code to run.
 */
function runScript(code: string): void {
  const script = window.document.createElement('script')
  let sibling: HTMLScriptElement | null = window.document.getElementsByTagName('script')[0]
  let parent: Node | null = sibling.parentNode
  const prop = uid + 'runScript'
  const prefix = '(' + 'Benchmark.' + prop + '||function(){})();'

  try {
    // Remove the inserted script *before* running the code to avoid differences
    // in the expected script element count/order of the document.
    script.appendChild(window.document.createTextNode(prefix + code));
    Benchmark[prop] = function() {
      destroyElement(script);
    };
  } catch(e) {
    if (parent !== null) {
      parent = parent.cloneNode(false);
    }
    sibling = null;
    script.text = code;
  }
  parent?.insertBefore(script, sibling);
  delete Benchmark[prop];
}

/**
 * A helper function for setting options/event handlers.
 *
 * @private
 * @param {Object} object The benchmark or suite instance.
 * @param {Object} [options={}] Options object.
 */
function setOptions(object: Benchmark | Suite, options: BenchmarkOptions) {
  options = object.options = Object.assign({}, cloneDeep(object.constructor.options), cloneDeep(options));

  _.forOwn(options, function(value, key) {
    if (value != null) {
      // Add event listeners.
      if (/^on[A-Z]/.test(key)) {
        _.each(key.split(' '), (key) => {
          object.on(key.slice(2).toLowerCase(), value);
        })
      } else if (!_.has(object, key)) {
        object[key] = cloneDeep(value)
      }
    }
  });
}

/**
 * Handles cycling/completing the deferred benchmark.
 * @memberOf Benchmark.Deferred
 */
function resolve() {
  const deferred = this
  const clone = deferred.benchmark
  const bench = clone._original

  if (bench.aborted) {
    // cycle() -> clone cycle/complete event -> compute()'s invoked bench.run() cycle/complete.
    deferred.teardown();
    clone.running = false;
    cycle(deferred);
  }
  else if (++deferred.cycles < clone.count) {
    clone.compiled.call(deferred, context, timer);
  }
  else {
    timer.stop(deferred);
    deferred.teardown();
    delay(clone, function() { cycle(deferred); });
  }
}

export type FilterCallbackName = 'fastest' | 'slowest' | 'successful'

/**
 * A generic `Array#filter` like method.
 *
 * @static
 * @memberOf Benchmark
 * @param {Array} array The array to iterate over.
 * @param {Function|string} callback The function/alias called per iteration.
 * @returns {Array} A new array of values that passed callback filter.
 * @example
 *
 * // get odd numbers
 * Benchmark.filter([1, 2, 3, 4, 5], function(n) {
 *   return n % 2;
 * }); // -> [1, 3, 5];
 *
 * // get fastest benchmarks
 * Benchmark.filter(benches, 'fastest');
 *
 * // get slowest benchmarks
 * Benchmark.filter(benches, 'slowest');
 *
 * // get benchmarks that completed without erroring
 * Benchmark.filter(benches, 'successful');
 */
export function filter(array: Benchmark[], callback: FilterCallbackName): Benchmark[] {
  if (callback === 'successful') {
    // Callback to exclude those that are errored, unrun, or have hz of Infinity.
    return array.filter(bench =>
      bench.cycles > 0
      && Number.isFinite(bench.hz)
      && bench.error === undefined
    )
  }
  else if (callback === 'fastest' || callback === 'slowest') {
    // Get successful, sort by period + margin of error, and filter fastest/slowest.
    const result = filter(array, 'successful').sort((a: Benchmark, b: Benchmark) => (
        a.stats.mean + a.stats.moe > b.stats.mean + b.stats.moe
          ? 1
          : -1
      ) * (
        callback === 'fastest'
          ? 1
          : -1
      )
    )
    return result.filter(bench => result[0].compare(bench) === 0)
  }
  return array.filter(callback);
}

/**
 * Converts a number to a more readable comma-separated string representation.
 */
export function formatNumber(number: number | string): string {
  return String(number).split('.')[0].replace(/(?=(?:\d{3})+$)(?!\b)/g, ',') +
    (number[1] ? '.' + number[1] : '');
}

/**
 * Invokes a method on all items in an array.
 *
 * @static
 * @memberOf Benchmark
 * @param {Array} benches Array of benchmarks to iterate over.
 * @param {Object|string} name The name of the method to invoke OR options object.
 * @param {...*} [args] Arguments to invoke the method with.
 * @returns {Array} A new array of values returned from each method invoked.
 * @example
 *
 * // invoke `reset` on all benchmarks
 * Benchmark.invoke(benches, 'reset');
 *
 * // invoke `emit` with arguments
 * Benchmark.invoke(benches, 'emit', 'complete', listener);
 *
 * // invoke `run(true)`, treat benchmarks as a queue, and register invoke callbacks
 * Benchmark.invoke(benches, {
 *
 *   // invoke the `run` method
 *   'name': 'run',
 *
 *   // pass a single argument
 *   'args': true,
 *
 *   // treat as queue, removing benchmarks from front of `benches` until empty
 *   'queued': true,
 *
 *   // called before any benchmarks have been invoked.
 *   'onStart': onStart,
 *
 *   // called between invoking benchmarks
 *   'onCycle': onCycle,
 *
 *   // called after all benchmarks have been invoked.
 *   'onComplete': onComplete
 * });
 */
function invoke(benches: Benchmark[], name: BenchmarkOptions): Benchmark[] {
  const args = undefined
  const bench = undefined
  const queued = undefined
  let index = -1
  const eventProps = { 'currentTarget': benches }
  const options = {
    onStart: () => {},
    onCycle: () => {},
    onComplete: () => {}
  }
  const result = _.toArray(benches);

  /**
   * Invokes the method of the current object and if synchronous, fetches the next.
   */
  function execute() {
    const listeners = undefined
    const _isAsync = isAsync(bench)
    if (_isAsync) {
      // Use `getNext` as the first listener.
      bench.on('complete', getNext);
      listeners = bench.events.complete;
      listeners.splice(0, 0, listeners.pop());
    }
    // Execute method.
    result[index] = _.isFunction(bench && bench[name]) ? bench[name].apply(bench, args) : undefined;
    // If synchronous return `true` until finished.
    return !_isAsync && getNext();
  }

  /** * Fetches the next bench or executes `onComplete` callback. */
  function getNext(event: Event) {
    const cycleEvent = undefined
    const last = bench
    const async = isAsync(last)

    if (async) {
      last.off('complete', getNext);
      last.emit('complete');
    }
    // Emit "cycle" event.
    eventProps.type = 'cycle';
    eventProps.target = last;
    cycleEvent = Event(eventProps);
    options.onCycle.call(benches, cycleEvent);

    // Choose next benchmark if not exiting early.
    if (!cycleEvent.aborted && raiseIndex() !== false) {
      bench = queued ? benches[0] : result[index];
      if (isAsync(bench)) {
        delay(bench, execute);
      }
      else if (async) {
        // Resume execution if previously asynchronous but now synchronous.
        while (execute()) {}
      }
      else {
        // Continue synchronous execution.
        return true;
      }
    } else {
      // Emit "complete" event.
      eventProps.type = 'complete';
      options.onComplete.call(benches, Event(eventProps));
    }
    // When used as a listener `event.aborted = true` will cancel the rest of
    // the "complete" listeners because they were already called above and when
    // used as part of `getNext` the `return false` will exit the execution while-loop.
    if (event) {
      event.aborted = true;
    } else {
      return false;
    }
  }

  /**
   * Checks if invoking `Benchmark#run` with asynchronous cycles.
   */
  function isAsync(object) {
    // Avoid using `instanceof` here because of IE memory leak issues with host objects.
    const async = args[0] && args[0].async;
    return name == 'run' && (object instanceof Benchmark) &&
      ((async == null ? object.options.async : async)|| object.defer);
  }

  /**
   * Raises `index` to the next defined index or returns `false`.
   */
  function raiseIndex() {
    index++;

    // If queued remove the previous bench.
    if (queued && index > 0) {
      shift.call(benches);
    }
    // If we reached the last index then return `false`.
    return (queued ? benches.length : index < result.length)
      ? index
      : (index = false);
  }
  // Juggle arguments.
  if (_.isString(name)) {
    // 2 arguments (array, name).
    args = slice.call(arguments, 2);
  } else {
    // 2 arguments (array, options).
    options = _.assign(options, name);
    name = options.name;
    args = _.isArray(args = 'args' in options ? options.args : []) ? args : [args];
    queued = options.queued;
  }
  // Start iterating over the array.
  if (raiseIndex() !== false) {
    // Emit "start" event.
    bench = result[index];
    eventProps.type = 'start';
    eventProps.target = bench;
    options.onStart.call(benches, Event(eventProps));

    // End early if the suite was aborted in an "onStart" listener.
    if (name == 'run' && (benches instanceof Suite) && benches.aborted) {
      // Emit "cycle" event.
      eventProps.type = 'cycle';
      options.onCycle.call(benches, Event(eventProps));
      // Emit "complete" event.
      eventProps.type = 'complete';
      options.onComplete.call(benches, Event(eventProps));
    }
    // Start method execution.
    else {
      if (isAsync(bench)) {
        delay(bench, execute);
      } else {
        while (execute()) {}
      }
    }
  }
  return result;
}

/**
 * Creates a string of joined array values or object key-value pairs.
 * @memberOf Benchmark
 * @param {Array|Object} object The object to operate on.
 * @param {string} [separator1=','] The separator used between key-value pairs.
 * @param {string} [separator2=': '] The separator used between keys and values.
 * @returns {string} The joined result.
 */
function join(object: any[] | Object, separator1 = ',', separator2 = ': '): string {
  const result = []
  const length = (object = Object(object)).length
  const arrayLike = length === length >>> 0;
  _.each(object, (value: unknown, key: string) => {
    result.push(arrayLike ? value : key + separator2 + value);
  });
  return result.join(separator1);
}


export interface Timer {
  /**
   * The timer namespace object or constructor.
   * @type {Function|Object}
   */
  ns: Function | Performance
  /**
   * Starts the deferred timer.
   * @param {Object} deferred The deferred instance.
   */
  start?: Object
  /**
   * Stops the deferred timer.
   * @memberOf timer
   * @param {Object} deferred The deferred instance.
   */
  stop?: Object
  res?: number
  unit?: 'ms' | 'us' | 'ns'
}
/**
 * Timer object used by `clock()` and `Deferred#resolve`.
 */
const timer: Timer = {
  ns: performance,
  start: undefined, // Lazy defined in `clock()`.
  stop: undefined // Lazy defined in `clock()`.
} as const


/** * Clocks the time taken to execute a test per cycle (secs). */
export function clock(bench: Benchmark): number {
  const options = defaultOptions
  const templateData = {}
  const timers: Timer[] = [{
    ns: timer.ns,
    res: Math.max(0.0015, getRes('ms')),
    unit: 'ms'
  }];

  // Lazy define for hi-res timers.
  clock = function(clone: BenchmarkOptions): number {
    let deferred: Deferred
    if (clone instanceof Deferred) {
      deferred = clone;
      clone = deferred.benchmark;
    }
    const bench: BenchmarkOptions = clone._original
    const stringable = isStringable(bench.fn)
    const count = bench.count = clone.count
    const decompilable = stringable || (clone.setup !== _.noop || clone.teardown !== _.noop)
    const id = bench.id
    const name = bench.name || (typeof id == 'number' ? '<Test #' + id + '>' : id)
    const result = 0

    // Init `minTime` if needed.
    clone.minTime = bench.minTime || (bench.minTime = bench.options.minTime = options.minTime);

    // Compile in setup/teardown functions and the test loop.
    // Create a new compiled test, instead of using the cached `bench.compiled`,
    // to avoid potential engine optimizations enabled over the life of the test.
    const funcBody = deferred
      ? 'const d#=this,${fnArg}=d#,m#=d#.benchmark._original,f#=m#.fn,su#=m#.setup,td#=m#.teardown;' +
        // When `deferred.cycles` is `0` then...
        'if(!d#.cycles){' +
        // set `deferred.fn`,
        'd#.fn=function(){const ${fnArg}=d#;if(typeof f#=="function"){try{${fn}\n}catch(e#){f#(d#)}}else{${fn}\n}};' +
        // set `deferred.teardown`,
        'd#.teardown=function(){d#.cycles=0;if(typeof td#=="function"){try{${teardown}\n}catch(e#){td#()}}else{${teardown}\n}};' +
        // execute the benchmark's `setup`,
        'if(typeof su#=="function"){try{${setup}\n}catch(e#){su#()}}else{${setup}\n};' +
        // start timer,
        't#.start(d#);' +
        // and then execute `deferred.fn` and return a dummy object.
        '}d#.fn();return{uid:"${uid}"}'

      : 'const r#,s#,m#=this,f#=m#.fn,i#=m#.count,n#=t#.ns;${setup}\n${begin};' +
        'while(i#--){${fn}\n}${end};${teardown}\nreturn{elapsed:r#,uid:"${uid}"}';

    const compiled = bench.compiled = clone.compiled = createCompiled(bench, decompilable, deferred, funcBody),
        isEmpty = !(templateData.fn || stringable);

    try {
      if (isEmpty) {
        // Firefox may remove dead code from `Function#toString` results.
        // For more information see http://bugzil.la/536085.
        throw new Error('The test "' + name + '" is empty. This may be the result of dead code removal.');
      }
      else if (!deferred) {
        // Pretest to determine if compiled code exits early, usually by a
        // rogue `return` statement, by checking for a return object with the uid.
        bench.count = 1;
        compiled = decompilable && (compiled.call(bench, context, timer) || {}).uid == templateData.uid && compiled;
        bench.count = count;
      }
    } catch(e) {
      compiled = null;
      clone.error = e || new Error(String(e));
      bench.count = count;
    }
    // Fallback when a test exits early or errors during pretest.
    if (!compiled && !deferred && !isEmpty) {
      funcBody = (
        stringable || (decompilable && !clone.error)
          ? 'function f#(){${fn}\n}const r#,s#,m#=this,i#=m#.count'
          : 'const r#,s#,m#=this,f#=m#.fn,i#=m#.count'
        ) +
        ',n#=t#.ns;${setup}\n${begin};m#.f#=f#;while(i#--){m#.f#()}${end};' +
        'delete m#.f#;${teardown}\nreturn{elapsed:r#}';

      compiled = createCompiled(bench, decompilable, deferred, funcBody);

      try {
        // Pretest one more time to check for errors.
        bench.count = 1;
        compiled.call(bench, context, timer);
        bench.count = count;
        delete clone.error;
      }
      catch(e) {
        bench.count = count;
        if (!clone.error) {
          clone.error = e || new Error(String(e));
        }
      }
    }
    // If no errors run the full test loop.
    if (!clone.error) {
      compiled = bench.compiled = clone.compiled = createCompiled(bench, decompilable, deferred, funcBody);
      result = compiled.call(deferred || bench, context, timer).elapsed;
    }
    return result;
  };

  /**
   * Creates a compiled function from the given function `body`.
   */
  function createCompiled(bench: Benchmark, decompilable, deferred, body) {
    const fn = bench.fn
    const fnArg = deferred ? getFirstArgument(fn) || 'deferred' : ''

    templateData.uid = uid + uidCounter++;

    _.assign(templateData, {
      'setup': decompilable ? getSource(bench.setup) : interpolate('m#.setup()'),
      'fn': decompilable ? getSource(fn) : interpolate('m#.fn(' + fnArg + ')'),
      'fnArg': fnArg,
      'teardown': decompilable ? getSource(bench.teardown) : interpolate('m#.teardown()')
    });

    // Use API of chosen timer.
    if (timer.unit == 'ns') {
      _.assign(templateData, {
        'begin': interpolate('s#=n#()'),
        'end': interpolate('r#=n#(s#);r#=r#[0]+(r#[1]/1e9)')
      });
    }
    else if (timer.unit == 'us') {
      if (timer.ns.stop) {
        _.assign(templateData, {
          'begin': interpolate('s#=n#.start()'),
          'end': interpolate('r#=n#.microseconds()/1e6')
        });
      } else {
        _.assign(templateData, {
          'begin': interpolate('s#=n#()'),
          'end': interpolate('r#=(n#()-s#)/1e6')
        });
      }
    }
    else if (timer.ns.now) {
      _.assign(templateData, {
        'begin': interpolate('s#=n#.now()'),
        'end': interpolate('r#=(n#.now()-s#)/1e3')
      });
    }
    else {
      _.assign(templateData, {
        'begin': interpolate('s#=new n#().getTime()'),
        'end': interpolate('r#=(new n#().getTime()-s#)/1e3')
      });
    }
    // Define `timer` methods.
    timer.start = createFunction(
      interpolate('o#'),
      interpolate('const n#=this.ns,${begin};o#.elapsed=0;o#.timeStamp=s#')
    );

    timer.stop = createFunction(
      interpolate('o#'),
      interpolate('const n#=this.ns,s#=o#.timeStamp,${end};o#.elapsed=r#')
    );

    // Create compiled test.
    return createFunction(
      interpolate('window,t#'),
      'const global = window, clearTimeout = global.clearTimeout, setTimeout = global.setTimeout;\n' +
      interpolate(body)
    );
  }

  /**
   * Gets the current timer's minimum resolution (secs).
   */
  function getRes(unit) {
    const measured,
        begin,
        count = 30,
        divisor = 1e3,
        ns = timer.ns,
        sample = [];

    // Get average smallest measurable time.
    while (count--) {
      if (unit == 'us') {
        divisor = 1e6;
        if (ns.stop) {
          ns.start();
          while (!(measured = ns.microseconds())) {}
        } else {
          begin = ns();
          while (!(measured = ns() - begin)) {}
        }
      }
      else if (unit == 'ns') {
        divisor = 1e9;
        begin = (begin = ns())[0] + (begin[1] / divisor);
        while (!(measured = ((measured = ns())[0] + (measured[1] / divisor)) - begin)) {}
        divisor = 1;
      }
      else if (ns.now) {
        begin = ns.now();
        while (!(measured = ns.now() - begin)) {}
      }
      else {
        begin = new ns().getTime();
        while (!(measured = new ns().getTime() - begin)) {}
      }
      // Check for broken timers.
      if (measured > 0) {
        sample.push(measured);
      } else {
        sample.push(Infinity);
        break;
      }
    }
    // Convert to seconds.
    return getMean(sample) / divisor;
  }

  /**
   * Interpolates a given template string.
   */
  function interpolate(string) {
    // Replaces all occurrences of `#` with a unique number and template tokens with content.
    return _.template(string.replace(/\#/g, /\d+/.exec(templateData.uid)))(templateData);
  }

  /*----------------------------------------------------------------------*/

  // Detect Chrome's microsecond timer:
  // enable benchmarking via the --enable-benchmarking command
  // line switch in at least Chrome 7 to use chrome.Interval
  try {
    if ((timer.ns = new (context.chrome || context.chromium).Interval)) {
      timers.push({ 'ns': timer.ns, 'res': getRes('us'), 'unit': 'us' });
    }
  } catch(e) {}

  // Detect Node.js's nanosecond resolution timer available in Node.js >= 0.8.
  if (window.process && typeof (timer.ns = window.process.hrtime) == 'function') {
    timers.push({ 'ns': timer.ns, 'res': getRes('ns'), 'unit': 'ns' });
  }
  // Detect Wade Simmons' Node.js `microtime` module.
  if (microtime && typeof (timer.ns = microtime.now) == 'function') {
    timers.push({ 'ns': timer.ns,  'res': getRes('us'), 'unit': 'us' });
  }
  // Pick timer with highest resolution.
  timer = _.minBy(timers, 'res');

  // Error if there are no working timers.
  if (timer.res == Infinity) {
    throw new Error('Benchmark.js was unable to find a working timer.');
  }
  // Resolve time span required to achieve a percent uncertainty of at most 1%.
  // For more information see http://spiff.rit.edu/classes/phys273/uncert/uncert.html.
  options.minTime || (options.minTime = Math.max(timer.res / 2 / 0.01, 0.05));
  return clock.apply(null, arguments);
}

export interface ComputeOptions {
  async: unknown
}

/** * Computes stats on benchmark results. */
export function compute(bench: Benchmark, options: ComputeOptions) {
  const async = options.async
  let elapsed = 0
  const initCount = bench.initCount
  const minSamples = bench.minSamples
  const queue = []
  const sample = bench.stats.sample

  /**
   * Adds a clone to the queue.
   */
  function enqueue() {
    queue.push(Object.assign(bench.clone(), {
      _original: bench,
      events: {
        abort: [update],
        cycle: [update],
        error: [update],
        start: [update]
      }
    }));
  }

  /**
   * Updates the clone/original benchmarks to keep their data in sync.
   */
  function update(event) {
    const clone = this,
        type = event.type;

    if (bench.running) {
      if (type == 'start') {
        // Note: `clone.minTime` prop is inited in `clock()`.
        clone.count = bench.initCount;
      }
      else {
        if (type == 'error') {
          bench.error = clone.error;
        }
        if (type == 'abort') {
          bench.abort();
          bench.emit('cycle');
        } else {
          event.currentTarget = event.target = bench;
          bench.emit(event);
        }
      }
    } else if (bench.aborted) {
      // Clear abort listeners to avoid triggering bench's abort/cycle again.
      clone.events.abort.length = 0;
      clone.abort();
    }
  }

  /**
   * Determines if more clones should be queued or if cycling should stop.
   */
  function evaluate(event: BenchmarkEvent): void {
    const clone = event.target
    const now = _.now()
    let done = bench.aborted
    let size = sample.push(clone.times.period)
    let maxedOut = size >= minSamples && (elapsed += now - clone.times.timeStamp) / 1e3 > bench.maxTime
    const times = bench.times
    const constOf = (sum: number, x: number): number => sum + Math.pow(x - mean, 2)

    // Exit early for aborted or unclockable tests.
    if (done || clone.hz == Infinity) {
      maxedOut = !(size = sample.length = queue.length = 0);
    }

    if (!done) {
      const mean = getMean(sample);
      const constiance = _.reduce(sample, constOf, 0) / (size - 1) || 0;
      const sd = Math.sqrt(constiance);
      const sem = sd / Math.sqrt(size);
      const df = size - 1;
      const critical = tTable[Math.round(df) || 1] || tTable.infinity;
      const moe = sem * critical;
      const rme = (moe / mean) * 100 || 0;
      Object.assign(bench.stats, {
        deviation: sd,
        mean,
        moe,
        rme,
        sem,
        constiance
      });

      // Abort the cycle loop when the minimum sample size has been collected
      // and the elapsed time exceeds the maximum time allowed per benchmark.
      // We don't count cycle delays toward the max time because delays may be
      // increased by browsers that clamp timeouts for inactive tabs. For more
      // information see https://developer.mozilla.org/en/window.setTimeout#Inactive_tabs.
      if (maxedOut) {
        // Reset the `initCount` in case the benchmark is rerun.
        bench.initCount = initCount;
        bench.running = false;
        done = true;
        times.elapsed = (now - times.timeStamp) / 1e3;
      }
      if (bench.hz != Infinity) {
        bench.hz = 1 / mean;
        times.cycle = mean * bench.count;
        times.period = mean;
      }
    }
    // If time permits, increase sample size to reduce the margin of error.
    if (queue.length < 2 && !maxedOut) {
      enqueue();
    }
    // Abort the `invoke` cycle when done.
    event.aborted = done;
  }

  // Init queue and begin.
  enqueue();
  invoke(queue, {
    name: 'run',
    args: { async: async },
    queued: true,
    onCycle: evaluate,
    onComplete: function() { bench.emit('complete'); }
  });
}

/** Cycles a benchmark until a run `count` can be established. */
export function cycle(clone: Benchmark | Deferred, options: BenchmarkOptions = { }) {
  let deferred
  if (clone instanceof Deferred) {
    deferred = clone;
    clone = clone.benchmark;
  }
  let cycles = 0
  let clocked
  let divisor
  let event
  let minTime
  let period
  const async = options.async
  const bench = clone._original
  const count = clone.count
  const times = clone.times

  // Continue, if not aborted between cycles.
  if (clone.running) {
    // `minTime` is set to `Benchmark.options.minTime` in `clock()`.
    cycles = ++clone.cycles;
    clocked = deferred ? deferred.elapsed : clock(clone);
    minTime = clone.minTime;

    if (cycles > bench.cycles) {
      bench.cycles = cycles;
    }
    if (clone.error) {
      event = Event('error');
      event.message = clone.error;
      clone.emit(event);
      if (!event.cancelled) {
        clone.abort();
      }
    }
  }
  // Continue, if not errored.
  if (clone.running) {
    // Compute the time taken to complete last test cycle.
    bench.times.cycle = times.cycle = clocked;
    // Compute the seconds per operation.
    period = bench.times.period = times.period = clocked / count;
    // Compute the ops per second.
    bench.hz = clone.hz = 1 / period;
    // Avoid working our way up to this next time.
    bench.initCount = clone.initCount = count;
    // Do we need to do another cycle?
    clone.running = clocked < minTime;

    if (clone.running) {
      // Tests may clock at `0` when `initCount` is a small number,
      // to avoid that we set its count to something a bit higher.
      if (!clocked && (divisor = divisors[clone.cycles]) != null) {
        count = Math.floor(4e6 / divisor);
      }
      // Calculate how many more iterations it will take to achieve the `minTime`.
      if (count <= clone.count) {
        count += Math.ceil((minTime - clocked) / period);
      }
      clone.running = count != Infinity;
    }
  }
  // Should we exit early?
  event = Event('cycle');
  clone.emit(event);
  if (event.aborted) {
    clone.abort();
  }
  // Figure out what to do next.
  if (clone.running) {
    // Start a new cycle.
    clone.count = count;
    if (deferred) {
      clone.compiled.call(deferred, context, timer);
    } else if (async) {
      delay(clone, function() { cycle(clone, options); });
    } else {
      cycle(clone);
    }
  }
  else {
    runScript(uid + '=1;delete ' + uid);
    clone.emit('complete');
  }
}
