'use strict'

const assert = require('assert')
const sinon = require('sinon')
const { Perspective, Actor, Task, Description, Interaction } = require('./core')

describe('feynman core objects', () => {
  context('handling tasks through perspectives', () => {
    it('attempts a task with no parameters', async () => {
      const browser = {
        click: sinon.spy(),
      }
      const abilities = { browser }
      const SignUp = Task('SignUp')
      const perspective = Perspective('web browser', handle => {
        handle(SignUp, () => ({ browser }) => {
          browser.click('Sign up')
        })
      })
      const joe = Actor(abilities, perspective)
      await joe.attemptsTo(SignUp)
      sinon.assert.called(browser.click)
    })

    it('attempts a task with a single parameter', async () => {
      const browser = {
        fillIn: sinon.spy(),
      }
      const abilities = { browser }
      const SignUp = {
        as: name => Task('SignUp.as', { name }),
      }

      const perspective = Perspective('web browser', handle => {
        handle({ id: 'SignUp.as' }, ({ name }) => ({ browser }) =>
          browser.fillIn(name)
        )
      })
      const joe = Actor(abilities, perspective)
      await joe.attemptsTo(SignUp.as('dave@example.com'))
      sinon.assert.calledWith(browser.fillIn, 'dave@example.com')
    })
  })

  context('with multiple perspectives', () => {
    const SignUp = Task('SignUp')

    const domainPerspective = Perspective('domain', handle => {
      handle(SignUp, () => ({ domain }) =>
        domain.signUp({ email: 'dave@example.com' })
      )
    })

    const webAppPerspective = Perspective('web browser', handle => {
      handle(SignUp, () => ({ browser }) =>
        browser.fillIn('email', 'dave@example.com')
      )
    })

    it('allows actors to attempt the same task from different perspectives', async () => {
      const domain = {
        signUp: sinon.spy(),
      }
      const browser = {
        fillIn: sinon.spy(),
      }
      const domainJoe = Actor({ domain, browser }, domainPerspective)
      const webAppJoe = domainJoe.through(webAppPerspective)
      await domainJoe.attemptsTo(SignUp)
      await webAppJoe.attemptsTo(SignUp)
      sinon.assert.calledWith(domain.signUp, { email: 'dave@example.com' })
      sinon.assert.calledWith(browser.fillIn, 'email', 'dave@example.com')
    })
  })

  it('waits for async tasks to complete', async () => {
    const saveSomething = Task('Save something')
    const db = {
      insert: sinon.spy(),
    }
    const perspective = Perspective('test', handle => {
      handle(saveSomething, () => ({ db }) =>
        new Promise(resolve =>
          setTimeout(() => {
            db.insert()
            resolve()
          }, 1)
        )
      )
    })
    const joe = Actor({ db }, perspective)
    await joe.attemptsTo(saveSomething)
    sinon.assert.called(db.insert)
  })

  it('allows the actor to gain new abilities', async () => {
    const db = {
      insert: sinon.spy(),
    }
    const joe = Actor({}, Perspective('test')).gainsAbilities({ db })
    await joe.attemptsTo(({ db }) => {
      db.insert()
    })
    sinon.assert.called(db.insert)
  })

  it('returns the actor when you attempt a task', async () => {
    const joe = Actor({}, Perspective('test'))
    const result = await joe.attemptsTo(() => {})
    assert.equal(result, joe)
  })

  it('waits for async interactions to complete', async () => {
    const db = {
      insert: sinon.spy(),
    }
    const saveSomething = ({ db }) =>
      new Promise(resolve =>
        setTimeout(() => {
          db.insert()
          resolve()
        }, 1)
      )
    const joe = Actor({ db }, Perspective('test'))
    await joe.attemptsTo(saveSomething)
    sinon.assert.called(db.insert)
  })

  it("gives a decent error when you attempt to do an action that doesn't have a corresponding handler", async () => {
    const doSomething = Task('DoSomething')
    const perspective = Perspective('Perspective')
    const joe = Actor({}, perspective)
    let error
    try {
      await joe.attemptsTo(doSomething)
    } catch (e) {
      error = e
    }
    assert(
      error.message.match(
        /No handler found for task 'DoSomething' in 'Perspective' perspective/
      )
    )
  })

  describe('logging', () => {
    it('logs when a task is attempted', async () => {
      const log = sinon.spy()
      const doSomething = Task('doSomething', {}, Description('Do something!'))
      const perspective = Perspective('Perspective', handle => {
        handle({ id: 'doSomething' }, () => () => {})
      })
      await Actor({ log }, perspective).attemptsTo(doSomething)
      sinon.assert.calledWith(log, 'Do something!')
    })

    it('logs when an interaction is attempted', async () => {
      const log = sinon.spy()
      const doSomething = Interaction(() => {}, Description('Do something!'))
      await Actor({ log }, Perspective()).attemptsTo(doSomething)
      sinon.assert.calledWith(log, 'Do something!')
    })
  })
})
