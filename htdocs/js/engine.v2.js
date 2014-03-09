'use strict'
//
// HELPER FUNCTION //
//========================================================================================
Array.prototype.clear = function()  //Add a new method to the Array Object
{ this.length = 0; };
//========================================================================================



function EngineV2(){
    var CHANNEL         = [2412,2417,2422,2427,2432,2437,2442,2447,2452,2457,2462];
    var CHCOLLOR        = ["#0B610B","#0B4C5F","#58ACFA","#FF00BF","#FF4000","#FFBF00","#BF00FF","#4000FF","#0080FF","#5882FA","#F5A9A9"];

//    var EMITTERS = [    { name: 'AA1', latlng: new google.maps.LatLng(46.5015708,30.3305385), freq: 2412, dgain: 8, again: 8 },
//                        { name: 'AA2', latlng: new google.maps.LatLng(46.5025708,30.3315385), freq: 2442, dgain: 8, again: 8 },
//                        { name: 'AA3', latlng: new google.maps.LatLng(46.5036708,30.3325385), freq: 2442, dgain: 8, again: 8 },
//                        { name: 'AA4', latlng: new google.maps.LatLng(46.5047708,30.3335385), freq: 2442, dgain: 8, again: 8 },
//                        { name: 'AA5', latlng: new google.maps.LatLng(46.5057708,30.3345385), freq: 2442, dgain: 8, again: 8 },
////                            { name: 'AA6', latlng: new google.maps.LatLng(46.5067708,30.3355385), freq: 2442, dgain: 8, again: 8 },
////                            { name: 'AA7', latlng: new google.maps.LatLng(46.5077708,30.3365385), freq: 2442, dgain: 8, again: 8 },
//                        { name: 'AA8', latlng: new google.maps.LatLng(46.5088708,30.3375385), freq: 2462, dgain: 8, again: 8 }
//                    ];

    var EMITTERS        = [];

    var WORKERS         = [];
    var TOTALCALC       = [];
    var LASTCALC        = 0;

    var GMAP            = null;
    var GMAP_MARKERS    = [];
    var GMAP_CIRCLE     = [];
    var TMP_COORD       = null;
    var TIMER           = 0;


    this.init = function(){
        google.maps.visualRefresh = true;

        var mapOptions = { zoom: 16, center: new google.maps.LatLng(46.5045708,30.3305385), mapTypeId: google.maps.MapTypeId.HYBRID, draggableCursor: 'crosshair'};
        GMAP = new google.maps.Map(document.getElementById('google-container-id'),mapOptions);

        google.maps.event.addListener(GMAP, 'click', onMapMouseClick);

        // MOUSE MOVE FUNTION //
        google.maps.event.addListener(GMAP, 'mousemove', function(event){
            $("#gmap-position").text("coord: " + event.latLng.lat().toFixed(4) + "," + event.latLng.lng().toFixed(4));
        });

        //mouseover

        // gmap-position

        $("#bnt-calculate").click(calculate);
//        $("#bnt-genfreq").click(conGenerateFreq);
//        $("#bnt-genfield").click(genField);
//
        $("#bnt-create-ap").click(onCreateEmitter);

//        console.log(g2channel);
//        console.log(accesspoints);
    };

    // On GMap mouse click //
    function onMapMouseClick(event){
        TMP_COORD = event.latLng;

        $('#input-name').val(Math.random().toString(16).substr(2,6).toUpperCase());
        $("#span-dev-coordinate").text(event.latLng.lat().toFixed(4) + "," + event.latLng.lng().toFixed(4));
        $('#modal-add-ap').modal('show');
    }

    function onCreateEmitter(event){
        $('#modal-add-ap').modal('hide');

        var name    = $('#input-name').val();
        var latlng  = new google.maps.LatLng(TMP_COORD.lat(),TMP_COORD.lng());
        var dgain   = parseInt($('#input-devgain').val());
        var again   = parseInt($('#input-antgain').val())

        EMITTERS.push({name: name, latlng: latlng, freq: 2412, dgain: dgain, again: again});
        showMarkers();
    }

    function toogleCalcBtn(){
        $("#bnt-calculate").toggleClass("disabled");
    }

    function calculate(event){

        // init workes //
        WORKERS.clear();
        TOTALCALC.clear();

        WORKERS = [];
        TIMER = new Date().getTime();

        // DISABLED //
        toogleCalcBtn();


        CHANNEL.forEach(function(freq){
            EMITTERS[0].freq = freq;

            // ADD WORKERS //
            var ant = new Worker('js/eworker.js');

            // On success calc //
            ant.onmessage = function(msg){
                console.log("Worker finish! Add result.");

                msg.data.data.forEach(function(elm){
                    TOTALCALC.push(elm);
                });

            };

            // ADD WORK //
            ant.postMessage({cmd:'start',data:EMITTERS});

            WORKERS.push(ant);
        });


        var intrvl = setInterval(function(){
            if(LASTCALC !== TOTALCALC.length){
                LASTCALC = TOTALCALC.length;

                // SORT
                TOTALCALC.sort(function(a,b){ return a.mwt - b.mwt; });

                setBestResult();

                showMarkers();
            }


            if(TOTALCALC.length >= 110) {
                console.clear();

                console.warn("Timer: " + ((new Date().getTime() - TIMER)/1000).toFixed(2) + " sec.");

                clearInterval(intrvl);

                TOTALCALC = TOTALCALC.slice(0,4);

                TOTALCALC.forEach(function(elm){
                    console.log("mW: " + elm.mwt + " dBm: " + elm.dbm);

                    elm.emitters.forEach(function(emtr){
                        console.log("\t" + JSON.stringify(emtr));
                    })

                });

                console.warn("Finish!");

                // ENABLED //
                toogleCalcBtn();
            }

        },500);

    }

    function setBestResult(){
        if(TOTALCALC.length > 0){
            var best = TOTALCALC[0].emitters;

            best.forEach(function(bestemtr){
                EMITTERS.forEach(function(emtr){
                    if(bestemtr.name === emtr.name){
                        emtr.freq = bestemtr.freq;
                    }
                })
            })
        }
    }

    function showMarkers(){

        // CLEAR MARKERS //
        clearMarkers();

        EMITTERS.forEach(function(emitter){
            var market = new google.maps.Marker({ position: emitter.latlng, map: GMAP, title:emitter.name + " - " + emitter.freq + " Mhz"});
            var circle = new google.maps.Circle({ center:emitter.latlng, map:GMAP, radius:60, fillColor: getColor(emitter.freq), clickable:false, draggable:false, editable:false});

            GMAP_MARKERS.push(market);
            GMAP_CIRCLE.push(circle);
        });
    }

    function clearMarkers(){
        GMAP_MARKERS.forEach(function(elm){ elm.setMap(null); });
        GMAP_CIRCLE.forEach(function(elm){ elm.setMap(null); });
    }

    function getColor(freq){

        for(var i=0; i<CHANNEL.length; i++){
            if(freq === CHANNEL[i]){
                return CHCOLLOR[i];
            }
        }

        return "#FFFFFF";
    }

}

// INIT VAR //
var cEngine = new  EngineV2();

// ON DOM READY //
$(document).ready(function(){
    cEngine.init();
});
