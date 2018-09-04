'use strict'

const assert = require('assert')
const sinon = require('sinon')
const { Perspective, Actor, Task, Memory, Remember, Recall } = require('./core')

describe('feynman core objects', () => {
  describe('defining tasks', () => {
    it('defines a standalone task with some args', () => {
      const StandaloneTask = Task('StandaloneTask', ['arg'])
      assert(typeof StandaloneTask === 'function')
      assert.equal(StandaloneTask.id, 'StandaloneTask')
      const action = StandaloneTask('value')
      assert.equal(action.id, 'StandaloneTask')
      assert.deepEqual(action.params, { arg: 'value' })
    })

    it('nests tasks', () => {
      const RootTask = Task('RootTask', ['rootArg'], Task =>
        Task('NestedTask', ['nestedArg'])
      )
      assert(typeof RootTask === 'function')
      assert.equal(RootTask.id, 'RootTask')

      const action = RootTask('root-value')
      assert.equal(action.id, 'RootTask')
      assert.deepEqual(action.params, { rootArg: 'root-value' })
      assert(typeof RootTask.NestedTask === 'function')
      assert.equal(RootTask.NestedTask.id, 'RootTask.NestedTask')

      const nestedAction = RootTask('root-value').NestedTask('nested-value')
      assert.equal(nestedAction.id, 'RootTask.NestedTask')
      assert.deepEqual(nestedAction.params, {
        rootArg: 'root-value',
        nestedArg: 'nested-value',
      })
    })

    it('deeply nests tasks', () => {
      const RootTask = Task('RootTask', ['rootArg'], Task =>
        Task('NestedTask', ['nestedArg'], Task =>
          Task('DeeplyNestedTask', ['deeplyNestedArg'])
        )
      )

      const deeplyNestedAction = RootTask('root-value')
        .NestedTask('nested-value')
        .DeeplyNestedTask('deeply-nested-value')
      assert.equal(
        deeplyNestedAction.id,
        'RootTask.NestedTask.DeeplyNestedTask'
      )
      assert.deepEqual(deeplyNestedAction.params, {
        rootArg: 'root-value',
        nestedArg: 'nested-value',
        deeplyNestedArg: 'deeply-nested-value',
      })
    })

    it('deeply nests tasks without calling the root task', () => {
      const RootTask = Task('RootTask', [], Task =>
        Task('NestedTask', ['nestedArg'], Task =>
          Task('DeeplyNestedTask', ['deeplyNestedArg'])
        )
      )

      const deeplyNestedAction = RootTask.NestedTask(
        'nested-value'
      ).DeeplyNestedTask('deeply-nested-value')
      assert.equal(
        deeplyNestedAction.id,
        'RootTask.NestedTask.DeeplyNestedTask'
      )
      assert.deepEqual(deeplyNestedAction.params, {
        nestedArg: 'nested-value',
        deeplyNestedArg: 'deeply-nested-value',
      })
    })

    it('allows for sibling nested tasks', () => {
      const RootTask = Task('RootTask', [], Task => {
        Task('NestedTask', ['nestedArg'])
        Task('SiblingNestedTask', ['siblingNestedArg'])
      })

      const nestedAction = RootTask.NestedTask('nested-value')
      assert.equal(nestedAction.id, 'RootTask.NestedTask')
      assert.deepEqual(nestedAction.params, { nestedArg: 'nested-value' })

      const siblingNestedAction = RootTask.SiblingNestedTask(
        'sibling-nested-value'
      )
      assert.equal(siblingNestedAction.id, 'RootTask.SiblingNestedTask')
      assert.deepEqual(siblingNestedAction.params, {
        siblingNestedArg: 'sibling-nested-value',
      })
    })

    it('infers a description for a task', () => {
      const CreateUser = Task('CreateUser', [], Task => {
        Task('named', ['userName'])
      })
      assert.equal(CreateUser.named.description, 'Create user named')
      assert.equal(
        CreateUser.named('matt').description,
        "Create user named 'matt'"
      )
    })

    it('infers a description for a nested task', () => {
      const CreateUser = Task('CreateUser', [], Task => {
        Task('named', ['userName'], Task => {
          Task('withBacon', ['flavour'])
        })
      })
      assert.equal(CreateUser.named.description, 'Create user named')
      assert.equal(
        CreateUser.named('matt').withBacon('smoked').description,
        "Create user named 'matt' with bacon 'smoked'"
      )
    })
  })

  context('handling tasks through perspectives', () => {
    it('attempts a task with no parameters', async () => {
      const browser = {
        refresh: sinon.spy(),
      }
      const abilities = { browser }
      const Refresh = Task('Refresh', [], Task => Task('browser', []))
      const perspective = Perspective('web browser', handle => {
        handle(Refresh.browser, () => ({ browser }) => {
          browser.refresh()
        })
      })
      const joe = Actor(abilities, perspective)
      await joe.attemptsTo(Refresh.browser)
      sinon.assert.called(browser.refresh)
    })

    it('attempts a task with a single parameter', async () => {
      const browser = {
        clickOn: sinon.spy(),
      }
      const abilities = { browser }
      const ClickOn = Task('ClickOn', [], Task => Task('button', ['text']))

      const perspective = Perspective('web browser', handle => {
        handle(ClickOn.button, ({ text }) => ({ browser }) =>
          browser.clickOn(text)
        )
      })
      const joe = Actor(abilities, perspective)
      await joe.attemptsTo(ClickOn.button('Book now'))
      sinon.assert.calledWith(browser.clickOn, 'Book now')
    })

    it('attempts a nested task', async () => {
      const browser = {
        fillIn: sinon.spy(),
      }
      const abilities = { browser }
      const FillIn = Task('FillIn', [], Task =>
        Task('label', ['name'], Task => Task('with', ['text']))
      )
      const perspective = Perspective('web browser', handle => {
        handle(FillIn.label.with, ({ name, text }) => ({ browser }) =>
          browser.fillIn(name, text)
        )
      })
      const joe = Actor(abilities, perspective)
      await joe.attemptsTo(FillIn.label('email').with('joe@example.com'))
      sinon.assert.calledWith(browser.fillIn, 'email', 'joe@example.com')
    })
  })

  context('with multiple perspectives', () => {
    const Book = {
      aHoliday: destination => ({ actor }) =>
        actor.attemptsTo(Book.aRoom, Book.aFlight(destination)),
      aRoom: Task('aRoom', []),
      aFlight: Task('aFlight', ['destination']),
    }

    const domainPerspective = Perspective('domain', handle => {
      handle(Book.aRoom, () => ({ state, domain }) =>
        domain.bookRoom({ email: state.get('email') })
      )
      handle(Book.aFlight, ({ destination }) => ({ domain }) =>
        domain.bookFlight(destination)
      )
    })

    const webAppPerspective = Perspective('web browser', handle => {
      const FillIn = {
        field: ({ name }) => ({
          with: text => ({ browser }) => browser.fillIn(name, text),
        }),
      }
      const Click = {
        on: text => ({ browser }) => browser.clickOn(text),
      }
      handle(Book.aRoom, () => ({ actor, state }) =>
        actor.attemptsTo(
          FillIn.field({ name: 'Email' }).with(state.get('email')),
          Click.on('Book Room')
        )
      )
    })

    it('allows actors to attempt the same task from different perspectives', async () => {
      const domain = {
        bookRoom: sinon.spy(),
      }
      const browser = {
        clickOn: sinon.spy(),
        fillIn: sinon.spy(),
      }
      const state = new Map([['email', 'joe@example.com']])
      const domainJoe = Actor({ domain, browser, state }, domainPerspective)
      const webAppJoe = domainJoe.through(webAppPerspective)
      await domainJoe.attemptsTo(Book.aRoom)
      await webAppJoe.attemptsTo(Book.aRoom)
      sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
      sinon.assert.calledWith(browser.fillIn, 'Email', 'joe@example.com')
      sinon.assert.calledWith(browser.clickOn, 'Book Room')
    })

    it('runs higher order tasks', async () => {
      const domain = {
        bookRoom: sinon.spy(),
        bookFlight: sinon.spy(),
      }
      const state = new Map([['email', 'joe@example.com']])
      const joe = Actor({ domain, state }, domainPerspective)
      await joe.attemptsTo(Book.aHoliday('Barbados'))
      sinon.assert.calledWith(domain.bookFlight, 'Barbados')
      sinon.assert.calledWith(domain.bookRoom, { email: 'joe@example.com' })
    })
  })

  it('waits for async tasks to complete', async () => {
    const saveSomething = Task()
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
    const joe = Actor({}).gainsAbilities({ db })
    await joe.attemptsTo(({ db }) => {
      db.insert()
    })
    sinon.assert.called(db.insert)
  })

  it('returns the actor when you attempt a task', async () => {
    const joe = Actor({})
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
    const joe = Actor({ db })
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
        /No handler found for task "DoSomething" in "Perspective" perspective/
      )
    )
  })

  describe('Memory', () => {
    it('allows an actor to remember things', async () => {
      const joe = Actor({ ...Memory() })
      await joe.attemptsTo(Remember.that('thing').is('something'))
      assert.equal(await joe.asks(Recall.about('thing')), 'something')
    })

    it('allows an actor to remember things under several names', async () => {
      const joe = Actor({ ...Memory() })
      await joe.attemptsTo(
        Remember.that('thing').is('something'),
        Remember.that('other thing').equals('thing')
      )
      assert.equal(await joe.asks(Recall.about('other thing')), 'something')
    })

    it("throws when asked for something it can't remember", async () => {
      const joe = Actor({ ...Memory() })
      let err
      try {
        await joe.asks(Recall.about('something unknown'))
      } catch (e) {
        err = e
      }
      assert(err, 'Expected it to throw')
      assert(
        err.message.match(/something unknown/),
        `The error message doesn't look right: ${err.message}`
      )
    })
  })
})
