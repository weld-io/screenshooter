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

var phantomInstance;
var MAX_PARALLELL_JOBS = 3;
var requestsBeingProcessed = 0;
var requestQueue = [];
var workingOnQueue = false;

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
	var lastTime = Date.now();

	var logTimestamp = function (msg) {
		console.log('%s: %s (%d)', msg, url, (Date.now() - lastTime));
		lastTime = Date.now();
	};

	async.waterfall([
		// Create page
		function (cbWaterfall) {
			logTimestamp('Create page');
			phantomInstance.createPage(cbWaterfall, {parameters: {'ignore-ssl-errors': 'yes'}});
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
	],
	callback);
};

// Take a request object and work on it
var processHTTPRequest = function (req, res, callback) {
	var pageURL = req.url.slice(1);
	var imageOptions = _.merge({}, defaultOptions);
	_.merge(imageOptions, url.parse(req.url, true).query);
	requestsBeingProcessed++;

	renderUrlToImage(pageURL, imageOptions, function (err, imageBuffer) {
		requestsBeingProcessed--;
		if (!err) {
			res.writeHead(200, {
				'Content-Type': 'image/' + imageOptions.imageFormat,
				'Content-Length': imageBuffer.length,
				'Cache-Control': 'public, max-age=31536000'});
			res.end(imageBuffer);
		}
		else {
			console.log('Image render error:', err);
			res.json(500);
		}
		if (callback) callback(err);
	});
};

// Take a request object and work on it
var addToRequestQueue = function (req, res) {
	requestQueue.push({ req: req, res: res });
	// Start working on queue if not doing it already
	if (!workingOnQueue) {
		workingOnQueue = true;
		async.whilst(
			function () { return requestQueue.length > 0; },
			function (callback) {
				console.log('Working on: %d, in queue: %d', requestsBeingProcessed, requestQueue.length);
				var firstRequest = requestQueue.shift();
				processHTTPRequest(firstRequest.req, firstRequest.res);
				callback(null);
			},
			function (err, results) {
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

// Init PhantomJS
phantom.create(function (err, ph) {
	phantomInstance = ph;
});


// Start server
var serverPort = process.env.PORT || 1337;
var server = http.createServer(onIncomingHTTPRequest);

server.on('close', function () {
	phantomInstance.exit();
	console.log('Closed');
});

server.listen(serverPort, function () {
	console.log('Screenshooter running on http://localhost:' + serverPort);
});
