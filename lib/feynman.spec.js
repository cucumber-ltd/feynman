'use strict'

const assert = require('assert')
const feynman = require('./feynman')

describe('feynman', () => {
  it('loads tasks from a directory into different perspectives', () => {
    const perspectives = feynman('./fixtures')
    assert(perspectives['domain'].CreateWidget)
    assert(perspectives['ui'].CreateWidget)
  })
})
