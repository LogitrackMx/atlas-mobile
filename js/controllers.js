angular.module('syrusrsa.controllers', ['pegasus_bundle','ionic-material'])
.controller('RegisterCtrl', function($scope, $rootScope, $ionicLoading, $http, $state, pegasus){
	$scope.register = function(){
		$ionicLoading.show();
		$http.get('https://appm.pegasusgateway.com/jpapp/?appmc='+$scope.data.code.toUpperCase() ,{})
		.success(function(company, status){
			pegasus.local.setItem('company',company)
			$rootScope.company = company
			pegasus.api.set_server("https://"+company.site_domain+"/api/v0/")
			$state.go('login');
			$ionicLoading.hide();
		})
		.error(function(result, status){
			$scope.data.error = "Invalid Code";
			$ionicLoading.hide();
		});
	}
	$scope.$on('$ionicView.enter', function(){
		$scope.data = {
			code:'',
			error:''
		};
	})
})
.controller('LoginCtrl', function($scope, $rootScope, $ionicLoading, pegasus, $state, $http, $timeout){
	$scope.creds = {}
	$scope.login = function(creds){
		if(!$rootScope.company){
			$state.go('register');
			return;
		}
		$timeout(function(){
			$scope.error = 'timeout error';
			$ionicLoading.hide();
		}, 5000);
		console.log(creds)
		pegasus.api.login(creds).then(function(result){
			result.creds = creds
			pegasus.local.setItem('user',result)
			$timeout(function(){
				$rootScope.$broadcast('syrusapp.ready')
			},1000)
			$state.go('views.dash')
		},function(result){
			$scope.error = "invalid credentials"
			$scope.creds.password = ''
		})
	}
	$scope.unregister = function(){
		pegasus.local.setItem('company',null)
		$rootScope.company = null
		$state.go('register');
	}
	$scope.$on('$ionicView.enter', function(){
		$scope.error = null;
	})
})
.controller('MainCtrl', function($scope, $state, $interval, $timeout, $ionicLoading, $ionicModal, $ionicPopup, $ionicSideMenuDelegate, pegasus, ionicMaterialMotion){
	window.pegasus = pegasus
	_confirm_timeout = null
	$scope.momentize = function(a){
		return moment(a)
	}
	$scope.objects = pegasus.objects
	$scope.$on('pegasus.api.unauthorized', function(){
		pegasus.local.setItem('_vehicle', undefined).then(function(){
			$state.go('login')
		})
	})
	$scope.$on('syrusapp.ready', function(data){
		pegasus.init().then(function(data){
			console.log(data)
			pegasus.objects.vehicles.map(_find_device)
			$scope.objects.vehicles = pegasus.objects.vehicles
		})
	})
	$scope.main = {
		vehicle : undefined,
		device: undefined,
		state: undefined
	}
	$scope.view = {
		in1: false,
		in2: false,
		calls: false
	};
	$scope.input1 = {
		stable: false,
		connecting: false
	};
	$scope.input2 = {
		stable: false,
		connecting: false
	};
	_refresh_state = function(){
		if(!$scope.main.vehicle){return}
		pegasus.api.get('vehicles',$scope.main.vehicle.id,'remote','state')
		.success(function(state){
			$scope.main.state = state
			pegasus.local.setItem('_state', $scope.main.state)
		})
	}
	_find_device = function(vehicle){
		if(!vehicle.device){return vehicle}
		for (x = 0; x < pegasus.objects.devices.length; x++){
			device = pegasus.objects.devices[x]
			if (device.vehicle == vehicle.id){
				vehicle.device = device
				return vehicle
			}
		}
		return vehicle
	}
	$scope.is_online = function(vehicle){
		if (!vehicle || !vehicle.device){
			return
		}
		for (x = 0; x < pegasus.objects.devices.length; x++){
			device = pegasus.objects.devices[x]
			if (device.vehicle != vehicle.id){
				continue
			}
			return device.online
		}
	}
	$scope.refreshVehicles = function(){
		pegasus.load_items('vehicles').then(function(){
			pegasus.load_items('devices').then(function(){
				pegasus.objects.vehicles = pegasus.objects.vehicles.map(_find_device)
				$scope.objects.vehicles = pegasus.objects.vehicles
				$scope.$broadcast('scroll.refreshComplete')
			})
		})
	};
	$scope.changeVehicle = function(vehicle, leave_nav){
		leave_nav = leave_nav || false
		console.log(vehicle)
		if (!leave_nav){
			$ionicSideMenuDelegate.toggleRight()
		}
		pegasus.api.get('vehicles',vehicle.id)
		.success(function(vehicle){
			$scope.main.vehicle = vehicle
			pegasus.local.setItem('_vehicle', $scope.main.vehicle)
			pegasus.api.get('devices', vehicle.device)
			.success(function(device){
				$scope.main.device = device
				pegasus.local.setItem('_device', $scope.main.device)
			})
		})
		_refresh_state()
	}
	$scope.sos = function(){
		if (!$scope.confirm_sos){
			$scope.confirm_sos = true
			_confirm_timeout = $timeout(function(){
				$scope.confirm_sos = false
			}, 3000)
		}else{
			$timeout.cancel(_confirm_timeout)
			$scope.confirm_sos = false
			pegasus.api.post('vehicles',$scope.main.vehicle.id, 'remote','call', {index:0})
		}
	}
	$scope.format_time = function(rx){
		var date = new Date(0);
		date.setUTCSeconds(rx);
		return date.toLocaleString();
	}
	$scope.toggle1 = function(){
		if($scope.main.state.safeimmo_status.supported){
			if($scope.main.state.ios.out1_instruction_set){
				$scope.main.state.pending_actions.out1_pending = !$scope.main.state.ios.out1_instruction_set
				state = $scope.main.state.pending_actions.out1_pending
				pegasus.api.post('vehicles', $scope.main.vehicle.id, 'remote', 'safe_immo', {action:state})
			}else{
				$ionicPopup.confirm({
					templateUrl:template_dir+'safeimmo-popup.html'
				}).then(function(res){
					if(!res){return}
					$scope.main.state.pending_actions.out1_pending = !$scope.main.state.ios.out1_instruction_set
					state = $scope.main.state.pending_actions.out1_pending
					pegasus.api.post('vehicles', $scope.main.vehicle.id, 'remote', 'safe_immo', {action:state})
				})
			}
		}else{
			$scope.main.state.pending_actions.out1_pending = !$scope.main.state.ios.out1_instruction_set
			state = !$scope.main.state.ios.out1_instruction_set
			pegasus.api.post('vehicles', $scope.main.vehicle.id, 'remote', 'output', {otype:'n',out:1,state:state})
		}
	}
	$scope.toggle2 = function(){
		$scope.main.state.pending_actions.out2_pending = !$scope.main.state.ios.out2_instruction_set
		state = !$scope.main.state.ios.out2_instruction_set
		pegasus.api.post('vehicles', $scope.main.vehicle.id, 'remote', 'output', {otype:'n',out:2,state:state})
	}

	_vehicle_refresh = $interval(function(){
		if(!$scope.main.vehicle){return}
		$scope.changeVehicle($scope.main.vehicle, true)
	}, 120000)
	_state_refresh = $interval(_refresh_state, 10000)
	$scope.$on('$ionicView.enter', function(){
		console.log($scope.main.vehicle)
		if(!$scope.main.vehicle){
			pegasus.local.getItem('_vehicle').then(function(vehicle){
				$scope.main.vehicle = vehicle
			})
			pegasus.local.getItem('_device').then(function(device){
				$scope.main.device = device
			})
			pegasus.local.getItem('_state').then(function(state){
				$scope.main.state = state
			})
		}
	})
})
.controller('DashCtrl', function($scope, $state, $ionicLoading, $timeout, $http) {
	$scope.location = function(){
		$state.go('views.map');
	}
	$scope.takePic = function(){
	}
})
.controller('CallCtrl', function($scope, $state, $ionicPopup, pegasus, $ionicLoading, $timeout, $http) {
	$scope.view = "phones"
	$scope.toggle_view = function(){
		$scope.view = $scope.view == "phones"? "settings": "phones"
	}
	_current = undefined
	_stop_all = undefined
	_no_update = undefined
	$scope.call = function(index){
		$ionicLoading.show()
		pegasus.api.post('vehicles',_current, 'remote','call', {index:index})
		.success(function(result){
			$ionicLoading.hide()
			$ionicPopup.alert({
				template:"Successfully placed phone call",
				okType:"button-positive"
			})
		}).error(function(error){
			$ionicLoading.hide()
			$ionicPopup.alert({
				template:"Could not communicate with device",
				okType:"button-assertive"
			})
		})
	}
	$scope.delete_phone = function(index){
		confirm = $ionicPopup.confirm({
			title: 'Delete Phone?'
		}).then(function(res){
			if(res){
				$ionicLoading.show()
				phone = $scope.phones[index].phone
				payload = {phone:phone}
				console.log(payload)
				pegasus.api.delete('vehicles', _current, 'remote/phones', payload)
				.success(function(data){
					_load_phones()
					$ionicLoading.hide()
				})
				.error(function(error){
					$ionicLoading.hide()
					$ionicPopup.alert({
						template:"Could not delete phone number at this time",
						okType:"button-assertive"
					})
					console.log(error)
				})
			}
		})
	}
	$scope.add_phone = function(){
		//push phone to array and update all phones, unsetting first
		$scope.data = {}
		popup = $ionicPopup.show({
		    template: '<input type="text" ng-model="data.new_phone">',
		    title: 'Enter Phone number',
		    subTitle: 'Ex. +1123456789',
		    scope: $scope,
		    buttons: [
				{
					text: 'Cancel'
				},
				{
					text: '<b>Add</b>',
					type: 'button-positive',
					onTap: function(e) {
						if (!$scope.data.new_phone) {
							e.preventDefault();
						} else {
							return $scope.data.new_phone;
						}
					}
				}
			]
		});
		popup.then(function(phone){
			if(!phone ){return}
			$ionicLoading.show()
			pegasus.api.post('vehicles', _current, 'remote/phones', {phone:phone})
			.success(function(data){
				_load_phones()
				$ionicLoading.hide()
			})
			.error(function(error){
				//Handle error gracefully!!
				$ionicLoading.hide()
				$ionicPopup.alert({
					template:"Could not add phone number at this time",
					okType:"button-assertive"
				})
				console.log(error)
			})
		})
	}
	$scope.spy = function(){
		$ionicPopup.confirm({
			title: "SPY MODE",
			template: "SPY MODE <b>MUTES</b> the speaker and allows <b>ALL</b> incoming calls into the device. <br><br> You must ensure that the speaker is re-enabled so other calls are not affected when finished. <br><br><b> Calls to the Emergency SOS center maximize the speaker volume.<b>"
		}).then(function(res){
			if(!res){return}
			pegasus.api.post('vehicles', _current, 'remote/console', {cmd:"SXAVI0"})
			$scope.audio_settings.speaker = 0
			$scope.audio_settings.allow_all = true
		})
	}
	_load_phones = function(){
		$scope.phones = null
		pegasus.api.get('vehicles',_current,'remote','phones')
		.success(function(phones){
			$scope.phones = phones.phones
		})
		.error(function(error){
			console.log('uh oh')
		})
	}
	_load_settings = function(){
		$scope.audio_settings = {mic:undefined, speaker:undefined, allow_all:undefined}
		audio_settings = {}
		process = function(message){
			if(~message.indexOf("XAVI")){
				value = parseInt( message.slice(6,7) ) || false
				audio_settings.allow_all = value? true : false
			}
			else{
				message = message.slice(6,8)
				setting = message[0]
				value = message[1]
				if (setting == "M"){
					audio_settings.mic = parseInt(value)
				}else{
					audio_settings.speaker = parseInt(value)
				}
			}
			$scope.audio_settings = audio_settings
		}
		//loop call this function until both settings are replied to succesfully.
		get_response = function(cid, tries){
			tries = tries || 1
			if (tries > 10){
				return
			}
			tries++
			pegasus.api.get('vehicles',_current, 'remote','console', {cid:cid})
			.success(function(response){
				process(response.message)
			})
			.error(function(){
				if (_stop_all)
					return
				$timeout(function(){
					get_response(cid, tries)
				}, 5000)
			})
		}
		pegasus.api.post('vehicles',_current, 'remote','console', {cmd:"QXAVPM"})
		.success(function(response){
			get_response(response.cid)
		})
		pegasus.api.post('vehicles',_current, 'remote','console', {cmd:"QXAVPS"})
		.success(function(response){
			get_response(response.cid)
		})
		pegasus.api.post('vehicles',_current, 'remote','console', {cmd:"QXAVI"})
		.success(function(response){
			get_response(response.cid)
		})
	}
	_get_number = function(){
		$scope.get_phone = false
		devices = pegasus.objects.devices.filter(function(x){
			return (x.imei == $scope.main.vehicle.device)
		})
		if (devices.length){
			device = devices[0]
			if (device.simcard){
				sims = pegasus.objects.sims.filter(function(x){
					return (x.id == device.simcard)
				})
				if (sims.length){
					sim = sims[0]
					$scope.phone = sim.line_number
				}
			}
		}
	}
	_mic_to = null
	$scope.$watch('audio_settings.mic', function(value){
		if(_no_update){
			console.log('not updating mic')
			return
		}
		if(value==null || value == undefined){return}
		$timeout.cancel(_mic_to)
		_mic_to = $timeout(function(){
			pegasus.api.post('vehicles',_current, 'remote','console', {cmd:"SXAVPM"+value})
		}, 1500)
	})
	_speaker_to = null
	$scope.$watch('audio_settings.speaker', function(value){
		if(_no_update){
			console.log('not updating speaker')
			return
		}
		if(value==null || value == undefined){return}
		$timeout.cancel(_speaker_to)
		_speaker_to = $timeout(function(){
			pegasus.api.post('vehicles',_current, 'remote','console', {cmd:"SXAVPS"+value})
		},1500)
	})
	_allow_all_to = null
	$scope.$watch('audio_settings.allow_all', function(value){
		if(_no_update){
			console.log('not updating allow all')
			return
		}
		if(value==null || value == undefined){return}
		sending = value? 1 : 0
		$timeout.cancel(_allow_all_to)
		_allow_all_to = $timeout(function(){
			pegasus.api.post('vehicles',_current, 'remote','console', {cmd:"SXAVI"+sending})
		},1500)
	})
	$scope.$watch('main.vehicle', function(vehicle){
		if(!vehicle){return}
		_current = $scope.main.vehicle.id
		_load_settings()
		_load_phones()
		_get_number()
	})
	$scope.$on('$ionicView.beforeEnter', function(){
		if (!$scope.main.vehicle ){return}
		if ($scope.main.vehicle && _current != $scope.main.vehicle.id){
			_current = $scope.main.vehicle.id
			_stop_all = false
			_no_update = false
			_load_settings()
			_load_phones()
			_get_number()
		}
	})
	$scope.$on('$ionicView.beforeLeave', function(){
		_stop_all = true
	})
})
.controller('MapCtrl', function($scope, $state, $http, $timeout, pegasus, VehicleLocationData) {
	_marker = function(){
		set = document.querySelectorAll('[title=syrus_marker]')
		if (set.length){
			return set[0]
		}
		else return false
	}
	$scope.zoom = 12;
	$scope.icon = {
		anchor: new google.maps.Point(0,0),
		path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
	};
	$scope.tracking = true
	$scope.map = function(center){
		$timeout.cancel($scope.map_to)
		if(!$scope.main.vehicle){
			return;
		}

		pegasus.api.get('vehicles',$scope.main.vehicle.id, 'remote','location')
		.success(function(data){
			if (data.location.vehicle != $scope.main.vehicle.id && data.location.vid != $scope.main.vehicle.id){
				return
			}
			//check if window is open
			VehicleLocationData.setLatLong(data.location.lat, data.location.lon, center);
			VehicleLocationData.showMarker(true);
			VehicleLocationData.setData(data);
			$scope.mapData = VehicleLocationData.get();
			// $scope.mapData.polyline = [];
			// $scope.mapData.polyline = lc.get($scope.main.vehicle.vid+'.pline') ? lc.get($scope.main.vehicle.vid+'.pline').value : [] ;
			if(data.live){
				//Edit Element and add the color
				var newp = {longitude: data.location.lon,latitude: data.location.lat};
				window.setTimeout(function(){
					marker = _marker()
					if (marker){
						angular.element(marker)[0].classList.add('on');
						angular.element(marker)[0].style['transform'] = 'rotateZ('+data.location.head+'deg)';
						angular.element(marker)[0].style['-webkit-transform']= 'rotateZ('+data.location.head+'deg)';
					}
				}, 100)
			}else{
				window.setTimeout(function(){
					marker = _marker()
					if (marker){
						angular.element(marker)[0].classList.add('off');
					}
				}, 100)
			}
			var date = new Date(0);
			date.setUTCSeconds(data.location.epoch);
			$scope.date = date.toLocaleString();
			center = {
				lat : $scope.mapData.marker.center.latitude,
				lon : $scope.mapData.marker.center.longitude
			}
			pegasus.api.post('reversegeo', center )
			.success(function(data){
				$scope.address = data.location_full
			})
			.error(function(data){
				$scope.address = 'Address could not be established';
			})

			//call this function within a timeout
			console.log(data, data.location.gpsvalid);
			timeout = 10000
			if (data.location.mph == 0){
				timeout = 30000
			}
			if (!data.live){
				timeout = 60000
			}
			if($scope.tracking){
				$timeout.cancel($scope.map_to)
				$scope.map_to = $timeout(function(){
					$scope.map(center)
				}, timeout)
			}
		})
	}
	$scope.hideInfo = function(){
		VehicleLocationData.showInfo(false);
		$scope.mapData.info.visible = false;
	}
	$scope.showInfo = function(){
		VehicleLocationData.showInfo(true);
		$scope.mapData.info.visible = true;
	}
	$scope.navigate = function(){
		center = $scope.mapData.marker.center
		console.log(center)
		if ( ionic.Platform.isIOS() ){
			url = "maps://maps.google.com/?q="
		}else{
			url = "http://maps.google.com/?q="
		}
		url += center.latitude+","+center.longitude
		console.log(url)
		window.open(url, '_blank')
	}
	$scope.$watch('tracking', function(o,n){console.log(o,n)})
	$scope.$watch('main.vehicle', function(vehicle){
		console.log('vehicle changed')
		if(!vehicle){return}
		$timeout.cancel($scope.map_to)
		$scope.map(true)
	})
	$scope.$on('$ionicView.beforeEnter', function(){
		if(!$scope.main.vehicle){
			$state.go('views.dash');
			return;
		}
		$timeout.cancel($scope.map_to)
		$scope.tracking = true
		$scope.mapData = VehicleLocationData.get();
		pegasus.local.getItem('settings').then(function(settings){
			console.log(settings)
			$scope.zoom = settings.zoom || 12
		})
		$scope.map(true);
	})
	$scope.$on('$ionicView.beforeLeave', function(){
		$scope.tracking = false
		$timeout.cancel($scope.map_to)
		$scope.render_map = false
	})
	$scope.$on('$ionicView.enter', function(){
		$scope.render_map = true
	})
})
.controller('AnalysisCtrl', function($scope, $state, $ionicLoading, $timeout, pegasus) {
	_current = undefined
	$scope.labels = {
		"dev_dist":""
	}
	$scope.view = {formated: false}
	$scope.range = {}
	$scope.today = moment().format("YYYY-MM-DD")
	var _make_labels, _timed;
	_timed = ['dev_idle', 'dev_ign', 'dev_orpm', 'dev_ospeed', 'ecu_eidle', 'ecu_eusage'];
	_make_labels = function(units) {
		var counter_labels, distance, volume, speed;
		distance = units.distance;
		speed = units.speed;
		volume = units.volume;
		counter_labels = {
			dev_dist: "Distance (" + distance + ")",
			dev_idle: "Idle (min)",
			dev_ign: "Time ON (min)",
			dev_orpm: "Over RPMs (min)",
			dev_ospeed: "Over speed (min)",
			dev_tot_avg_speed: "Average speed (" + speed + ")",
			dev_tot_fuel_efcy: "Fuel efficiency (" + distance + "/" + volume + ")",
			dev_tra_avg_speed: "Average traveling speed (" + speed + ")",
			dev_tra_fuel_efcy: "Traveling fuel efficiency (" + distance + "/" + volume + ")",
			ecu_dist: "Engine distance (" + distance + ")",
			ecu_eidle: "Engine idle (min)",
			ecu_eusage: "Engine time on (min)",
			ecu_fuel_pidling: "Engine idle fuel consumption (%)",
			ecu_ifuel: "Engine idle fuel consumption (" + volume + ")",
			ecu_tfuel: "Engine Fuel consumed (" + volume + ")",
			ecu_tot_avg_speed: "Engine average speed (" + speed + ")",
			ecu_tot_fuel_efcy: "Engine fuel efficiency (" + distance + "/" + volume + ")",
			ecu_tra_avg_speed: "Engine traveling average speed (" + speed + ")",
			ecu_tra_fuel_efcy: "Engine traveling fuel efficiency (" + distance + "/" + volume + ")"
		};
		$scope.counter_labels = counter_labels;
	};
	$scope.timed = _timed
	$scope.counters = {}
	_loading = false
	_load_counters = function(){
		if (!_current){return}
		if (_loading){return}
		_loading = true
		_from = moment($scope.range.from)
		_to = moment($scope.range.to)
		from = _from.format("YYYY-MM-DD")
		to = _to.format("YYYY-MM-DD")+"T23:59:59"
		// pegasus.api.get("vehicles",_current,"counters","deltas",{from:from, to:to})
		pegasus.api.get("counters",{ vehicles: _current, from:from, to:to } )
		.success(function(response){
			_make_labels(response.units)
			$scope.counters = response.counters[0]
			_loading = false
			console.log(response)
		}).error(function(){
			_loading = false
		})
	}
	_range_to = undefined
	$scope.view_today = function(){$scope.range = {}}
	$scope.view_yesterday = function(){
		yesterday = moment($scope.today).subtract(1,'d')
		_yesterday = yesterday.format("YYYY-MM-DD 00:00:00")
		$scope.range = { from: new Date(_yesterday), to: new Date(_yesterday) }
	}
	$scope.view_last = function(days){
		today = moment($scope.today).format("YYYY-MM-DD 00:00:00")
		last = moment(today).subtract(days,'d').format("YYYY-MM-DD 00:00:00")
		$scope.range = { to: new Date(today), from: new Date(last) }
	}
	$scope.format = function(value, formatted){
		if (!formatted){
			return Math.floor(value*1000)/1000
		}
		hours = Math.floor(value/3600)
		value = value%3600
		minutes = Math.floor(value/60)
		value = value%60
		seconds = Math.ceil(value)
		add0 = function(num){
			return num < 10 ? "0"+num : num+""
		}
		hours= add0(hours)
		minutes= add0(minutes)
		seconds= add0(seconds)
		return hours+":"+minutes+":"+seconds
	}

	$scope.$watchCollection('range', function(range){
		range.from = range.from || new Date()
		range.to = range.to || new Date()
		$scope.max_from = moment(range.to).format("YYYY-MM-DD")
		$scope.min_to = moment(range.from).format("YYYY-MM-DD")
		$timeout.cancel(_range_to)
		$timeout(function(){
			_load_counters()
		}, 1000)
	})
	$scope.$watch('main.vehicle', function(vehicle, old){
		if(!vehicle){return}
		if (old && vehicle.id == old.id){return}
		console.log('vehicle changed...', vehicle)
		_current = $scope.main.vehicle.id
		_loading = false
		_load_counters()
	})
	$scope.$on('$ionicView.beforeEnter', function(){
		console.log('entered analysis')
		if ($scope.main.vehicle && _current != $scope.main.vehicle.id){
			_current = $scope.main.vehicle.id
			_loading = false
			_load_counters()
		}
	})
})
.controller('PhotosCtrl', function($scope, $state, $ionicLoading, $ionicPopup ,$timeout, pegasus){
	_current = undefined
	_loading = false
	$scope.range = {}
	$scope.today = moment().format("YYYY-MM-DD")
	$scope.events = []
	_range_to = undefined
	_load_events = function(after_cap){
		count = $scope.events.length || 0
		$scope.events = []
		if (!_current){return}
		if (_loading){return}
		_loading = true
		_from = moment($scope.range.from)
		from = _from.format("YYYY-MM-DD")
		to = _from.format("YYYY-MM-DD")+"T23:59:59"
		pegasus.api.get("vehicles",_current,"plugins","photocam","browse",{_from:from, _to:to})
		.success(function(events){
			$scope.events = events.reverse()
			if(after_cap){
				if(events.length > count){
					console.log(events.length, count)
					$scope.load_pics($scope.events[0])
					$ionicLoading.hide()
				}else{
					$timeout(function(){
						_load_events(true)
					},5000)
				}
			}else{
				$ionicLoading.hide()
			}
			_loading = false
		}).error(function(){
			$scope.events = []
			$ionicLoading.hide()
			_loading = false
		})
	}
	$scope.load_pics = function(e){
		$scope.photos = null
		$scope.selected_event = e
		time = moment(e.time)
		_time = time.year()+"-"+(time.month()+1)+"-"+time.date()
		pegasus.api.get('vehicles', _current, 'plugins', 'photocam', 'from_event', {'event':e.id,'time':_time} )
		.success(function(data){
			if(data.photos != undefined){
				$scope.photos = data.photos
			}
			else{
				data.status = data.message
				$scope.photos = [data]
			}
		})
		.error(function(data){
			return
		})
	}
	$scope.take_photo = function(){
		$ionicLoading.show()
		pegasus.api.get('vehicle',_current, 'plugins', 'photocam', 'capture')
		.success(function(data){
			if(!data.device_is_online){
				$ionicPopup.alert({
					title: 'Device is Offline',
					template: 'The device is offline and has not processed the photo request'
				});
				$ionicLoading.hide()
			}else{
				_load_events(true)
			}
		})
		.error(function(data){
			$ionicPopup.alert({
				title: 'Photo Request Error',
				template: "<p>"+data.message+"</p>",
			});
			$ionicLoading.hide()
		})
	}
	$scope.$watchCollection('range', function(range){
		range.from = range.from || new Date()
		// range.to = range.to || new Date()
		// $scope.max_from = moment(range.to).format("YYYY-MM-DD")
		// $scope.min_to = moment(range.from).format("YYYY-MM-DD")
		$timeout.cancel(_range_to)
		$timeout(function(){
			_load_events()
		}, 1000)
	})
	$scope.$watch('main.vehicle', function(vehicle, old){
		if(!vehicle){return}
		if (old && vehicle.id == old.id){return}
		console.log('vehicle changed...', vehicle)
		_current = $scope.main.vehicle.id
		_loading = false
		_load_events()
	})
	$scope.$on('$ionicView.beforeEnter', function(){
		console.log('entered photos')
		if ($scope.main.vehicle && _current != $scope.main.vehicle.id){
			_current = $scope.main.vehicle.id
			_loading = false
			_load_events()
		}
	})
})
.controller('SettingsCtrl', function($scope, $state, $ionicPopup, $http, pegasus) {
	$scope.syrus_version = _version;
	$scope.new_version = '';
	$scope.version_message = ''
	$scope.reload = function(){location.reload(true)};

	$scope.check_version = function(){
		$http.get(js_dir+'version?'+Math.random(), {})
		.success(function(data){
			$scope.new_version = data.trim();
			if($scope.new_version == $scope.syrus_version){
				$scope.version_message = 'App is up to date';
			}else{
				$scope.version_message = 'New version available : ' + $scope.new_version;
			}
		})
		.error(function(){
			$scope.new_version = $scope.syrus_version;
			$scope.version_message = 'Error connecting to server';
		});
	}
	$scope.logout = function(){
		pegasus.api.logout()
		pegasus.local.setItem('user',undefined)
		pegasus.local.setItem('_vehicle', undefined)
		$scope.main.vehicle = null;
		$state.go('login');
	}
	$scope.unregister = function(){
		var confirmPopup = $ionicPopup.confirm({
			title: 'Unregister Application',
			template: 'Are you sure you want to unregister the pegasus site from the Application?'
		});

		confirmPopup.then(function(answer){
			if(answer){
				pegasus.local.clear()
				$scope.main.vehicle = null
				$scope.main.vehicles = []
				$state.go('register');
			}
		});
	}
	$scope.settings = {}
	$scope.dev_settings = {}
	$scope.$watchCollection('settings', function(settings){
		settings.zoom = parseInt(settings.zoom) || 12
		pegasus.local.setItem('settings',settings)
	});
	$scope.$on('$ionicView.beforeEnter', function(){
		pegasus.local.getItem('settings').then(function(settings){
			$scope.settings = settings || {}
		})
		$scope.check_version();
	})
});
