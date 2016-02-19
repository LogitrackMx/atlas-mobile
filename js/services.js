angular.module('syrusrsa.services', ['pegasus_bundle'])
.factory('VehicleLocationData', function($rootScope, $interval) {
	var data = {
		map : {
			center:{
				latitude: 0,
				longitude: 0
			}
		},
		marker : {
			visible: true,
			center: {
				latitude:0,
				longitude:0
			}
		},
		data : {},
		windowOpts : {
			pixelOffset : new google.maps.Size(0,-12,"px","px"),
			disableAutoPan : true
		},
		info : {visible:false},
		units : {}
	};
	return {
		get: function() {
			return data;
		},
		setZoom:function(zoom){
			data.map.zoom = zoom;
		},
		setLatLong: function(lat, lon, map){
			if(map){
				data.map.center.latitude = lat;
				data.map.center.longitude = lon;
			}

			data.marker.center.latitude = lat;
			data.marker.center.longitude = lon;
		},
		showMarker: function(show){
			data.marker.visible = show;
		},
		showInfo: function(show){
			data.info.visible = show;
		},
		setData: function(d){
			data.data = d;
		},
		units: function(units){
			data.units = units;
		}
	}
});
