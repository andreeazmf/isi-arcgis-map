# Course: Information System Integration - Laboratory 5

## Task 1
Implemented routing between 3 points: origin -> stop -> destination.\
It can also work just for 2 points if _stop is equal to origin_ or
_stop is equal to destination_.\
Followed tutorial:
https://developers.arcgis.com/documentation/mapping-apis-and-services/routing/routing/

## Task 2
Saved the animated point coordinated in the Firebase Realtime Database.\
As it's continuously changing its position, I created a new function
`addUpdatingItem()` to only set the firebase object, not add it as a
new element to a list each time.
