'use strict'

//========================================================================================
Array.prototype.clear = function()  //Add a new method to the Array Object
{ this.length = 0; }
//========================================================================================

google.maps.visualRefresh = true;

var mapOptions = { zoom: 16, center: new google.maps.LatLng(46.5045708,30.3305385), mapTypeId: google.maps.MapTypeId.HYBRID, draggableCursor: 'crosshair'};
var gmap = new google.maps.Map(document.getElementById('google-container-id'),mapOptions);

function CellEngine(){

    var g2channel       = [ {freq: 2412, color: "#0B610B"},
                            {freq: 2417, color: "#0B4C5F"},
                            {freq: 2422, color: "#58ACFA"},
                            {freq: 2427, color: "#FF00BF"},
                            {freq: 2432, color: "#FF4000"},
                            {freq: 2437, color: "#FFBF00"},
                            {freq: 2442, color: "#BF00FF"},
                            {freq: 2447, color: "#4000FF"},
                            {freq: 2452, color: "#0080FF"},
                            {freq: 2457, color: "#5882FA"},
                            {freq: 2462, color: "#F5A9A9"} ];

    var deltaF          = [ {mhz:0,db:0},
                            {mhz:5,db:0},
                            {mhz:10,db:10},
                            {mhz:15,db:24},
                            {mhz:20,db:28},
                            {mhz:25,db:30},
                            {mhz:30,db:40} ];

    var devGain         = 12;
    var antGain         = 8;

    var accesspoints    = [];
    var markets         = [];
    var patharray       = [];
    var gpath           = [];
    var chPull          = [];
    var mrsp            = [];

    var _TMP_COORD      = null;


    // On GMap mouse click //
    function onMapMouseClick(event){


        _TMP_COORD = event.latLng;

        $('#input-name').val(Math.random().toString(16).substr(2,6).toUpperCase());
        $("#span-dev-coordinate").text(event.latLng.lat().toFixed(4) + "," + event.latLng.lng().toFixed(4));
        $('#modal-add-ap').modal('show');

//        addMarker(event.latLng);
//        showMarket();
    }

    function onCreateAccessPoint(event){
        $('#modal-add-ap').modal('hide');

        addMarker(_TMP_COORD);
        showMarket();
    }

    function addMarker(latLng){

        var freq = g2channel[0];

        var _devgain = parseInt($("#input-devgain").val());
        var _antgain = parseInt($("#input-antgain").val());
        var _pattern = parseInt($("#input-pattern").val());

        accesspoints.push(  {   latlng: latLng,
                                name: Math.random().toString(16).substr(2,4).toUpperCase(),
                                freq:freq.freq,
                                color:freq.color,
                                devgain:_devgain,
                                antgain:_antgain,
                                pattern:_pattern});

        console.log(accesspoints);
    }

    function showMarket(){
        console.group();

        clearMarkets();

        // SET OPTIMAL NOISE //
        if(mrsp.length > 0){
            var setOptm = mrsp[0];

            setOptm.points.forEach(function(spoint){
                for(var i=0; i<accesspoints.length; i++){
                    if(spoint.name === accesspoints[i].name){
                        accesspoints[i].freq    = spoint.freq;
                        accesspoints[i].color   = getChColor(spoint.freq).color;
                        break;
                    }
                }
            });
        }

        accesspoints.forEach(function(elem){

            var market = new google.maps.Marker({ position: elem.latlng, map: gmap, title:elem.name + " - " + elem.freq + " Mhz"});
            var circle = new google.maps.Circle({ center:elem.latlng, map:gmap, radius:60, fillColor:elem.color, clickable:false,draggable:false,editable:false});

            // function delete //
            google.maps.event.addListener(market, 'click', function(event){

                var indx = 0;

                for(indx = 0; indx < accesspoints.length; indx++)
                    if(accesspoints[indx].name === elem.name){
                        accesspoints.splice(indx,1);
                        break;
                    }

                console.log(JSON.stringify(accesspoints));

                // show market //
                showMarket();
            });

            gpath.push(circle);
            markets.push(market);

        });

        console.groupEnd();
    }

    function clearMarkets(){
        console.log("Clear markets");
        markets.forEach(function(market){ market.setMap(null); });
        gpath.forEach(function(circle){circle.setMap(null)});

        markets.clear();
        gpath.clear();
    }

    function getDistance(a, b){

        var lat = [a.lat(), b.lat()];
        var lng = [a.lng(), b.lng()];

        var R = 6378137; // RADIUS IN METER //

        var dLat = (lat[1]-lat[0]) * Math.PI / 180;
        var dLng = (lng[1]-lng[0]) * Math.PI / 180;

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat[0] * Math.PI / 180 ) * Math.cos(lat[1] * Math.PI / 180 ) * Math.sin(dLng/2) * Math.sin(dLng/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        var d = R * c;

        return Math.round(d);
    }

    function calcDistance(event){

        for(var ia = 0; ia < accesspoints.length; ia++){
            for(var ib=ia; ib < accesspoints.length; ib++){
                if(accesspoints[ia].name !== accesspoints[ib].name){

                    var dist = getDistance(accesspoints[ia].latlng,accesspoints[ib].latlng);

                    console.log(    "A: " + accesspoints[ia].name + " "  + JSON.stringify(accesspoints[ia].latlng) +
                                    " B: " + accesspoints[ib].name + " "  + JSON.stringify(accesspoints[ib].latlng) +
                                    " Distance: " + dist);
                }
            }

        }
    }


    function conNextStep(){
        for(var i = accesspoints.length - 1; i >= 0; i--){

            var point = accesspoints[i];
            point.freq += 5;

            if(point.freq > g2channel[g2channel.length-1].freq)
                point.freq = g2channel[0].freq;
            else
                return true;
        }

        return false;
    }

    function showFreq(){
        var line = [];

        accesspoints.forEach(function(elm){
//            line.push("name: " + elm.name + " : " + elm.freq);
            line.push(elm.freq);
        });

        return JSON.stringify(line);
    }

    function conGenerateFreq(event){

        var next    = false;
        var finish  = false;
        var maxchannel = g2channel.length - 1;

        var curpos  = 0;
        var nextpos = 1;
        var point   = null;
        var g2c     = null;

        // INIT //
        for(var i = 0; i < accesspoints.length; i++){
            accesspoints[i].freq  = g2channel[0].freq;
            accesspoints[i].color = g2channel[0].color;
        }

        chPull.clear();
        mrsp.clear();

        var iter = 1;
        var maxIter = Math.pow(g2channel.length,accesspoints.length);

        console.clear();
        console.warn("MaxIter: " + maxIter);

        do{

            if((iter % 10000) === 0){
                console.clear();
                console.log("Iter: " + iter + " of " + maxIter + " " + Math.ceil((iter/maxIter)*100) + "% | " + showFreq() + " MRSP: " + mrsp.length);
            }

            // calc noise //
            var sdbm = calcNoise();

            if(sdbm.sdbm < -40){
                if(mrsp.length >= 40){

                    for(var i=0; i < mrsp.length; i++)
                        if(mrsp[i].sdbm < sdbm.sdbm){
                            mrsp[i] = sdbm;
//                            iter = maxIter;
                            break;
                        }

                }else{
                    mrsp.push(sdbm);
                }
            }

            // console.log(JSON.stringify(sdbm));


            // NEXT STEP //
            conNextStep();



        }while(++iter <= (maxIter/2));

        //console.clear();

        // SORT //
        mrsp.sort(function(a,b){
           return a.sdi - b.sdi;
        });

        for(var i=0; i < mrsp.length && i < 100; i++){
            console.log("SumdBm: " +  mrsp[i].sdbm);
                mrsp[i].points.forEach(function(elm){
                    console.log("\t\t" + JSON.stringify(elm));
                });
        }

        showMarket();

    }

    function calcNoise(){

        var dF = 0;
        var point_a,point_b = null;
        var distance = 0;
        var l = 0;
        var dL = 0;
        var delta = 40;
        var I = 0;

        var dIM = [];
        var dResult = [];

        var freq = [];
        accesspoints.forEach(function(elm){
            freq.push(elm.freq);
        });

        for(var ia = 0; ia < accesspoints.length; ia++){
            for(var ib = 0; ib < accesspoints.length; ib++){

                point_a = accesspoints[ia];
                point_b = accesspoints[ib];

                if(point_a !== point_b){

                    distance = getDistance(point_a.latlng, point_b.latlng);

                    dF = Math.abs(point_a.freq - point_b.freq);
                    l = 20 * (Math.log((4 * 3.14 * distance * point_b.freq) / 300) / Math.LN10);

                    // get DF //
                    for(var i=0; i < deltaF.length; i++){
                        if(deltaF[i].mhz >= dF){
                            delta = deltaF[i].db;
                            break;
                        }
                    }

                    I = (point_b.devgain + point_b.antgain - l + point_a.antgain - delta).toFixed(2);

                    dIM.push({a:point_a, b:point_b, i:I});
                }
            }
        }

        accesspoints.forEach(function(point){

            var sumDI = 0;
            var dbm = 0;
            var dnoise = 0;

            for(var i=0; i < dIM.length; i++){
                dnoise = dIM[i];

                if(dnoise.b.name === point.name){
                    sumDI += Math.pow(10,0.1 * dnoise.i);
                }
            }

            dbm = (10 * (Math.log(sumDI) / Math.LN10)).toFixed(4);

            if(dbm < -40)
                dResult.push({name:point.name, freq:point.freq, sdi:sumDI, sdbm:dbm})
        });

//        if(dResult.length >= accesspoints.length){

            var sumDI = 0;

            dResult.forEach(function(elm){
                sumDI += elm.sdi;
            });

            var dbm = (10 * (Math.log(sumDI) / Math.LN10)).toFixed(4);

//        if(dbm < -20)
//                mrsp.push();
//        }

        return {sdbm:dbm, sdi:sumDI, points: dResult};
    }

    function genField(event){

        var count = 4;
        var minIndex = 1;
        var maxIndex = 4;

        var index = [];
        var maxIter = Math.pow(maxIndex,count);

        for(var  i=0; i < count; i++)
            index.push(minIndex);

        console.log("Index: " + JSON.stringify(index) + " MaxIter: " + maxIter);

        var iter = 1;

        do{
            console.log("Iter: " + maxIter + " itr: " + iter);
            console.log("\tPoint: " + JSON.stringify(index));

            // some magic //


            // increment //
            nextStep(index,minIndex,maxIndex);

            iter++;

        }while(iter <= maxIter);
    }

    function nextStep(array, min, max){

        for(var i = array.length-1; i >= 0; i--){
            array[i]++;

            if(array[i] > max)
                array[i] = min;
            else
                return true;
        }

        return false;
    }

    function getChColor(freq){

        for(var i=0; i < g2channel.length; i++){
            if(g2channel[i].freq === freq){
                return g2channel[i];
            }
        }

        return false;
    }

    this.init = function(){

        google.maps.event.addListener(gmap, 'click', onMapMouseClick);

        google.maps.event.addListener(gmap, 'mousemove', function(event){
            //console.log(event.latLng.lat() + "," + event.latLng.lng());
            $("#gmap-position").text("coord: " + event.latLng.lat().toFixed(4) + "," + event.latLng.lng().toFixed(4));
        });

        //mouseover

        // gmap-position

        $("#bnt-distance").click(calcDistance);
        $("#bnt-genfreq").click(conGenerateFreq);
        $("#bnt-genfield").click(genField);

        $("#bnt-create-ap").click(onCreateAccessPoint);

        console.log(g2channel);
        console.log(accesspoints);
    }
}

var cell = new  CellEngine();

// ON DOM READY //
$(document).ready(function(){
    cell.init();
});

