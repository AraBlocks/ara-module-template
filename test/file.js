// Make sure that mocking is always loaded before other classes to ensure
// our mocks override the modules
// eslint-disable-next-line no-unused-vars
const constants = require('./fixtures/constants')

const test = require('blue-tape')
const file = require('../file')

// blue-tape == tape with promise support
// https://github.com/substack/tape for api docs

test('file.doStuff', (t) => {
  const result = file.doStuff(32, 'ara-docs')
  t.ok(result)
})
