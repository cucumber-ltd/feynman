'use strict'

const assert = require('assert')
const feynman = require('./feynman')

describe('feynman', () => {
  it('works', () => {
    const throughTheDomain = new DomainPerspective()
    const joe = Actor()
    throughTheDomain(joe).attemptsTo(
      Book.aRoom
    )
  })
})
