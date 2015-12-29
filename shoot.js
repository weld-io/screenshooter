'use strict';

var _ = require('lodash');
var async = require('async');
var http = require('http');
var phantom = require('node-phantom-simple');
var gm = require('gm');
var url = require('url');

var defaultOptions = {
	imageWidth: 240,
	imageHeight: 240,
	imageFormat: 'jpg',
	browserWidth: 1024,
	browserHeight: 1024,
};

var formatImage = function(imageData, imageOptions, callback){
	var imageBuffer = new Buffer(imageData, 'base64');
	// Resize options: %, @, !, < or > see http://aheckmann.github.io/gm/docs.html
	gm(imageBuffer, 'image.' + imageOptions.imageFormat)
		.gravity('Center')
		.resize(imageOptions.imageWidth, imageOptions.imageHeight, '^')
		.crop(imageOptions.imageWidth, imageOptions.imageHeight)
		.toBuffer(imageOptions.imageFormat.toUpperCase(), callback);
}

// Take URL, deliver image buffer
var renderUrlToImage = function (url, imageOptions, callback) {
	var phantomInstance;
	var lastTime = Date.now();

	var logTimestamp = function (msg) {
		console.log(msg, (Date.now() - lastTime));
		lastTime = Date.now();
	};

	async.waterfall([
		// Init PhantomJS
		phantom.create,
		// Create page
		function (ph, cbWaterfall) {
			logTimestamp('Create page');
			phantomInstance = ph;
			ph.createPage(cbWaterfall, {parameters: {'ignore-ssl-errors': 'yes'}});
		},
		// Open URL
		function (page, cbWaterfall) {
			logTimestamp('Open URL');
			page.set('viewportSize', {
				width: imageOptions.browserWidth,
				height: imageOptions.browserHeight
			});
			page.open(url, function (err, status) {
				cbWaterfall(err, page);
			});
		},
		// Render page to image
		function (page, cbWaterfall) {
			logTimestamp('Render page');
			var renderImageFormat = imageOptions.imageFormat === 'jpg' ? 'JPEG' : imageOptions.imageFormat.toUpperCase();
			page.renderBase64(renderImageFormat, cbWaterfall);
		},
		// Format image
		function (imageData, cbWaterfall) {
			logTimestamp('Format image');
			formatImage(imageData, imageOptions, cbWaterfall);
		},
		// Close PhantomJS
		function (imageBuffer, cbWaterfall) {
			logTimestamp('Close PhantomJS');
			phantomInstance.exit();
			cbWaterfall(null, imageBuffer);
		},
	],
	callback);
};

// Process the incoming request if not already processing
// Else put into queue
var onIncomingHTTPRequest = function (req, res) {
	console.log('Incoming request:', req.url);
	var pageURL = req.url.slice(1);
	var imageOptions = _.merge({}, defaultOptions);
	_.merge(imageOptions, url.parse(req.url, true).query);

	renderUrlToImage(pageURL, imageOptions, function (err, imageBuffer) {
		if (!err) {
			res.writeHead(200, {
				'Content-Type': 'image/' + imageOptions.imageFormat,
				'Content-Length': imageBuffer.length,
				'Cache-Control': 'public, max-age=31536000'});
			res.end(imageBuffer);
		}
		else {
			console.log('renderUrlToImage error:', error);
			res.send(500);
		}
	});
};

// Start server
http.createServer(onIncomingHTTPRequest).listen(process.env.PORT || 1337, function(){
	console.log('Screenshooter running on http://localhost:' + (process.env.PORT || 1337));
});
