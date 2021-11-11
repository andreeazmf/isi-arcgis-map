# Course: Information System Integration - Laboratory 5

## Task 1
Implemented routing between 3 points: origin &#8594; stop &#8594; destination.\
It can also work just for 2 points if _stop is equal to origin_ or
_stop is equal to destination_.\
Followed tutorial:
https://developers.arcgis.com/documentation/mapping-apis-and-services/routing/routing/

Route: Beverly Hills &#8594; Long Beach\
<img src="https://github.com/andreeazmf/isi-arcgis-map/blob/master/demo_images/route_two_points.png" width="70%" height="70%"/>

Route: Inglewood &#8594; Anaheim &#8594; El Monte\
<img src="https://github.com/andreeazmf/isi-arcgis-map/blob/master/demo_images/route_three_points.png" width="70%" height="70%"/>

## Task 2
Saved the animated point coordinated in the Firebase Realtime Database.\
As it's continuously changing its position, I created a new function
`addUpdatingItem()` to only set the firebase object, not add it as a
new element to a list each time.

<img src="https://github.com/andreeazmf/isi-arcgis-map/blob/master/demo_images/updating_point_db.gif" width="70%" height="70%"/>
