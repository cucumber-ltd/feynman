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

/*
 * Annoyances
 *
 * - having to repeat the name in a string
 * - having to repeat the action as whole
 * - having to declare things twice
 * - there's two if statements
 */

const Actor = (perspective, abilities) => {
  const actor = {
    attemptsTo: (...actions) => {
      for (const action of actions) {
        const { id } = action
        let handler = perspective[id]
        if (!handler) throw new Error(`No handler for: ${id}`)
        if (action.args) handler = handler(...action.args)
        handler({ actor, ...abilities })
      }
    },
  }
  return actor
}

let n = 0
const makeAction = () => {
  const id = n++
  const action = (...args) => ({ id, args })
  action.id = id
  action.args = []
  return action
}

const Perspective = definition => {
  const result = {}
  const Handle = (action, fn) => {
    result[action.id] = fn
  }
  definition(Handle)
  return result
}

const perspective = describe('feynman', () => {
  context('an action with no parameters', () => {
    it('is attempted by the actor', () => {
      const browser = {
        refresh: sinon.spy(),
      }
      const abilities = { browser }
      const Refresh = { browser: makeAction() }
      const perspective = Perspective(Handle => {
        Handle(Refresh.browser, () => ({ browser }) => browser.refresh())
      })
      const joe = Actor(perspective, abilities)
      joe.attemptsTo(Refresh.browser)
      sinon.assert.called(browser.refresh)
    })
  })

  context('an action with a single parameter', () => {
    it('is attempted by the actor', () => {
      const browser = {
        clickOn: sinon.spy(),
      }
      const abilities = { browser }
      const ClickOn = { button: makeAction() }

      const perspective = Perspective(Handle => {
        Handle(ClickOn.button, text => ({ browser }) => browser.clickOn(text))
      })
      const joe = Actor(perspective, abilities)
      joe.attemptsTo(ClickOn.button('Book now'))
      sinon.assert.calledWith(browser.clickOn, 'Book now')
    })
  })

  context('an action with multiple parameters', () => {
    it('is attempted by the actor', () => {
      const browser = {
        fillIn: sinon.spy(),
      }
      const abilities = { browser }
      const FillIn = { label: makeAction(), selector: makeAction() }
      const perspective = Perspective(Handle => {
        Handle(FillIn.label, ({ name, with: text }) => ({ browser }) =>
          browser.fillIn(name, text)
        )
      })
      const joe = Actor(perspective, abilities)
      joe.attemptsTo(FillIn.label({ name: 'email', with: 'joe@example.com' }))
      sinon.assert.calledWith(browser.fillIn, 'email', 'joe@example.com')
    })
  })

  xcontext('with multiple perspectives', () => {
    // Something we can't quite delete because we <3 it
    const FillIn = {
      field: ({ name }) => ({
        with: text => ({
          name: 'fill-in-field-with-text',
          args: [{ name, text }],
        }),
      }),
    }

    const SharedPerspective = {
      'book-a-holiday': destination => ({ actor }) =>
        actor.attemptsTo(
          { name: 'book-a-room' },
          { name: 'book-a-flight', args: [destination] }
        ),
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
      'fill-in-field-with-text': ({ name, text }) => ({ browser }) =>
        browser.fillIn(name, text),
      'click-on': name => ({ browser }) => browser.clickOn(name),
    }

    it('allows actors attempt the same action from different perspectives', () => {
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
      const joe = Actor(
        { ...DomainPerspective, ...SharedPerspective },
        { domain, state }
      )
      joe.attemptsTo({ name: 'book-a-holiday', args: ['Barbados'] })
      sinon.assert.calledWith(domain.bookFlight, 'Barbados')
      sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
    })
  })

  it(
    "gives a decent error when you attempt to do a task that doesn't have a corresponding action"
  )

  it('lets actions modify the state')

  it('waits for async actions to complete')

  describe('Actor', () => {
    it('merges in new abilities')
    it('merges in new state')
  })
})
