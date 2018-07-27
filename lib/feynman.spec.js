'use strict'

const assert = require('assert')
const sinon = require('sinon')
const feynman = require('./feynman')

const Actor = (abilities, state) => ({
  attemptsTo: interaction => {
    interaction(abilities)
  },

  get: key => state[key],

  withAbilities: abilities => Actor(abilities, state),

  withState: state => Actor(abilities, state),
})

describe('feynman', () => {
  // Tasks
  const Book = {
    aRoom: {},
  }

  const DomainActions = {
    [Book.aRoom]: ({ actor }) =>
      actor.attemptsTo(Invoke.bookRoomFor(actor.get('email'))),
  }

  const WebAppActions = {
    [Book.aRoom]: ({ actor }) => {
      actor.attemptsTo(FillIn.field({ name: 'Email' }).with(actor.get('email')))
      actor.attemptsTo(ClickOn.button({ name: 'Book Room' }))
    },
  }

  const Perspective = (actions, abilities) => actor => ({
    attemptsTo: task => {
      const action = actions[task]
      action({ actor: actor.withAbilities(abilities) })
    },
  })


  // Web interactions
  const ClickOn = {
    button: ({ name }) => ({ browser }) => browser.clickOn(name),
  }

  const FillIn = {
    field: ({ name }) => ({
      with: text => ({ browser }) => browser.fillIn(name, text),
    }),
  }

  // Domain interaction
  const Invoke = {
    bookRoomFor: email => ({ app }) => app.bookRoom({ email }),
  }

  it('works', () => {
    const app = {
      bookRoom: sinon.spy(),
    }
    const browser = {
      clickOn: sinon.spy(),
      fillIn: sinon.spy(),
    }
    const throughTheDomain = Perspective(DomainActions, { app })
    const throughTheWebApp = Perspective(WebAppActions, {
      browser,
    })
    const joe = Actor().withState({ email: 'joe@example.com' })
    throughTheDomain(joe).attemptsTo(Book.aRoom)
    throughTheWebApp(joe).attemptsTo(Book.aRoom)
    sinon.assert.calledWith(app.bookRoom, { email: 'joe@example.com' })
    sinon.assert.calledWith(browser.fillIn, 'Email', 'joe@example.com')
    sinon.assert.calledWith(browser.clickOn, 'Book Room')
  })

  describe('Actor', () => {
    it('merges in new abilities')
    it('merges in new state')
  })
})
