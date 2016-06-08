var lodash = require('lodash');
var aux = require('./aux.js');
var cttvApi = require('cttv.api');

var vis = function (msg) {
    console.log(msg);
    console.log(aux);
    var api = cttvApi()
        .appname("cttv-web-app")
        .secret("2J23T20O31UyepRj7754pEA2osMOYfFK");

    var url = api.url.associations({
        target: "ENSG00000132170",
        direct: true,
        outputstructure: "flat",
        facets: false,
        size: 1000,
        therapeutic_area: "efo_0000651"
    });
    console.log(url);

    api.call(url)
        .then (function (resp) {
            console.log(resp.status);
            var tree = api.utils.flat2tree(resp.body);
        });

};

module.exports = exports = vis;
