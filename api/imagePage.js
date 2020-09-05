//
// Name:    imagePage.js
// Purpose: Return HTML page of an image in full screen
// Creator: Tom Söderlund
//

'use strict'

const { parseRequestQuery } = require('./_helpers')

const getImage = async function (req, res) {
  try {
    const query = parseRequestQuery(req.url)
    if (!query.url) throw new Error(`No "url" specified: ${req.url}`)
    const imageUrl = decodeURIComponent(query.url)
    const { width = 800, height = 450, backgroundColor = 'black', fit = 'cover', position = 'center' } = query
    res.setHeader('Content-Type', 'text/html')
    res.setHeader('cache-control', 'public, max-age=31536000') // 1 year
    const content = `<!DOCTYPE>
<html lang="en">
<head>
<title>${imageUrl}</title>
<meta charSet="utf-8"/>
<meta name="viewport" content="initial-scale=1.0, width=device-width"/>
<meta name="x-headers-host" content="${req.headers['x-forwarded-proto']},${req.headers['x-forwarded-host']},${req.headers.host}"/>
<style type="text/css">
  * {
    margin: 0;
    padding: 0;
  }

  body {
    background-color: ${backgroundColor};
  }

  #imgBox {
    width: ${width}px;
    height: ${height}px;
    background-image: url("${imageUrl}");
    background-repeat: no-repeat;
    background-position: ${position};
    background-size: ${fit};
  }
</style>
</head>
<body>
  <div id="imgBox"></div>
</body>
</html>`
    res.end(content)
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/html')
    res.end(`<h1>Server Error</h1><p>Sorry, there was a problem: ${err.message}</p>`)
    console.error(err.message)
  }
}

// Routes

module.exports = getImage
