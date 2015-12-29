'use strict';

var _ = require('lodash');
var async = require('async');
var http = require('http');
var phantom = require('node-phantom-simple');
var gm = require('gm');
var url = require('url');

var processing = false;
var requests = [];

var defaultOptions = {
	imageWidth: 240,
	imageHeight: 240,
	imageFormat: 'jpg',
	browserWidth: 1024,
	browserHeight: 1024,
};

var processImage = function(res, imageData, ph, imageOptions){
	var imageBuffer = new Buffer(imageData, 'base64');
	// Resize options: %, @, !, < or > see http://aheckmann.github.io/gm/docs.html
	gm(imageBuffer, 'image.' + imageOptions.imageFormat)
		.gravity('Center')
		.resize(imageOptions.imageWidth, imageOptions.imageHeight, '^')
		.crop(imageOptions.imageWidth, imageOptions.imageHeight)
		.toBuffer(imageOptions.imageFormat.toUpperCase(), function(err, newImageBuffer){
			res.writeHead(200, {
				'Content-Type': 'image/' + imageOptions.imageFormat,
				'Content-Length': newImageBuffer.length,
				'Cache-Control': 'public, max-age=31536000'});
			res.end(newImageBuffer);
			ph.exit();
			processRequest.apply(null, requests.shift());
		});
}

// Request the current page and send back as png
// Then process next request in queue if there is one
var processRequest = function(req, res){
	if(req && res){
		var pageURL = req.url.slice(1);
		var imageOptions = _.merge({}, defaultOptions);
		_.merge(imageOptions, url.parse(req.url, true).query);
		console.log('Process page:', pageURL, imageOptions);
		processing = true;
		phantom.create(function(err,ph) {
			return ph.createPage(function(err, page) {
				page.set('viewportSize', {
					width: imageOptions.browserWidth,
					height: imageOptions.browserHeight
				});
				return page.open(pageURL, function(err, status) {
					var renderImageFormat = imageOptions.imageFormat === 'jpg' ? 'JPEG' : imageOptions.imageFormat.toUpperCase();
					page.renderBase64(renderImageFormat, function(error, imageData){
						if (imageData) {
							processImage(res, imageData, ph, imageOptions);
						} else {
							console.log(error);
							res.send(500);
						}
					});

				});
			}, {parameters: {'ignore-ssl-errors': 'yes'}});
		});
	} else {
		processing = false;
	}
};

// Process the incoming request if not already processing
// Else put into queue
http.createServer(function (req, res) {
	if(!processing){
		processRequest(req, res);
	} else if (requests.length > 10) {
		requests = [];
		processRequest(req, res);
	} else {
		requests.push([req, res]);
	}
}).listen(process.env.PORT || 1337, function(){
	console.log('Screenshooter running on http://localhost:' + (process.env.PORT || 1337));
});
