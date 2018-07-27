'use strict'

const assert = require('assert')
const sinon = require('sinon')
const feynman = require('./feynman')

/*
 * Actor - attempts an interaction using its abilities
 * Perspective - context within which an actor acts, it knows how to perfom
 *               actions in its context
 * Ability - dependencies that the interaction needs to do its work 
 *           example: browser, the domain api
 *           options: capability, tool, faculty, dependency
 * Action - is a general term for task or interaction
 * Task - tasks are composed of tasks or interactions
 * Interaction - directly use abilities to do their work
 */

const Actor = (abilities, state) => ({
  attemptsTo: interaction => {
    interaction(abilities)
  },

  get: key => state[key],

  withAbilities: abilities => Actor(abilities, state),

  withState: state => Actor(abilities, state),
})

const Perspective = (actions, abilities) => actor => {
  const perspective = {
    attemptsTo: task => {
      const action = actions[task]
      action({ actor: actor.withAbilities(abilities) })
    },
  }
  return perspective
}

describe('feynman', () => {
  // Tasks
  const Book = {
    aRoom: 'x',
    aFlight: 'y',
    aHoliday: 'z',
  }

  const DomainActions = {
    [Book.aRoom]: ({ actor }) =>
      actor.attemptsTo(Invoke.bookRoomFor(actor.get('email'))),
    [Book.aFlight]: ({ actor }) => actor.attemptsTo(Invoke.bookFlight),
    [Book.aHoliday]: ({ actor }) => {
      actor.attemptsTo(Invoke.bookRoomFor(actor.get('email')))
      actor.attemptsTo(Invoke.bookFlight)
    },
  }

  const WebAppActions = {
    [Book.aRoom]: ({ actor }) => {
      actor.attemptsTo(FillIn.field({ name: 'Email' }).with(actor.get('email')))
      actor.attemptsTo(ClickOn.button({ name: 'Book Room' }))
    },
  }

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
    bookRoomFor: email => ({ domain }) => domain.bookRoom({ email }),
    bookFlight: ({ domain }) => domain.bookFlight(),
  }

  it('allows an actor to have multiple perspectives', () => {
    const domain = {
      bookRoom: sinon.spy(),
    }
    const browser = {
      clickOn: sinon.spy(),
      fillIn: sinon.spy(),
    }

    const throughTheDomain = Perspective(DomainActions, { domain })
    const throughTheWebApp = Perspective(WebAppActions, {
      browser,
    })
    const joe = Actor().withState({ email: 'joe@example.com' })
    throughTheDomain(joe).attemptsTo(Book.aRoom)
    throughTheWebApp(joe).attemptsTo(Book.aRoom)
    sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
    sinon.assert.calledWith(browser.fillIn, 'Email', 'joe@example.com')
    sinon.assert.calledWith(browser.clickOn, 'Book Room')
  })

  it('higher order tasks', () => {
    const domain = {
      bookRoom: sinon.spy(),
      bookFlight: sinon.spy(),
    }
    const throughTheDomain = Perspective(DomainActions, { domain })
    const joe = Actor().withState({ email: 'joe@example.com' })
    throughTheDomain(joe).attemptsTo(Book.aHoliday)
    sinon.assert.calledWith(domain.bookFlight)
    sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
  })

  it(
    "gives a decent error when you attempt to do a task that doesn't have a corresponding action"
  )

  describe('Actor', () => {
    it('merges in new abilities')
    it('merges in new state')
  })
})
