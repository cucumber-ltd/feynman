# Feynman

A library for helping you organise your JavaScript test automation code, inspired by the [screenplay pattern][screenplay].

Feynman is designed to make it simple to run the same tasks at different levels of your stack.

Here's an example:

```javascript
const { Book, CancelRoom, CurrentBookings } = require('TODO')
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
