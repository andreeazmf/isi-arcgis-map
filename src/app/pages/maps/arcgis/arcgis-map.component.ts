import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { setDefaultOptions, loadModules } from 'esri-loader';
import { Subscription } from "rxjs";
import { ITestItem } from "../../../@core/database/firebase";
// import { FirebaseMockService } from "../../../@core/database/firebase-mock";
import { FirebaseService } from "../../../@core/database/firebase";

@Component({
    selector: "app-esri-map",
    templateUrl: "./arcgis-map.component.html",
    styleUrls: ["./arcgis-map.component.scss"]
})
export class ArcGISMapComponent implements OnInit, OnDestroy {
    // The <div> where we will place the map
    @ViewChild("mapViewNode", { static: true }) private mapViewEl: ElementRef;
    view: __esri.MapView;
    timeoutHandler = null;

    _apiKey = "AAPKf011d888c80f41089ad402898481e915n2A18VMfnXgcQ9neYJc2_DcEEsV3YW-Zk6yTvu1bN2iQFuGmt7wUwJib5E7fi5ry"

    _Map;
    _MapView;
    _FeatureLayer;
    _Graphic;
    _GraphicsLayer;
    _Point;
    _route;
    _RouteParameters;
    _FeatureSet;
    _esriConfig;

    routeUrl;
    routeParameters;
    directionsElement;

    map: __esri.Map;
    pointGraphic: __esri.Graphic;
    graphicsLayer: __esri.GraphicsLayer;

    pointCoords: number[] = [-118.73682450024377, 34.07817583063242];
    dir: number = 0;
    count: number = 0;

    center;
    origin;
    stop;
    destination;

    subscriptionList: Subscription;
    subscriptionObj: Subscription;

    isConnected: boolean = false;

    constructor(
        private fbs: FirebaseService
        // private fbs: FirebaseMockService
    ) { }

    connectFirebase() {
        if (this.isConnected) {
            return;
        }
        this.isConnected = true;
        this.fbs.connectToDatabase();
        this.subscriptionList = this.fbs.getChangeFeedList().subscribe((items: ITestItem[]) => {
            console.log("got new items from list: ", items);
        });
        this.subscriptionObj = this.fbs.getChangeFeedObj().subscribe((stat: ITestItem[]) => {
            console.log("item updated from object: ", stat);
        });
    }

    addTestItem() {
        this.fbs.addTestItem();
    }

    addUpdatingItem(itemName, itemLat, itemLng) {
        this.fbs.addUpdatingItem(itemName, itemLat, itemLng);
    }

    disconnectFirebase() {
        if (this.subscriptionList != null) {
            this.subscriptionList.unsubscribe();
        }
        if (this.subscriptionObj != null) {
            this.subscriptionObj.unsubscribe();
        }
    }

