const file = require('../file')
const test = require('ava')

test('file.doStuff', (t) => {
  const result = file.doStuff(32, 'ara-docs')
  t.true(true === result)
})
