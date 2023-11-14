import * as B from './benchmark.js'
interface BenchmarkFramework {
  Benchmark: any
  Suite: any
}
const Framework = B as BenchmarkFramework
const bench = Framework.Benchmark('hello')
console.log("bench", bench)
const suite = Framework.Suite('hello')
suite.add('foo', () => {
  console.log('foo')
})
suite.on('complete', () => {
  console.log('foo complete')
})
suite.run()
