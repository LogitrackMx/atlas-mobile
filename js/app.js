angular.module('syrusrsa', ['ionic', 'ionic-material', 'pegasus_bundle', 'syrusrsa.controllers', 'syrusrsa.services', 'uiGmapgoogle-maps'])
.run(function($state, $rootScope, $http, pegasus) {
	// window.pegasus = pegasus
	window.ALLGOOD = true;
	document.getElementById('fallback').style.display = "none";
	ionic.Platform.ready(function(){
		ionic.Platform.fullScreen(true, true);
		if(window.StatusBar) {
			// org.apache.cordova.statusbar required
			window.StatusBar.show();
			window.StatusBar.overlaysWebView(false);
			window.StatusBar.styleLightContent();
			// window.StatusBar.backgroundColorByHexString('#005199');
			window.StatusBar.backgroundColorByHexString('#000000');
		}
		pegasus.local.getItem('company').then(function(company){
			if(!company){
				$state.go('register')
				return
			}
			$rootScope.company = company
			pegasus.api.set_server("https://"+company.site_domain+"/api/v0/")
			pegasus.api.get('user').success(function(){
				$rootScope.$broadcast('syrusapp.ready', {})
			}).error(function(error){
				console.log('error')
				$state.go('login')
				return
			})
		})
	});
})
.config(function($stateProvider, $urlRouterProvider, $sceDelegateProvider, $ionicConfigProvider) {
	// $ionicConfigProvider.scrolling.jsScrolling(false);
	$sceDelegateProvider.resourceUrlWhitelist([
		'self',
		template_dir+'**'
	]);
	$stateProvider
		.state('register', {
			url: "/register",
			templateUrl : template_dir+'register.html',
			controller: 'RegisterCtrl'
		})
		.state('login', {
			url: "/login",
			templateUrl : template_dir+'login.html',
			controller: 'LoginCtrl'
		})
		// setup an abstract state for the tabs directive
		.state('views', {
			url: "/",
			abstract: true,
			templateUrl: template_dir+"main.html",
			controller: "MainCtrl"
		})
		// Each tab has its own nav history stack:
		.state('views.dash', {
			url: 'dash',
			templateUrl: template_dir+'dash.html',
			controller:'DashCtrl'
		})
		.state('views.call',{
			url:'call',
			templateUrl: template_dir+'call.html',
			controller:'CallCtrl'
		})
		.state("views.photos",{
			url:'photos',
			templateUrl:template_dir+'photos.html',
			controller:'PhotosCtrl'
		})
		.state('views.analysis', {
			url: 'analysis',
			templateUrl: template_dir+'analysis.html',
			controller: 'AnalysisCtrl'
		})
		.state('views.map', {
			url: 'map',
			templateUrl: template_dir+'map.html',
			controller: 'MapCtrl'
		})
		.state('views.settings', {
			url: 'settings',
			templateUrl: template_dir+'settings.html',
			controller: 'SettingsCtrl'
		});
	$urlRouterProvider.otherwise('/dash');
});
