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

const Perspective = (actions, abilities) => actor => ({
  attemptsTo: task => {
    const action = actions[task]
    action({ actor: actor.withAbilities(abilities) })
  },
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
  }

  it('works', () => {
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

  describe('Actor', () => {
    it('merges in new abilities')
    it('merges in new state')
  })
})
