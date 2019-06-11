'use strict'

const assert = require('assert')
const sinon = require('sinon')
const { Actor, Perspective } = require('./core')
const { Remember, Memory } = require('./memory')
const {
  interactions,
  action,
  tasks,
  task,
  questions,
  question,
} = require('./definitions')

describe('interactions', () => {
  let browser, dave

  beforeEach(async () => {
    browser = {
      click: sinon.spy(),
      clickButton: sinon.spy(),
      clickLink: sinon.spy(),
      fillIn: sinon.spy(),
    }
    dave = await Actor({ browser }, Perspective())
  })

  context('an interaction with no parameters', () => {
    const Interactions = interactions({
      LogIn: action(({ browser }) => browser.click('log in')),
    })

    it('can be attempted by an actor', async () => {
      await dave.attemptsTo(Interactions.LogIn)
      sinon.assert.called(browser.click)
    })

    it('has a description', () => {
      assert.equal(Interactions.LogIn.description, 'Log in')
    })
  })

  context('an interaction with a parameter', () => {
    const Interactions = interactions({
      Click: {
        button: text => action(({ browser }) => browser.clickButton(text)),
      },
    })

    it('can be attempted by an actor', async () => {
      await dave.attemptsTo(Interactions.Click.button('log in'))
      sinon.assert.calledWith(browser.clickButton, 'log in')
    })

    it('has a description', () => {
      assert.equal(
        Interactions.Click.button('Log in').description,
        "Click button 'Log in'"
      )
    })
  })

  context('an interaction with different variants', () => {
    const Interactions = interactions({
      Click: {
        button: text => action(({ browser }) => browser.clickButton(text)),
        link: text => action(({ browser }) => browser.clickLink(text)),
      },
    })

    it('can be attempted by an actor', async () => {
      await dave.attemptsTo(Interactions.Click.button('log in'))
      sinon.assert.calledWith(browser.clickButton, 'log in')
      await dave.attemptsTo(Interactions.Click.link('log in'))
      sinon.assert.calledWith(browser.clickLink, 'log in')
    })

    it('has a description for each variant', () => {
      assert.equal(
        Interactions.Click.button('Log in').description,
        "Click button 'Log in'"
      )
    })
  })

  context('an interaction with several parameters', () => {
    const Interactions = interactions({
      FillIn: {
        field: name => ({
          with: text => action(({ browser }) => browser.fillIn(name, text)),
        }),
      },
    })

    it('can be attempted by an actor', async () => {
      await dave.attemptsTo(
        Interactions.FillIn.field('email').with('dave@example.com')
      )
      sinon.assert.calledWith(browser.fillIn, 'email', 'dave@example.com')
    })

    it('has a description', () => {
      assert.equal(
        Interactions.FillIn.field('email').with('dave@example.com').description,
        "Fill in field 'email' with 'dave@example.com'"
      )
    })
  })

  xcontext('giving feedback about mistakes', () => {
    const assertErrorMessageExactly = (block, expected) => {
      let err
      try {
        block()
      } catch (whatWasCaught) {
        err = whatWasCaught
      }
      assert.equal(err.message, expected)
    }

    context('an empty interaction set', () => {
      const Interactions = interactions({})

      it('throws a helpful error when you try to use an interaction', () => {
        assertErrorMessageExactly(
          () => Interactions.Click,
          `You haven't defined any interactions yet.

To define an interaction, do it something like this:

const { Click } = interactions(handle => ({
  Click: handle(({ // TODO: abilities }) => { // TODO: interact with your app })
}))`
        )
      })
    })

    context('an interaction with no parameters', () => {
      const Interactions = interactions({
        LogIn: action(() => {}),
      })

      it("throws a helpful error when you try to use another interaction that doesn't exist", () => {
        assertErrorMessageExactly(
          () => Interactions.Click,
          `The interaction 'Click' is not defined.

Here's the ones that are already defined:

* LogIn`
        )
      })
    })

    context('an interaction with a parameter', () => {
      const Interactions = interactions({
        Click: {
          button: () => action(() => {}),
        },
      })

      it("throws a helpful error when you try to use a factory method that doesn't exist", () => {
        assertErrorMessageExactly(
          () => Interactions.Click.link('log in'),
          `The factory method 'link' is not defined in 'Click'.

Here's the ones that are already defined:

* button`
        )
      })
    })

    context("a handler that's not a function", () => {
      it('throws a helpful error when you decleare the interaction', () => {
        assertErrorMessageExactly(
          () =>
            interactions({
              Click: {
                button: () => action({ weGot: 'confused ' }),
              },
            }),
          'A handler must be a function'
        )
      })
    })
  })
})

