cdn = 'https://cdn.pegasusgateway.com/syrus-rsa/'
js_dir = 'https://cdn.pegasusgateway.com/syrus-rsa/js/';
template_dir = 'https://cdn.pegasusgateway.com/syrus-rsa/templates/';
extra_dir = 'https://cdn.pegasusgateway.com/syrus-rsa/extra/';

_version = '0.0.5';

/*DEV*/
// js_dir = 'http://localhost/projects/dct/apps/syrus-rsa/js/';
// template_dir = 'http://localhost/projects/dct/apps/syrus-rsa/templates/';
// extra_dir = 'http://localhost/projects/dct/apps/syrus-rsa/extra/';

head.load(extra_dir+'extra.css');

/**/
head.load(
	'cordova.js'
);
/**/

head.load('lib/ionic/js/ionic.bundle.min.js');
head.load('lib/ionic.material.min.js');

head.load(
	'lib/extras/lodash.js', 'lib/extras/zepto.js', js_dir+'libs.js'
);

head.load(js_dir+'pegasus_bundle.js');

head.load(
	js_dir+'app.js', js_dir+'controllers.js', js_dir+'services.js'
);
