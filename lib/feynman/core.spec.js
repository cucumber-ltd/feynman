'use strict'

const assert = require('assert')
const sinon = require('sinon')
const {
  Actor,
  Assertion,
  currentActor,
  Description,
  Interaction,
  Inquisitor,
  Question,
  Perspective,
  Task,
} = require('./core')

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

    it('makes assertions', async () => {
      const AnAssertion = Assertion('an assertion')
      const actor = Actor(
        {},
        Perspective('test', handle => {
          handle(AnAssertion, () => () => assert(true))
        })
      )
      await actor.assertsThat(AnAssertion)
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
        /No handler found for task\/assertion 'DoSomething' in 'Perspective' perspective/
      )
    )
  })

  describe('current actor', () => {
    it('returns the actor who last attempted a task', async () => {
      const perspective = Perspective('test')
      const actor = await Actor({}, perspective).attemptsTo(() => {})
      assert.equal(currentActor(), actor)
    })
  })

  describe('questions', () => {
    const ASimpleQuestion = Question(
      'a simple question',
      {},
      Description('This asks a simple question with a single answer')
    )
    const answer = 'the answer to the simple question'
    const getSimpleAnswer = async () => answer
    let verified

    beforeEach(() => {
      verified = false
    })

    it('can yield simple answers', async () => {
      const perspective = Perspective('test', handle => {
        handle(ASimpleQuestion, () => ({ getSimpleAnswer }) =>
          getSimpleAnswer()
        )
      })
      await Actor({ getSimpleAnswer }, perspective)
        .asksFor(ASimpleQuestion)
        .andVerify(aSimpleAnswer => {
          assert.equal(aSimpleAnswer, answer)
          verified = true
        })
      assert(verified)
    })

    it('can ask several questions', async () => {
      const AnotherSimpleQuestion = Question(
        'another simple question',
        {},
        Description('This asks a simple question with a single answer')
      )
      const anotherAnswer = 'the answer to another simple question'
      const getOtherSimpleAnswer = async () => anotherAnswer
      const perspective = Perspective('test', handle => {
        handle(ASimpleQuestion, () => ({ getSimpleAnswer }) =>
          getSimpleAnswer()
        )
        handle(AnotherSimpleQuestion, () => ({ getOtherSimpleAnswer }) =>
          getOtherSimpleAnswer()
        )
      })
      await Actor({ getSimpleAnswer, getOtherSimpleAnswer }, perspective)
        .asksFor(ASimpleQuestion, AnotherSimpleQuestion)
        .andVerify((aSimpleAnswer, anotherSimpleAnswer) => {
          assert.deepEqual(aSimpleAnswer, answer)
          assert.deepEqual(anotherSimpleAnswer, anotherAnswer)
          verified = true
        })
      assert(verified)
    })

    it('@wip can yield changing answers', async () => {
      let i = 0
      const AChangingQuestion = Question(
        'a question with changing answers',
        {},
        Description('This asks a question with changing answers')
      )
      const getChangingAnswer = async () => i++
      const perspective = Perspective('test', handle => {
        handle(AChangingQuestion, () => ({ getChangingAnswer }) =>
          new Inquisitor(notify => {
            const interval = setInterval(
              async () => notify(await getChangingAnswer()),
              10
            )
            return () => clearInterval(interval)
          })
        )
      })

      await Actor({ getChangingAnswer }, perspective)
        .asksFor(AChangingQuestion)
        .andVerify(async aChangingAnswer => {
          assert.equal(aChangingAnswer, 2)
          verified = true
        })
      assert(verified)
    })

    it('times out if no answers come in', async () => {
      let i = 0
      const AChangingQuestion = Question(
        'a question with changing answers',
        {},
        Description('This asks a question with changing answers')
      )
      const getChangingAnswer = async () => i++
      const perspective = Perspective('test', handle => {
        handle(AChangingQuestion, () => () =>
          new Inquisitor(() => {
            return () => {}
          })
        )
      })

      await assert.rejects(() =>
        Actor({ getChangingAnswer }, perspective)
          .asksFor(AChangingQuestion)
          .andVerify(() => {})
      )
    })
  })

  it('@wip throws an error when wrong answer is given', async () => {
    let i = 0
    const AChangingQuestion = Question(
      'a question with changing answers',
      {},
      Description('This asks a question with changing answers')
    )
    const getChangingAnswer = async () => i++
    const perspective = Perspective('test', handle => {
      handle(AChangingQuestion, () => ({ getChangingAnswer }) =>
        new Inquisitor(notify => {
          const interval = setInterval(
            async () => notify(await getChangingAnswer()),
            10
          )
          return () => clearInterval(interval)
        })
      )
    })
    const error = new Error('Wrong answer!')
    await assert.rejects(
      () =>
        Actor({ getChangingAnswer }, perspective)
          .asksFor(AChangingQuestion)
          .andVerify(async () => {
            throw error
          }),
      error
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