describe('defining tasks', () => {
  let db, dave

  beforeEach(async () => {
    db = {
      createUser: sinon.spy(),
    }
  })

  context('a task with no specialisation', () => {
    const { CreateUser } = tasks({
      CreateUser: task(),
    })

    beforeEach(async () => {
      dave = Actor(
        { db },
        Perspective('domain', handle => {
          handle(CreateUser, () => ({ db }) =>
            db.createUser({ name: 'default' })
          )
        })
      )
    })

    it('runs the perspective handler when attempted', async () => {
      await dave.attemptsTo(CreateUser())
      sinon.assert.calledWith(db.createUser, { name: 'default' })
    })

    it('has a description and id', () => {
      assert.equal(CreateUser.description, 'Create user')
      assert.equal(CreateUser.id, 'CreateUser')
    })
  })

  context('a task with one specialisation', () => {
    const { CreateUser } = tasks({
      CreateUser: {
        named: task('name'),
      },
    })

    beforeEach(async () => {
      dave = Actor(
        { db },
        Perspective('domain', handle => {
          handle(CreateUser.named, ({ name }) => ({ db }) => {
            db.createUser({ name })
          })
        })
      )
    })

    it('runs the perspective handler when attempted', async () => {
      await dave.attemptsTo(CreateUser.named('dave'))
      sinon.assert.calledWith(db.createUser, { name: 'dave' })
    })

    it('has a description and id', () => {
      assert.equal(
        CreateUser.named('dave').description,
        "Create user named 'dave'"
      )
      assert.equal(CreateUser.named('dave').id, 'CreateUser.named')
      assert.equal(CreateUser.named.id, 'CreateUser.named')
    })
  })

  context('a task with nested specialisations', () => {
    const { CreateUser } = tasks({
      CreateUser: {
        named: task('name', {
          aged: task('age'),
        }),
      },
    })

    beforeEach(async () => {
      dave = Actor(
        { db },
        Perspective('domain', handle => {
          handle(CreateUser.named.aged, ({ name, age }) => ({ db }) =>
            db.createUser({ name, age })
          )
          handle(CreateUser.named, ({ name }) => ({ db }) =>
            db.createUser({ name })
          )
        })
      )
    })

    it('has a description and id', () => {
      assert.equal(
        CreateUser.named('dave').aged(20).description,
        "Create user named 'dave' aged '20'"
      )
      assert.equal(
        CreateUser.named('dave').aged(20).id,
        'CreateUser.named.aged'
      )
      assert.equal(CreateUser.named.aged.id, 'CreateUser.named.aged')
    })

    it('attempts the deepest task', async () => {
      await dave.attemptsTo(CreateUser.named('dave').aged(30))
      sinon.assert.calledWith(db.createUser, { name: 'dave', age: 30 })
    })

    it('attempts the less deep task', async () => {
      await dave.attemptsTo(CreateUser.named('dave'))
      sinon.assert.calledWith(db.createUser, { name: 'dave' })
    })
  })
})

describe('defining questions', () => {
  const { TheUser } = questions({
    TheUser: question('the user', { firstName: question() }),
  })
  const dave = Actor(
    { ...Memory() },
    Perspective('domain', handle => {
      handle(TheUser.firstName, () => ({ recall }) => recall('the user name'))
    })
  )

  it('has a description and id', () => {
    assert.equal(TheUser.firstName().id, 'TheUser.firstName')
    assert.equal(TheUser.firstName().description, 'The user first name')
  })

  it('runs the perspective handler when asked for', async () => {
    await dave.attemptsTo(Remember.that('the user name').is('Dave'))
    await dave.asksFor(TheUser.firstName()).andVerify(userName => {
      assert.equal(userName, 'Dave')
    })
  })
})
