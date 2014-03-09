// HELPER FUNCTION //

// Get noise between frequency of two access points //
function getDF(freq_a, freq_b) {
    switch (Math.abs(freq_a - freq_b)){
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
function calcDistance(point_a, point_b){
    var lat = [point_a.lat(), point_b.lat()];
    var lng = [point_a.lng(), point_b.lng()];

    var R = 6378137; // RADIUS IN METER //

    var dLat = (lat[1]-lat[0]) * Math.PI / 180;
    var dLng = (lng[1]-lng[0]) * Math.PI / 180;

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat[0] * Math.PI / 180 ) * Math.cos(lat[1] * Math.PI / 180 ) * Math.sin(dLng/2) * Math.sin(dLng/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;

    return Math.round(d);
}