    async initializeMap() {
        try {

            // Before loading the modules for the first time, also lazy load
            // the CSS for the version of the script that you're loading from the CDN.
            // The default Arcgis verson is 4.17 and it doesn't support some
            // components, so change it to one above 4.20.
            setDefaultOptions({ css: true, version: "4.21" });

            // Load the modules for the ArcGIS API for JavaScript
            const [Map, MapView, FeatureLayer, Graphic, GraphicsLayer,
                Point, route, RouteParameters, FeatureSet, esriConfig] = await loadModules([
                    "esri/Map",
                    "esri/views/MapView",
                    "esri/layers/FeatureLayer",
                    "esri/Graphic",
                    "esri/layers/GraphicsLayer",
                    "esri/geometry/Point",
                    "esri/rest/route",
                    "esri/rest/support/RouteParameters",
                    "esri/rest/support/FeatureSet",
                    "esri/config"
                ]);

            this._Map = Map;
            this._MapView = MapView;
            this._FeatureLayer = FeatureLayer;
            this._Graphic = Graphic;
            this._GraphicsLayer = GraphicsLayer;
            this._Point = Point;
            this._route = route;
            this._RouteParameters = RouteParameters;
            this._FeatureSet = FeatureSet;
            this._esriConfig = esriConfig;

            this._esriConfig.apiKey = this._apiKey;

            // Configure the Map
            const mapProperties = {
                basemap: "streets-vector"
            };

            // Initial routing points
            this.initPoints();

            this.map = new Map(mapProperties);

            this.addFeatureLayers();
            this.addPoint(this.pointCoords[1], this.pointCoords[0]);

            // Initialize the MapView
            const mapViewProperties = {
                container: this.mapViewEl.nativeElement,
                // center: [-118.73682450024377, 34.07817583063242],
                center: this.center,
                zoom: 10,
                map: this.map
            };

            this.view = new MapView(mapViewProperties);

            // Fires `pointer-move` event when user clicks on "Shift"
            // key and moves the pointer on the view.
            this.view.on('pointer-move', ["Shift"], (event) => {
                let point = this.view.toMap({ x: event.x, y: event.y });
                console.log("map moved: ", point.longitude, point.latitude);
            });

            // Without routing:
            // await this.view.when(); // wait for map to load

            // With routing:
            await this.view.when(() => {
                this.addGraphic("start", this.origin);
                this.addGraphic("stop", this.stop);
                this.addGraphic("finish", this.destination);
                this.getRoute();
            });

            // Click to select 3 points (start -> stop -> finish) and get routes
            this.view.on("click", (event) => {
                if (this.view.graphics.length === 0) {
                    this.addGraphic("start", event.mapPoint);
                } else if (this.view.graphics.length === 1) {
                    this.addGraphic("stop", event.mapPoint);
                } else if (this.view.graphics.length === 2) {
                    this.addGraphic("finish", event.mapPoint);
                    this.getRoute();
                } else {
                    this.view.graphics.removeAll();
                    this.view.ui.empty("top-right");
                    this.addGraphic("start", event.mapPoint);
                }
            });

            console.log("ArcGIS map loaded");
            return this.view;
        } catch (error) {
            console.error("EsriLoader: ", error);
            throw error;
        }
    }

    initPoints() {
        const coordBeverlyHills = [-118.400352, 34.073620];
        const coordLongBeach = [-118.193741, 33.770050];

        // Initial center of the map view
        this.center = new this._Point(coordBeverlyHills);

        // Initial origin of route
        this.origin = new this._Point(coordBeverlyHills);

        // Initial stop of route
        this.stop =  new this._Point(coordLongBeach);

        // Initial destination of route
        this.destination = new this._Point(coordLongBeach);
    }

    addFeatureLayers() {
        // Trailheads feature layer (points)
        var trailheadsLayer: __esri.FeatureLayer = new this._FeatureLayer({
            url:
                "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trailheads/FeatureServer/0"
        });

        this.map.add(trailheadsLayer);


        // Trails feature layer (lines)
        var trailsLayer: __esri.FeatureLayer = new this._FeatureLayer({
            url:
                "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trails/FeatureServer/0"
        });

        this.map.add(trailsLayer, 0);

        // Parks and open spaces (polygons)
        var parksLayer: __esri.FeatureLayer = new this._FeatureLayer({
            url:
                "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Parks_and_Open_Space/FeatureServer/0"
        });

        this.map.add(parksLayer, 0);

        console.log("feature layers added");
    }

    addPoint(lat: number, lng: number) {
        this.graphicsLayer = new this._GraphicsLayer();
        this.map.add(this.graphicsLayer);
        const point = { //Create a point
            type: "point",
            longitude: lng,
            latitude: lat
        };
        const simpleMarkerSymbol = {
            type: "simple-marker",
            color: [226, 119, 40],  // Orange
            outline: {
                color: [255, 255, 255], // White
                width: 1
            }
        };
        this.pointGraphic = new this._Graphic({
            geometry: point,
            symbol: simpleMarkerSymbol
        });
        this.graphicsLayer.add(this.pointGraphic);
    }

