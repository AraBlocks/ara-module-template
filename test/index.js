const docs = require('../')
const test = require('ava')

test('docs.file', (t) => {
  t.true('object' === typeof docs.file)
})

test('docs.doStuff', (t) => {
  t.true('function' === typeof docs.file.doStuff)
})
