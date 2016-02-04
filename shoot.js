#!/usr/bin/env node

'use strict';

var _ = require('lodash');
var async = require('async');
var http = require('http');
var phantom = require('node-phantom-simple');
var gm = require('gm');
var url = require('url');
var fs = require('fs');

var defaultOptions = {
	imageWidth: 240,
	imageHeight: 240,
	imageFormat: 'jpg',
	browserWidth: 1024,
	browserHeight: 1024,
	gravity: 'North',
	trim: false,
};

var MAX_PARALLELL_JOBS = (process.env['MAX_PARALLELL_JOBS'] ? parseInt(process.env['MAX_PARALLELL_JOBS']) : 3);
var VERBOSE_LOGGING = (process.env['VERBOSE_LOGGING'] === 'false' ? false : true);
var requestsBeingProcessed = 0;
var requestQueue = [];
var workingOnQueue = false;

var formatImage = function(imageData, imageOptions, callback){
	var imageBuffer = new Buffer(imageData, 'base64');
	// GraphicsMagick options: see http://aheckmann.github.io/gm/docs.html
	var imageObj = gm(imageBuffer, 'image.' + imageOptions.imageFormat)
		.gravity(imageOptions.gravity)
		.resize(imageOptions.imageWidth, imageOptions.imageHeight, '^')
		.crop(imageOptions.imageWidth, imageOptions.imageHeight);
	if (imageOptions.trim) {
		imageObj.trim();
	}
	imageObj.toBuffer(imageOptions.imageFormat.toUpperCase(), callback);
}

// Take URL, deliver image buffer
var renderUrlToImage = function (url, imageOptions, callback) {
	var lastTime = Date.now();

	var logTimestamp = function (msg) {
		if (VERBOSE_LOGGING)
			console.log('%s: %s (%d)', msg, url, (Date.now() - lastTime));
		lastTime = Date.now();
	};

	var thePhantomInstance;
	async.waterfall([
		// Init PhantomJS every request - saves RAM?
		phantom.create,
		// Create page
		function (ph, cbWaterfall) {
			logTimestamp('Create page');
			thePhantomInstance = ph;
			thePhantomInstance.createPage(cbWaterfall, {parameters: {'ignore-ssl-errors': 'yes'}});
		},
		// Open URL
		function (page, cbWaterfall) {
			logTimestamp('Open URL');
			page.set('resourceTimeout', 3000); // 3 seconds
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
			var renderImageFormat;
			if (imageOptions.imageFormat === 'jpg') {
				renderImageFormat = 'JPEG';
			}
			else if (imageOptions.imageFormat) {
				renderImageFormat = imageOptions.imageFormat.toUpperCase();
			}
			else {
				renderImageFormat = 'PNG';
			}
			page.renderBase64(renderImageFormat, cbWaterfall);
		},
		// Format image
		function (imageData, cbWaterfall) {
			logTimestamp('Format image');
			formatImage(imageData, imageOptions, cbWaterfall);
		},
	],
	function (err, results) {
		thePhantomInstance.exit();
		callback(err, results);
	});
};

// Save image to disk
var saveImageBufferToDisk = function (fileName, imageBuffer, callback) {
	console.log('Saving to disk:', fileName);
	fs.writeFile(fileName, imageBuffer, 'binary', callback);
};

// Take a request object and work on it
var processHTTPRequest = function (req, res, callback) {
	var pageURL = req.url.slice(1);
	var imageOptions = _.merge({}, defaultOptions);
	_.merge(imageOptions, url.parse(req.url, true).query);

	if (pageURL.indexOf('http') === -1) {
		// No URL
		if (callback) callback('Not valid URL');
	}
	else {
		requestsBeingProcessed++;
		console.log('Working on: %s (total %d)', pageURL, requestsBeingProcessed);
		renderUrlToImage(pageURL, imageOptions, function (err, imageBuffer) {
			requestsBeingProcessed--;
			console.log('Done with: %s (total %d)', pageURL, requestsBeingProcessed);
			if (!err) {
				res.writeHead(200, {
					'Content-Type': 'image/' + imageOptions.imageFormat,
					'Content-Length': imageBuffer.length,
					'Cache-Control': 'public, max-age=31536000'});
				res.end(imageBuffer);
			}
			else {
				console.log('Image render error:', err);
				if (res.send)
					res.send(500);
				else
					res.end();
			}
			if (callback) callback(err);
		});		
	}

};

// Take a request object and work on it
var addToRequestQueue = function (req, res) {
	requestQueue.push({ req: req, res: res });
	// Start working on queue if not doing it already
	if (!workingOnQueue) {
		workingOnQueue = true;
		// While: 1) there is spare capacity, and 2) there is work in the queue
		async.whilst(
			function () { return requestsBeingProcessed < MAX_PARALLELL_JOBS && requestQueue.length > 0; },
			function (callback) {
				console.log('Working on: %d, in queue: %d', requestsBeingProcessed, requestQueue.length);
				var firstRequest = requestQueue.shift();
				processHTTPRequest(firstRequest.req, firstRequest.res);
				callback(null);
			},
			function (err, results) {
				console.log('Done. Working on: %d, in queue: %d', requestsBeingProcessed, requestQueue.length);
				workingOnQueue = false;
			}
		);		
	}
}

// Process the incoming request if not already processing
// Else put into queue
var onIncomingHTTPRequest = function (req, res) {
	console.log('Incoming request:', req.url);
	if (requestsBeingProcessed < MAX_PARALLELL_JOBS) {
		processHTTPRequest(req, res); // Process immediately
	}
	else {
		addToRequestQueue(req, res); // Add to queue
	}
};

var processCommandLine = function () {
	var imageOptions = _.merge({}, defaultOptions);
	async.waterfall([
			// Process arguments
			function (cbWaterfall) {
				for (var i = 2; i < process.argv.length; i++) {
					var arg = process.argv[i];
					if (arg.indexOf('http') !== -1) {
						imageOptions.url = arg;
					}
					else if (arg.indexOf('=') !== -1) {
						var param = arg.split('=');
						imageOptions[param[0]] = param[1];
					}
					else if (arg.indexOf('.') !== -1) {
						imageOptions.fileName = arg;
					}
				};
				imageOptions.fileName = imageOptions.fileName || 'screenshot.' + imageOptions.imageFormat;
				cbWaterfall(null, imageOptions);
			},
			// Render page
			function (imageOptions, cbWaterfall) {
				console.log('Render URL to image', imageOptions);
				renderUrlToImage(imageOptions.url, imageOptions, cbWaterfall);
			},
			// Save to disk
			function (imageBuffer, cbWaterfall) {
				saveImageBufferToDisk(imageOptions.fileName, imageBuffer, cbWaterfall);
			},
		]
	);
};

// Start server
var startWebServer = function () {
	var serverPort = process.env.PORT || 1337;
	var server = http.createServer(onIncomingHTTPRequest);

	server.listen(serverPort, function () {
		console.log('Screenshooter service running on http://localhost:' + serverPort);
	});
};

// Main loop
if (process.argv.length >= 3) {
	// Run as command line
	processCommandLine();
}
else {
	// Else web server
	startWebServer();
}