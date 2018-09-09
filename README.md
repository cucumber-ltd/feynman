# Feynman

A library for helping you organise your JavaScript test automation code, inspired by the [screenplay pattern][screenplay].

What's lovely about screenplay, as opposed to other patterns for organising automation code like [page objects][page objects], is that you're building abstractions around behaviour, rather than solution implementation. We think you're going to like it.

Copared to other screenplay implementations we've seen, what's unique about Feynman is that you can define multiple *perspectives* that allow you to run the same tasks against your application in different ways.

More on that later.

We're going to assume you know little or nothing about the screenplay pattern and explain this from the ground up.

The first concept to grasp is an `Action`.

## Actions do stuff to your app

An action is a function that takes a set of named arguments, known as *abilities*, and uses them to do stuff to your app.

For example, you might use one to put stuff into a database:
```javascript
const createUser = ({ database }) => database.insert({ user: { username: 'matt' }})
```

Or you might use one to navigate through your UI:
```javascript
const visitLogin = ({ browser }) => browser.get("https://localhost:5000/login")
```

You don't have to, but it's idiomatic in screenplay to group actions together into little namespaces:
```javascript
const Visit = {
  login: ({ browser }) => browser.get("https://localhost:5000/login")
}
```

You'll see most of our examples, and the actions that come with this library, tend to use that style.

So where do these *abilities* come from? They come from the *Actor*.

## Actors perform actions using their abilities

Once you've defined your actions, you can ask an actor to attempt them:

```javascript
const { Actor } = require('feynman')
const { Follow, Click, FillIn } = require('./actions')
const browser = require('./create_browser')()

const abilities = { browser }
const actor = Actor(abilities)
actor.attemptsTo(
  Follow.link("log in"),
  FillIn.fieldLabelled("email").with("matt@example.com"),
  FillIn.fieldLabelled("password").with("password"),
  Click.on("Log in")
)
```

The whole set of abilities (in this case, just the `browser`) is passed to each action when it's attempted. The action
can just destructure the abilities it needs to do its work.

There is one more ability too, which is where this pattern starts to get its power.

## Actions are composable

Actions are *composable* because they're also passed the actor as another ability, so you can tell them to perform more 
actions:

```javascript
const LogIn = {
  as: email => ({ actor, browser }) => {
    actor.attemptsTo(
      Follow.link("log in"),
      FillIn.fieldLabelled("email").with(email),
      FillIn.fieldLabelled("password").with("password"),
      Click.on("Log in")
    )
  }
}

const actor = Actor(abilities)
actor.attemptsTo(LogIn.as("matt@example.com"))
```

This allows you to build up higher-level behaviours out of granular actions.

If you want your [acceptance tests to run fast](https://www.youtube.com/watch?v=Fk4rCn4YLLU), you often want to be able to exercise the same behaviour through different levels in your stack.

That's where *perspectives* come in.

## Actors can take different perspectives

.... TODO

```javascript
const { Book, CancelRoom, CurrentBookings } = require('./tasks')
const throughTheDomain = new DomainPerspective()
const throughTheWebApp = new WebAppPerspective()

const Book = Tasks(Book => {
  Book.aRoom
  Book.aFlight = destination => ???
  Book.aHoliday = destination => ???
})

const Book = { 
  aRoom: 'book-a-room-123',
  aFlight: 'la ala la',
}

const globalPerspecive = definePerspective(() => {
  action(Book.aHoliday, destination => ({actor}) => actor.attemptsTo(Book.aRoom, Book.aFlight(destination)))
})

const domainPerspective = definePerspective(() => {
  action(Book.aRoom, ({domain, state}) => {
    domain.bookARoom(state.get('email'))
  })
  action(Book.aFlight, destination => ({domain}) => {
    domain.bookAFlight(destination)
  })
})






// interacting tasks (i.e. interactions? or are interations the methods called in those low-level tasks?)
const BookARoom = roomNumber => ({ type: 'BookARoom', roomNumber })
const BookAFlight = flightNumber => ({ type: 'BookAFlight', flightNumber })
// high order tasks
const BookAHoliday = (roomNumber, flightNumber) => ({
  type: 'BookAHoliday',
  roomNumber,
  flightNumber,
})
const handleBookAHoliday = [BookARoom, BookAFlight]
domainPerspective.handle(BookARoom, (actor, action, { domain }) =>
  domain.bookRoom(action.roomNumber)
)
webbAppPerspective.handle(BookARoom, (actor, action, { browser }) =>
  browser.go(`http://blah/${action.roomNumber}`)
)

domainPerspective.handle(BookAHoliday, handleBookAHoliday)
webbAppPerspective.handle(BookAHoliday, handleBookAHoliday)
// last two lines can be rewritten with a helper as:
handleInPerspectives(
  BookAHoliday,
  [domainPerspective, webbAppPerspective],
  (actor, { roomNumber, flightNumber }) =>
    actor.attempsTo(BookARoom(roomNumber), BookAFlight(flightNumber))
)

const Actor = (perspective, abilities) => {
  attemptsTo: (action) => {
    perspective.lookUpHandler(action.type)(...)
  }
} 

Given('Joe has booked a hotel room', async () => {
  const joe = Actor()
  throughTheDomain(joe).attemptsTo(
    Book.aRoom
  )
})

When('Joe cancels his hotel room', async () => {
  const joe = Actor()
  throughTheWebApp(joe).attemptsTo(
    CancelRoom.bookedBy(joe)
  )
})

Then('Joe should have no bookings', async () => {
  const joe = Actor()

  throughTheWebApp(joe).attemptsTo(
    AssertThat(CurrentBookings.areEmpty)
  )
  // ==
  throughTheWebApp(joe).checksThat(
    CurrentBookings.areEmpty
  )
})


// TODO: map the Book.aRoom task to these lower level tasks to show that tasks are composable
//    Login.withValidCredentials,
//    SearchForRoom.availableWithinNextTwoWeeks
//    BookRoom.fromFirstSearchResult
```

## Puzzles

- we don't quite now how to express assertions
  - do we just want to use attemptsTo and have commands that have assertions? This might make reporting harder later?
- is having namespaces for questions important?
- do we even need questions
- do we say checks or asserts

[screenplay]: https://ideas.riverglide.com/page-objects-refactored-12ec3541990
[page objects]: https://martinfowler.com/bliki/PageObject.html
