"use strict"

const assert = require('assert')
const sinon = require("sinon")
const { Perspective, Actor, makeAction } = require("./feynman")

describe("feynman", () => {
  context("handling actions through perspectives", () => {
    it("attempts an action with no parameters", async () => {
      const browser = {
        refresh: sinon.spy()
      }
      const abilities = { browser }
      const Refresh = { browser: makeAction() }
      const perspective = Perspective(handle => {
        handle(Refresh.browser, () => ({ browser }) => browser.refresh())
      })
      const joe = Actor(perspective, abilities)
      await joe.attemptsTo(Refresh.browser)
      sinon.assert.called(browser.refresh)
    })

    it("attempts an action with a single parameter", async () => {
      const browser = {
        clickOn: sinon.spy()
      }
      const abilities = { browser }
      const ClickOn = { button: makeAction() }

      const perspective = Perspective(handle => {
        handle(ClickOn.button, text => ({ browser }) => browser.clickOn(text))
      })
      const joe = Actor(perspective, abilities)
      await joe.attemptsTo(ClickOn.button("Book now"))
      sinon.assert.calledWith(browser.clickOn, "Book now")
    })

    it("attempts an action with named parameters", async () => {
      const browser = {
        fillIn: sinon.spy()
      }
      const abilities = { browser }
      const FillIn = { label: makeAction() }
      const perspective = Perspective(handle => {
        handle(FillIn.label, ({ name, with: text }) => ({ browser }) =>
          browser.fillIn(name, text)
        )
      })
      const joe = Actor(perspective, abilities)
      await joe.attemptsTo(
        FillIn.label({ name: "email", with: "joe@example.com" })
      )
      sinon.assert.calledWith(browser.fillIn, "email", "joe@example.com")
    })
  })

  context("with multiple perspectives", () => {
    const Book = {
      aHoliday: destination => ({ actor }) =>
        actor.attemptsTo(Book.aRoom, Book.aFlight(destination)),
      aRoom: makeAction(),
      aFlight: makeAction()
    }

    const DomainPerspective = Perspective(handle => {
      handle(Book.aRoom, () => ({ state, domain }) =>
        domain.bookRoom({ email: state.get("email") })
      )
      handle(Book.aFlight, destination => ({ domain }) =>
        domain.bookFlight(destination)
      )
    })

    const WebAppPerspective = Perspective(handle => {
      const FillIn = {
        field: ({ name }) => ({
          with: text => ({ browser }) => browser.fillIn(name, text)
        })
      }
      const Click = {
        on: text => ({ browser }) => browser.clickOn(text)
      }
      handle(Book.aRoom, () => ({ actor, state }) => {
        actor.attemptsTo(
          FillIn.field({ name: "Email" }).with(state.get("email")),
          Click.on("Book Room")
        )
      })
    })

    it("allows actors attempt the same action from different perspectives", async () => {
      const domain = {
        bookRoom: sinon.spy()
      }
      const browser = {
        clickOn: sinon.spy(),
        fillIn: sinon.spy()
      }
      const state = new Map([["email", "joe@example.com"]])
      const domainJoe = Actor(DomainPerspective, { domain, state })
      const webAppJoe = Actor(WebAppPerspective, {
        browser,
        state
      })
      await domainJoe.attemptsTo(Book.aRoom)
      await webAppJoe.attemptsTo(Book.aRoom)
      sinon.assert.calledWith(domain.bookRoom, { email: "joe@example.com" })
      sinon.assert.calledWith(browser.fillIn, "Email", "joe@example.com")
      sinon.assert.calledWith(browser.clickOn, "Book Room")
    })

    it("runs higher order tasks", async () => {
      const domain = {
        bookRoom: sinon.spy(),
        bookFlight: sinon.spy()
      }
      const state = new Map([["email", "joe@example.com"]])
      const joe = Actor(DomainPerspective, { domain, state })
      await joe.attemptsTo(Book.aHoliday("Barbados"))
      sinon.assert.calledWith(domain.bookFlight, "Barbados")
      sinon.assert.calledWith(domain.bookRoom, { email: "joe@example.com" })
    })
  })

  it("waits for async perspective actions to complete", async () => {
    const saveSomething = makeAction()
    const db = {
      insert: sinon.spy()
    }
    const perspective = Perspective(handle => {
      handle(saveSomething, () => ({ db }) =>
        new Promise(resolve =>
          setTimeout(() => {
            db.insert()
            resolve()
          }, 1)
        )
      )
    })
    const joe = Actor(perspective, { db })
    await joe.attemptsTo(saveSomething)
    sinon.assert.called(db.insert)
  })

  it("waits for async interactions to complete", async () => {
    const db = {
      insert: sinon.spy()
    }
    const saveSomething = ({ db }) =>
      new Promise(resolve =>
        setTimeout(() => {
          db.insert()
          resolve()
        }, 1)
      )
    const joe = Actor({}, { db })
    await joe.attemptsTo(saveSomething)
    sinon.assert.called(db.insert)
  })

  xit("gives a decent error when you attempt to do an action that doesn't have a corresponding handler", async () => {
    const doSomething = makeAction()
    const perspective = Perspective(handle => {})
    const joe = Actor(perspective, {})
    let error
    try {
      await joe.attemptsTo(doSomething)
    } catch (e) {
      error = e
    }
    assert.equal(error, /Yo/)
  })
})
