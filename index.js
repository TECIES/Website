// OTP generator for Map


var fourdigitsrandom
function generateOTP() {
    fourdigitsrandom = Math.floor(1000 + Math.random() * 9000);
    var tokenDisplay = document.getElementById("tokenDisplay");
    tokenDisplay.value = fourdigitsrandom;

    // firebase.database().ref().child("Users").push().set({
    //     OTP: fourdigitsrandom
    // });

    console.log(fourdigitsrandom);

    alert("OTP expires in exactly 3 minutes");

    sessionStorage.setItem("OTP", fourdigitsrandom)

    var status = document.getElementById('btnToken');
    status.disabled = true;

    setTimeout(toggle, 180000);

    function toggle() {
        if (status.disabled == true) {
            status.disabled = false;
        }
    }


};



// Mapbox Api 

mapboxgl.accessToken = 'pk.eyJ1IjoiZGVzbW9uZG1pbGVzNjkiLCJhIjoiY2tkb2RqOG5wMDNubDJ0b2RlbGt0NTVjdCJ9.i4KPah6AnqIxbTwhgUeyTg';
var instructions = document.getElementById('instructions');
var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/streets-v9', //hosted style id
    center: [92.9376, 26.2006], // starting position
    zoom: 7 // starting zoom
});
//  geocoder here
var geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    // limit results to Assam
    //country: 'IN',
});

// After the map style has loaded on the page, add a source layer and default
// styling for a single point.
map.on('load', function () {
    // Listen for the `result` event from the MapboxGeocoder that is triggered when a user
    // makes a selection and add a symbol that matches the result.
    geocoder.on('result', function (ev) {
        console.log(ev.result.center);

    });
});
var draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
        line_string: true,
        trash: true
    },
    styles: [
        // ACTIVE (being drawn)
        // line stroke
        {
            "id": "gl-draw-line",
            "type": "line",
            "filter": ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
            "layout": {
                "line-cap": "round",
                "line-join": "round"
            },
            "paint": {
                "line-color": "#8B4513",
                "line-dasharray": [0.2, 2],
                "line-width": 4,
                "line-opacity": 0.7
            }
        },
        // vertex point halos
        {
            "id": "gl-draw-polygon-and-line-vertex-halo-active",
            "type": "circle",
            "filter": ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
            "paint": {
                "circle-radius": 10,
                "circle-color": "#FFF"
            }
        },
        // vertex points
        {
            "id": "gl-draw-polygon-and-line-vertex-active",
            "type": "circle",
            "filter": ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
            "paint": {
                "circle-radius": 6,
                "circle-color": "#3b9ddd",
            }
        },
    ]
});
// add the draw tool to the map
map.addControl(draw);

// add create, update, or delete actions
map.on('draw.create', updateRoute);
map.on('draw.update', updateRoute);
map.on('draw.delete', removeRoute);

// use the coordinates you just drew to make your directions request
function updateRoute() {
    removeRoute(); // overwrite any existing layers
    var data = draw.getAll();
    var lastFeature = data.features.length - 1;
    var coords = data.features[lastFeature].geometry.coordinates;
    var newCoords = coords.join(';');
    getMatch(newCoords);
}

var coords;
var currentUser;
function getMatch(e) {
    var url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + e
        + '?geometries=geojson&steps=true&access_token=' + mapboxgl.accessToken;
    var req = new XMLHttpRequest();
    req.responseType = 'json';
    req.open('GET', url, true);
    req.onload = function () {
        var jsonResponse = req.response;
        var distance = jsonResponse.routes[0].distance * 0.001;
        var duration = jsonResponse.routes[0].duration / 60;
        var steps = jsonResponse.routes[0].legs[0].steps;
        coords = jsonResponse.routes[0].geometry;
        //  console.log(steps);
        console.log(coords);

        if (checkOTP(fourdigitsrandom)) {
            firebase.database().ref().child("Users").push().set({

                OTP: fourdigitsrandom,
                coordinates: coords,
            });
        }

        //  console.log(distance);
        // console.log(duration);

        // get route directions on load map
        steps.forEach(function (step) {
            instructions.insertAdjacentHTML('beforeend', '<p>' + step.maneuver.instruction + '</p>');
        });
        // get distance and duration
        instructions.insertAdjacentHTML('beforeend', '<p>' + 'Distance: ' + distance.toFixed(2) + ' km<br>Duration: ' + duration.toFixed(2) + ' minutes' + '</p>');

        // add the route to the map
        addRoute(coords);
        //  console.log(coordinates);

    };
    req.send();
}

// adds the route as a layer on the map
function addRoute(coords) {
    // check if the route is already loaded
    if (map.getSource('route')) {
        map.removeLayer('route');
        map.removeSource('route')
    } else {
        map.addLayer({
            "id": "route",
            "type": "line",
            "source": {
                "type": "geojson",
                "data": {
                    "type": "Feature",
                    "properties": {},
                    "geometry": coords
                }
            },
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                "line-color": "#1db7dd",
                "line-width": 8,
                "line-opacity": 0.8
            }
        });
    };
}

// remove the layer if it exists
function removeRoute() {
    if (map.getSource('route')) {
        map.removeLayer('route');
        map.removeSource('route');
        instructions.innerHTML = '';
    } else {
        return;
    }
}

function checkOTP(otp) {
    var validOtp = true
    rootRef = firebase.database().ref().child("Users")
    rootRef.on("child_added", (data) => {
        var token = data.child("OTP").val()

        if (token != otp){
            validOtp = true
            console.log("Valid OTP")
        }
        else{
            validOtp = false
            console.log("OTP is already in use")
        }
    })

    return validOtp
}
document.getElementById('geocoder').appendChild(geocoder.onAdd(map));
