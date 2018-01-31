#!/usr/bin/env node

const _ = require('lodash');
const async = require('async');
const http = require('http');
const puppeteer = require('puppeteer');

const url = require('url');
const fs = require('fs');

const defaultOptions = {
	imageWidth: 240,
	imageHeight: 240,
	imageFormat: 'jpg',
	browserWidth: 1024,
	browserHeight: 1024,
	gravity: 'North',
	trim: false,
};

const VERBOSE_LOGGING = (process.env['VERBOSE_LOGGING'] === 'false' ? false : true);
let requestsBeingProcessed = 0;
const requestQueue = [];
let workingOnQueue = false;


// Take URL, deliver image buffer
const renderUrlToImage = (url, imageOptions, callback) => {

	let renderImageFormat;
	if (imageOptions.imageFormat === 'jpg') {
		renderImageFormat = 'jpeg';
	}
	else if (imageOptions.imageFormat) {
		renderImageFormat = imageOptions.imageFormat.toLowerCase();
	}

	(async () => {
		const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
		const page = await browser.newPage();
		page.setViewport({
			width: parseInt(imageOptions.browserWidth),
			height: parseInt(imageOptions.browserHeight)
		});
		await page.goto(url, {waitUntil: 'networkidle2'});
		const screenshot = await page.screenshot({
			type: renderImageFormat
		});
		browser.close();
		return screenshot;
	})().then(screenshot => {
		callback(null, screenshot);
	});
};

// Save image to disk
const saveImageBufferToDisk = (fileName, imageBuffer, callback) => {
	console.log('Saving to disk:', fileName);
	fs.writeFile(fileName, imageBuffer, 'binary', callback);
};

// Take a request object and work on it
const processHTTPRequest = (req, res, callback) => {
	const pageURL = req.url.slice(1);
	const imageOptions = _.merge({}, defaultOptions);
	_.merge(imageOptions, url.parse(req.url, true).query);

	if (!pageURL.includes('http')) {
		// No URL
		if (callback) callback('Not valid URL');
	}
	else {
		requestsBeingProcessed++;
		console.log('Working on: %s (total %d)', pageURL, requestsBeingProcessed);
		renderUrlToImage(pageURL, imageOptions, (err, imageBuffer) => {
			requestsBeingProcessed--;
			console.log('Done with: %s (total %d)', pageURL, requestsBeingProcessed);
			if (!err) {
				res.writeHead(200, {
					'Content-Type': `image/${imageOptions.imageFormat}`,
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

// Process the incoming request if not already processing
// Else put into queue
const onIncomingHTTPRequest = (req, res) => {
	console.log('Incoming request:', req.url);
	processHTTPRequest(req, res); // Process immediately
};

const processCommandLine = () => {
	const imageOptions = _.merge({}, defaultOptions);
	async.waterfall([
			cbWaterfall => {
				for (let i = 2; i < process.argv.length; i++) {
					const arg = process.argv[i];
					if (arg.includes('http')) {
						imageOptions.url = arg;
					}
					else if (arg.includes('=')) {
						const param = arg.split('=');
						imageOptions[param[0]] = param[1];
					}
					else if (arg.includes('.')) {
						imageOptions.fileName = arg;
					}
				};
				imageOptions.fileName = imageOptions.fileName || `screenshot.${imageOptions.imageFormat}`;
				cbWaterfall(null, imageOptions);
			},
			(imageOptions, cbWaterfall) => {
				console.log('Render URL to image', imageOptions);
				renderUrlToImage(imageOptions.url, imageOptions, cbWaterfall);
			},
			(imageBuffer, cbWaterfall) => {
				saveImageBufferToDisk(imageOptions.fileName, imageBuffer, cbWaterfall);
			},
		]
	);
};

// Start server
const startWebServer = () => {
	const serverPort = process.env.PORT || 1337;
	const server = http.createServer(onIncomingHTTPRequest);

	server.listen(serverPort, () => {
		console.log(`Screenshooter service running on http://localhost:${serverPort}`);
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
