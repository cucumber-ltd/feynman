# Feynman

A library for helping you organise your JavaScript test automation code, inspired by the [screenplay pattern][screenplay].

What's unique about feynman is that you can define multiple *perspectives* that allow you to run the same tasks against your
application in different ways. More on that later.

It starts with the `Actor`

## Actors perform actions using their abilities

At its most basic, you give an `Actor` some `Abilities` and then tell them to perform some `Actions`:

```
const { Actor } = require('feynman')

const abilities = { console }
const Write = {
  message: text => ({ console }) => console.log(text),
  error: text => ({ console }) => console.error(text)
}

const actor = Actor(abilities)
actor.attemptsTo(
  Write.message("Hello world"),
  Write.error("eek!")
)
```

The whole set of abilities (in this case, just the `console`) is passed to each action handler function when it's attempted. The action
handler can just pick out the abilities it needs to do its work.

So what's the point? Well, by definining your test automation code as these little actions, you can compose them together into
higher-level abstractions.

## Actions are composable

Actions are *composable* because they're also passed the actor, so you can tell them to perform more actions:

```
const { Actor } = require('feynman')

const abilities = { console }
const Write = {
  message: text => ({ console }) => console.log(text)
}

const Sing {
  song: ({ actor }) =>
    actor.attemptsTo(
      Write.message("Three blind mice")
      Write.message("See how they run")
    )
  }
}

const actor = Actor(abilities)
actor.attemptsTo(Sing.song())
```

This allows you to build up higher-level behaviours out of granular actions.

## Actors can take different perspectives

If you want your [acceptance tests to run fast](https://www.youtube.com/watch?v=Fk4rCn4YLLU), you often want to be able to exercise the same behaviour through different levels in your stack.

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
