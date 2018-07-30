'use strict'

const sinon = require('sinon')
const feynman = require('./feynman')

/*
 * Actor - attempts actions using its abilities, it knows how to perfom
 *         actions in its context
 * Ability - dependencies that the interaction needs to do its work
 *           example: browser, the domain api
 *           options: capability, tool, faculty, dependency
 * Perspective - a group of Interactions that use a particular set of Abilities
 * Action - is a general term for task or interaction
 * Task - tasks are composed of tasks or interactions
 * Interaction - directly uses abilities to do something to the app
 */

const Actor = (perspective, abilities) => {
  const actor = {
    attemptsTo: (...actions) => {
      for (const action of actions) {
        const name = action.name
        let handler = perspective[name]
        if (!handler) throw new Error(`No handler for: ${name}`)
        if (action.args) handler = handler(...action.args)
        handler({ actor, ...abilities })
      }
    },

    withPerspective: newPerspective => Actor(newPerspective, abilities),
  }
  return actor
}

describe('feynman', () => {
  // Something we can't quite delete because we <3 it
  const FillIn = {
    field: ({ name }) => ({
      with: text => ({ name: 'fill-in-field-with-text', args: [name, text] }),
    }),
  }

  const DomainPerspective = {
    'book-a-room': ({ state, domain }) =>
      domain.bookRoom({ email: state.get('email') }),
    'book-a-flight': destination => ({ domain }) =>
      domain.bookFlight(destination),
    'book-a-holiday': destination => ({ actor }) =>
      actor.attemptsTo(
        { name: 'book-a-room' },
        { name: 'book-a-flight', args: [destination] }
      ),
  }

  const WebAppPerspective = {
    'book-a-room': ({ actor, state }) => {
      actor.attemptsTo(
        FillIn.field({ name: 'Email' }).with(state.get('email')),
        { name: 'click-on', args: ['Book Room'] }
      )
    },
    'book-a-holiday': destination => ({ actor }) =>
      actor.attemptsTo(
        { name: 'book-a-room' },
        { name: 'book-a-flight', args: [destination] }
      ),
    'fill-in-field-with-text': (name, text) => ({ browser }) =>
      browser.fillIn(name, text),
    'click-on': name => ({ browser }) => browser.clickOn(name),
  }

  it('allows actors to have different perspectives', () => {
    const domain = {
      bookRoom: sinon.spy(),
    }
    const browser = {
      clickOn: sinon.spy(),
      fillIn: sinon.spy(),
    }
    const state = new Map([['email', 'joe@example.com']])
    const domainJoe = Actor(DomainPerspective, { domain, state })
    const webAppJoe = Actor(WebAppPerspective, {
      browser,
      state,
    })
    domainJoe.attemptsTo({ name: 'book-a-room' })
    webAppJoe.attemptsTo({ name: 'book-a-room' })
    sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
    sinon.assert.calledWith(browser.fillIn, 'Email', 'joe@example.com')
    sinon.assert.calledWith(browser.clickOn, 'Book Room')
  })

  it('has higher order tasks', () => {
    const domain = {
      bookRoom: sinon.spy(),
      bookFlight: sinon.spy(),
    }
    const state = new Map([['email', 'joe@example.com']])
    const joe = Actor(DomainPerspective, { domain, state })
    joe.attemptsTo({ name: 'book-a-holiday', args: ['Barbados'] })
    sinon.assert.calledWith(domain.bookFlight, 'Barbados')
    sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
  })

  it(
    "gives a decent error when you attempt to do a task that doesn't have a corresponding action"
  )

  it('lets actions modify the state')

  it('waits for async actions to complete')

  describe('Actor', () => {
    it('changes perspective', () => {
      const domain = {
        bookRoom: sinon.spy(),
      }
      const browser = {
        clickOn: sinon.spy(),
        fillIn: sinon.spy(),
      }
      const state = new Map([['email', 'joe@example.com']])
      let joe = Actor(DomainPerspective, { domain, browser, state })
      joe.attemptsTo({ name: 'book-a-room' })
      sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
      joe = joe.withPerspective(WebAppPerspective)
      joe.attemptsTo({ name: 'book-a-room' })
      sinon.assert.calledWith(browser.fillIn, 'Email', 'joe@example.com')
      sinon.assert.calledWith(browser.clickOn, 'Book Room')
    })

    it('merges in new abilities')
    it('merges in new state')
  })
})
