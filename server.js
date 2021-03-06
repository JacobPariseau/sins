process.env.NODE_ENV = process.env.NODE_ENV || 'development';

let config = require('./config/config'),
  mongoose = require('./config/mongoose'),
  express = require('./config/express');

const exists = require('fs').existsSync;
const sslEh = !!exists('./privkey.pem');
console.log('SSL' + sslEh);

let db = mongoose(),
  app = express();

app.set('port', sslEh ? 443 : 80);
app.listen(app.get('port'));

if(sslEh) {
  const http = require('http');
  http.createServer(function(req, res) {
    res.writeHead(301, { 'Location': 'https://' + req.headers.host + req.url });
    res.end();
  }).listen(80);
}
module.exports = app;
console.log(process.env.NODE_ENV + ' server running at http://localhost:' + config.port);
