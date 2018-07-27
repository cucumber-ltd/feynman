'use strict'

const assert = require('assert')
const sinon = require('sinon')
const feynman = require('./feynman')

const Actor = () => ({})

describe('feynman', () => {
  const DomainPerspective = ({ app }) => actor => ({
    attemptsTo: action => {
      action({ app })
    },
  })

  const WebAppPerspective = ({ browser }) => actor => ({
    attemptsTo: action => {
      action({ browser })
    },
  })

  const Book = {
    aRoom: ({ app, browser }) => {
      app ? app.bookRoom() : browser.clickOn('Book Room')
    },
  }

  it('works', () => {
    const app = {
      bookRoom: sinon.spy(),
    }
    const browser = {
      clickOn: sinon.spy(),
    }
    const throughTheDomain = DomainPerspective({ app })
    const throughTheWebApp = WebAppPerspective({ browser })
    const joe = Actor()
    throughTheDomain(joe).attemptsTo(Book.aRoom)
    throughTheWebApp(joe).attemptsTo(Book.aRoom)
    sinon.assert.called(app.bookRoom)
    sinon.assert.calledWith(browser.clickOn, 'Book Room')
  })
})
