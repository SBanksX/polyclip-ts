const compareEvents = require('./compare-events')
const operationType = require('./operation')

const orderEvents = sortedEvents => {
  const resultEvents = []
  for (let i = 0; i < sortedEvents.length; i++) {
    let event = sortedEvents[i]
    if (
      (event.left && event.inResult) ||
      (!event.left && event.otherEvent.inResult)
    ) {
      resultEvents.push(event)
    }
  }
  // Due to overlapping edges the resultEvents array can be not wholly sorted
  var sorted = false
  while (!sorted) {
    sorted = true
    for (let i = 0, len = resultEvents.length; i < len; i++) {
      if (
        i + 1 < len &&
        compareEvents(resultEvents[i], resultEvents[i + 1]) === 1
      ) {
        const tmp = resultEvents[i]
        resultEvents[i] = resultEvents[i + 1]
        resultEvents[i + 1] = tmp
        sorted = false
      }
    }
  }

  for (let i = 0, len = resultEvents.length; i < len; i++) {
    let event = resultEvents[i]
    event.pos = i

    if (!event.left) {
      const tmp = event.pos
      event.pos = event.otherEvent.pos
      event.otherEvent.pos = tmp
    }
  }

  return resultEvents
}

const nextPos = (pos, resultEvents, processed, origIndex) => {
  let newPos = pos + 1
  if (newPos > resultEvents.length - 1) return pos - 1
  const p = resultEvents[pos].point
  let p1 = resultEvents[newPos].point

  // while in range and not the current one by value
  while (newPos < resultEvents.length && p1[0] === p[0] && p1[1] === p[1]) {
    if (!processed[newPos]) {
      return newPos
    } else {
      newPos++
    }
    p1 = resultEvents[newPos].point
  }

  newPos = pos - 1

  while (processed[newPos] && newPos >= origIndex) {
    newPos--
  }
  return newPos
}

const connectEdges = (sortedEvents, operation) => {
  const resultEvents = orderEvents(sortedEvents)

  // "false"-filled array
  const processed = {}
  const result = []

  for (let i = 0; i < resultEvents.length; i++) {
    if (processed[i]) continue
    var contour = [[]]

    if (!resultEvents[i].isExteriorRing) {
      if (
        operation === operationType.DIFFERENCE &&
        !resultEvents[i].isSubject &&
        result.length === 0
      ) {
        result.push(contour)
      } else if (result.length === 0) {
        result.push([[contour]])
      } else {
        result[result.length - 1].push(contour[0])
      }
    } else if (
      operation === operationType.DIFFERENCE &&
      !resultEvents[i].isSubject &&
      result.length > 1
    ) {
      result[result.length - 1].push(contour[0])
    } else {
      result.push(contour)
    }

    var ringId = result.length - 1
    var pos = i

    var initial = resultEvents[i].point
    contour[0].push(initial)

    let event
    while (pos >= i) {
      event = resultEvents[pos]
      processed[pos] = true

      if (event.left) {
        event.resultInOut = false
        event.contourId = ringId
      } else {
        event.otherEvent.resultInOut = true
        event.otherEvent.contourId = ringId
      }

      pos = event.pos
      processed[pos] = true
      contour[0].push(resultEvents[pos].point)
      pos = nextPos(pos, resultEvents, processed, i)
    }

    pos = pos === -1 ? i : pos

    event = resultEvents[pos]
    processed[pos] = processed[event.pos] = true
    event.otherEvent.resultInOut = true
    event.otherEvent.contourId = ringId
  }

  // Handle if the result is a polygon (eg not multipoly)
  // Commented it again, let's see what do we mean by that
  // if (result.length === 1) result = result[0];
  return result
}

module.exports = connectEdges
