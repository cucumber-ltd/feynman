'use strict'

const assert = require('assert')
const sinon = require('sinon')
const feynman = require('./feynman')

const Actor = abilities => ({
  attemptsTo: interaction => {
    interaction(abilities)
  },

  withAbilities: abilities => Actor(abilities),
})

describe('feynman', () => {
  const DomainPerspective = ({ app }) => actor => ({
    attemptsTo: action => {
      action.domain({ actor: actor.withAbilities({ app }) })
    },
  })

  const WebAppPerspective = ({ browser }) => actor => ({
    attemptsTo: action => {
      action.webApp({ browser })
    },
  })

  // Web interactions
  const ClickOn = {
    button: ({ name }) => ({ browser }) => browser.clickOn(name),
  }

  // Domain interaction
  const Invoke = {
    bookRoom: ({ app }) => app.bookRoom(),
  }

  const Book = {
    aRoom: {
      domain: ({ actor }) => actor.attemptsTo(Invoke.bookRoom),
      webApp: abilities => ClickOn.button({ name: 'Book Room' })(abilities),
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
