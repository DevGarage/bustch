'use strict'

// HELPER FUNCTION /////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get noise between frequency of two access points //
function getDF(freqA, freqB) {
    switch (Math.abs(freqA - freqB)){
        case 0  : return 0;
        case 5  : return 0;
        case 10 : return 10;
        case 15 : return 24;
        case 20 : return 28;
        case 25 : return 30;

        // > 30 = 40 db
        default : return 40;
    }
}

// Calculate Distance between two google maps point //
function calcDistance(pointA, pointB){
    var lat = [pointA.d, pointB.d];
    var lng = [pointA.e, pointB.e];

    var R = 6378137; // RADIUS IN METER //

    var dLat = (lat[1]-lat[0]) * Math.PI / 180;
    var dLng = (lng[1]-lng[0]) * Math.PI / 180;

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat[0] * Math.PI / 180 ) * Math.cos(lat[1] * Math.PI / 180 ) * Math.sin(dLng/2) * Math.sin(dLng/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;

    return Math.round(d);
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// START WORKER CODE ///////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var WID         = Math.random().toString(16).substr(2,4).toUpperCase();
var CHANNEL     = [2412,2417,2422,2427,2432,2437,2442,2447,2452,2457,2462];
var EMITTERS    = [];
var RESULT      = [];
var STATUS      = 'idle';
var CURITER     = 0;
var MAXITER     = 0;

self.onmessage = function(msg)
{
    console.log("Worker: " + WID + " Data: " + JSON.stringify(msg.data.cmd));
//
//    EMITTERS = msg.data;
//
//    generate();
//
//    // SEND RESULT TO ENGINE //
//    var ret = (RESULT.length > 10) ? RESULT.slice(0,10) : RESULT;
//
//    self.postMessage(ret);
//
//    self.close();

    switch (msg.data.cmd){

        case 'start' : {
            EMITTERS = msg.data.data;

            STATUS = 'running';

            generate();

            STATUS = 'finish';

            var ret = (RESULT.length > 10) ? RESULT.slice(0,10) : RESULT;

            self.postMessage({result:'data', data:ret});

            break;
        }

        case 'status' : {
            self.postMessage({result:'status', data:STATUS, cur: CURITER, max:MAXITER});
            break;
        }
    }

};

function generate(){
    if(EMITTERS.length > 1){


        var maxIter = Math.pow(CHANNEL.length,EMITTERS.length-1);
        var leadEmitter = EMITTERS[0];

        MAXITER = maxIter;


        console.warn("\tMaxIter: " + maxIter + " Emitters: " + EMITTERS.length + " " + JSON.stringify(leadEmitter));

        // Set default emitters //
        EMITTERS.forEach(function(elem){
            if(elem !== leadEmitter){
                elem.freq = CHANNEL[0];
            }
        });

        // Main loop //

        var genNoise = null;

        do{
            var progress = Math.round( ( CURITER / MAXITER) * 100 );

            if((CURITER % 10000) == 0){
                console.log("Worker: " + WID + " Progress: " + progress + "%");
            }

            // Get Noise for field //
            genNoise = calcNoise();

            // Add result to return array //
            addResult(genNoise);

            // Generate Next Step //
            nextStep();

            CURITER++;

        }while(--maxIter > 0);

        // SORT //
        RESULT.sort(function(a,b){ return a.mwt - b.mwt; });

//        console.log(JSON.stringify(RESULT));
    }
}

// NEXT STEP ///////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function nextStep(){
    for(var i = EMITTERS.length - 1; i >= 1; i--){

        var emitter = EMITTERS[i];
        emitter.freq += 5;

        if(emitter.freq > CHANNEL[CHANNEL.length -1])
            emitter.freq = CHANNEL[0];
        else
            return true;
    }

    return false;
}

// CALC NOISE //////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function calcNoise(){

    var indxPointA = 0,indxPointB = 0;
    var pointA,pointB   = null;
    var noiseMap        = [];
    var index           = 0;

    for(indxPointA = 0; indxPointA < EMITTERS.length; indxPointA++){
        for(indxPointB = 0; indxPointB < EMITTERS.length; indxPointB++){

            pointA = EMITTERS[indxPointA];
            pointB = EMITTERS[indxPointB];

            // if point are different //
            if(pointA !== pointB){

                // Calc distance //
                var distance = calcDistance(pointA.latlng,pointB.latlng);

                // Freq delF //
                var df = getDF(pointA.freq,pointB.freq);

                // Calc Nosie L //
                var noiseL = 20 * (Math.log((4 * 3.14 * distance * pointB.freq) / 300) / Math.LN10).toFixed(2);

                // Calc Noise I //
                var noiseI = (pointA.dgain + pointA.again - noiseL + pointB.again - df).toFixed(2);

                // Add to noise map //
                noiseMap.push({emitters:pointA, transceiver:pointB, noise: noiseI});

//                console.log("A: " + JSON.stringify(pointA) + " B: " + JSON.stringify(pointB) + " distance: " + distance + " dF: " + df + " L: " + noiseL + " I: " + noiseI);
            }
        }
    }


    // CALC SUM OF EMITTER NOISE //
    var result_mtw = 0, result_dbm = 0;

    EMITTERS.forEach(function(emtr){
        var total_mwt = 0;

        noiseMap.forEach(function(point){
            if(point.transceiver === emtr){
                total_mwt += Math.pow(10,0.1 * point.noise);
            }
        });

        result_mtw += total_mwt;
    });

    result_dbm = (10 * (Math.log(result_mtw) / Math.LN10)).toFixed(4);

    return {mwt:result_mtw, dbm:result_dbm, emitters: JSON.parse(JSON.stringify(EMITTERS))};
}

function addResult(elem){
    if(RESULT.length < 40){
        RESULT.push(elem);
    }else{
        for(var i=0; i<RESULT.length; i++){
            if(RESULT[i].mwt > elem.mwt){
                RESULT[i] = elem;
                break;
            }
        }
    }
}