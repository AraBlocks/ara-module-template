const docs = require('../')
const test = require('blue-tape')

// blue-tape == tape with promise support
// https://github.com/substack/tape for api docs

test('docs.file', (t) => {
  t.deepEqual('object', typeof docs.file)
})

test('docs.doStuff', (t) => {
  t.deepEqual('function', typeof docs.file.doStuff)
})