    removePoint() {
        if (this.pointGraphic != null) {
            this.graphicsLayer.remove(this.pointGraphic);
        }
    }

    runTimer() {
        this.timeoutHandler = setTimeout(() => {
            // code to execute continuously until the view is closed
            // ...
            this.animatePointDemo();
            this.runTimer();
        }, 200);
    }

    animatePointDemo() {
        this.removePoint();
        switch (this.dir) {
            case 0:
                this.pointCoords[1] += 0.01;
                break;
            case 1:
                this.pointCoords[0] += 0.02;
                break;
            case 2:
                this.pointCoords[1] -= 0.01;
                break;
            case 3:
                this.pointCoords[0] -= 0.02;
                break;
        }

        this.count += 1;
        if (this.count >= 10) {
            this.count = 0;
            this.dir += 1;
            if (this.dir > 3) {
                this.dir = 0;
            }
        }

        this.addPoint(this.pointCoords[1], this.pointCoords[0]);

        // Save animated point coord into database
        this.addUpdatingItem('animated-point', this.pointCoords[1], this.pointCoords[0]);
    }

    stopTimer() {
        if (this.timeoutHandler != null) {
            clearTimeout(this.timeoutHandler);
            this.timeoutHandler = null;
        }

    }

    ngOnInit() {
        this.initializeMap().then(() => {
            this.runTimer();
        }).catch((err) => {
            console.error(err);
            alert("An error occured while loading the map");
        })
    }

    ngOnDestroy() {
        if (this.view) {
            // destroy the map view
            this.view.container = null;
        }
        this.stopTimer();
        this.disconnectFirebase();
    }

    addGraphic(type, point) {
        let color = "#ffffff";
        let outlineColor = "#000000"
        let size = "12px";
        if (type == "start") {
            color = "#ffffff";
        } else if (type == "stop") {
            color = "#000000";
            outlineColor = "#ffffff";
            size = "8px";
        } else {
            color = "#000000";
            outlineColor = "#ffffff";
        }
        const graphic = new this._Graphic({
            symbol: {
                type: "simple-marker",
                color: color,
                size: size,
                outline: {
                    color: outlineColor,
                    width: "1px"
                }
            },
            geometry: point
        });
        this.view.graphics.add(graphic);
    }

    getRoute() {
        this.routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

        this.routeParameters = new this._RouteParameters({
            stops: new this._FeatureSet({
                features: this.view.graphics.toArray()
            }),
            returnDirections: true,
            directionsLanguage: "en"
        });

        this._route.solve(this.routeUrl, this.routeParameters)
            .then((data) => {
                if (data.routeResults.length > 0) {
                    this.showRoute(data.routeResults[0].route);
                    this.showDirections(data.routeResults[0].directions.features);
                }
            })
            .catch((error) => {
                console.log(error);
            })
    }

    showRoute(routeResult) {
        routeResult.symbol = {
            type: "simple-line",
            color: [5, 150, 255],
            width: 3
        };
        this.view.graphics.add(routeResult, 0);
    }

    showDirections(directions) {
        this.directionsElement = document.createElement("div");
        this.directionsElement.innerHTML = "<h3>Directions</h3>";
        this.directionsElement.classList = "esri-widget esri-widget--panel esri-directions__scroller directions";
        this.directionsElement.style.marginTop = "0";
        this.directionsElement.style.padding = "0 15px";
        this.directionsElement.style.minHeight = "365px";

        this.showRouteDirections(directions);

        this.view.ui.empty("top-right");
        this.view.ui.add(this.directionsElement, "top-right");
    }

    showRouteDirections(directions) {
        const directionsList = document.createElement("ol");
        directions.forEach(function (result, i) {
            const direction = document.createElement("li");
            direction.innerHTML = result.attributes.text + ((result.attributes.length > 0) ? " (" + result.attributes.length.toFixed(2) + " miles)" : "");
            directionsList.appendChild(direction);
        });
        this.directionsElement.appendChild(directionsList);
    }
}