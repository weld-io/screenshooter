//
// Name:    imageScreenshot.js
// Purpose: Return screenshot of an image
// Creator: Tom Söderlund
//

'use strict'

const { parseRequestQuery, queryObjectToString, fetchImageWithPuppeteer } = require('./_helpers')

const getImage = async function (req, res) {
  try {
    const query = parseRequestQuery(req.url)
    if (!query.url) throw new Error(`No "url" specified: ${req.url}`)
    const { width, height, backgroundColor, fit, position } = query
    const imageUrl = decodeURIComponent(query.url)
    const imagePageOptions = queryObjectToString({ width, height, backgroundColor, fit, position, url: imageUrl })
    const pageUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/imagePage${imagePageOptions}`
    console.log('imageScreenshot:', { imageUrl, pageUrl })
    const options = {
      ...query,
      width: query.width ? parseInt(query.width) : undefined,
      height: query.height ? parseInt(query.height) : undefined,
      loadExtraTime: query.time || 0
    }
    // Get image
    const image = await fetchImageWithPuppeteer(pageUrl, options)
    res.setHeader('content-type', 'image/' + (options.format || 'jpeg'))
    res.setHeader('cache-control', 'public, max-age=31536000') // 1 year
    res.end(image)
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/html')
    res.end(`<h1>Server Error</h1><p>Sorry, there was a problem: ${err.message}</p>`)
    console.error(err.message)
  }
}

// Routes

module.exports = getImage
