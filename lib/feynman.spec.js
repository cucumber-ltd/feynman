'use strict'

const assert = require('assert')
const sinon = require('sinon')
const feynman = require('./feynman')

const Actor = () => ({})

describe('feynman', () => {
  const DomainPerspective = ({ app }) => actor => ({
    attemptsTo: action => {},
  })
  const Book = {
    aRoom: () => {},
  }

  it('works', () => {
    const app = {
      bookRoom: sinon.spy(),
    }
    const throughTheDomain = DomainPerspective({ app })
    const joe = Actor()
    throughTheDomain(joe).attemptsTo(Book.aRoom)
    sinon.assert.called(app.bookRoom)
  })
})
