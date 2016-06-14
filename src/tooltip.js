var tntTooltip = require('tnt.tooltip');
var flowerView = require("cttv.flowerView");
var spinner = require("cttv.spinner");
var cttvApi = require("cttv.api");
var promise = require("rsvp");

function tooltip (d) {
    var elem = this;
    var event = d3.event;
    console.log(d);
    console.log(elem);


    var spinnerTooltip = tntTooltip.plain()
         .id(d.object)
         .call(elem, {
             header: d.object,
             //body: "<img src=animatedEllipse.gif width=30/>"
             body: "<div id=diseaseLoadingSpinner></div>"
         });

     var sp = spinner()
         .size(30)
         .stroke(3);

     sp(document.getElementById("diseaseLoadingSpinner"));

     var api = cttvApi()
         .prefix("http://test.targetvalidation.org:8899/api/")
         .appname("cttv-web-app")
         .secret("2J23T20O31UyepRj7754pEA2osMOYfFK");

     // Object disease association
     var urlObject = api.url.associations({
         disease: d.object,
         fields: ['target', 'association_score.datatypes'],
         size: 1000
     });
     var objectPromise = api.call(urlObject);

    var urlSubject = api.url.associations({
        disease: d.subject,
        fields: ['target', 'association_score.datatypes'],
        size: 1000
    });
    var subjectPromise = api.call(urlSubject);

    promise.all([objectPromise, subjectPromise])
        .then (function (resps) {
            var objectTargets = {};
            var subjectTargets = {};
            var totalTargetsInObject = resps[0].body.total;
            var totalTargetsInSubject = resps[1].body.total;

            // object
            resps[0].body.data.map(function (d) {
                objectTargets[d.target.gene_info.symbol] = d;
            });

            // subject
            resps[1].body.data.map(function (d) {
                subjectTargets[d.target.gene_info.symbol] = d;
            });

            // Intersection:
            var targetsInBoth = {};
            for (var objTarget in objectTargets) {
                if (subjectTargets[objTarget]) {
                    targetsInBoth[objTarget] = 1;
                }
            }

            var obj = {};
            obj.header = d.object;
            obj.rows = [];
            obj.rows.push({
                value: "<div id=openTargetsD-DFlowerView></div>"
            });
            obj.rows.push({
                value: totalTargetsInObject + " targets associated with " + d.object
            });
            obj.rows.push({
                value: totalTargetsInSubject + " targets associated with " + d.subject
            });
            obj.rows.push({
                value: Object.keys(targetsInBoth).length + " shared targets"
            });
            tntTooltip.list()
               .id(d.object)
               .width(180)
               .show_closer(true)
               /*jshint validthis: true */
               .call (elem, obj, event);

            var flower = flowerView()
                .values([
                    {
                        "value": d.value,
                        "label": "Targets",
                        "active": true
                    },
                    {
                        "value": 0,
                        "label": "",
                        "active": false
                    },
                    {
                        "value": 0,
                        "label": "Phenotypes",
                        "active": true
                    },
                    {
                        "value": 0,
                        "label": "",
                        "active": false
                    },
                    {
                        "value": 0,
                        "label": "Ontology",
                        "active": true
                    },
                    {
                        "value": 0,
                        "label": "",
                        "active": false
                    }
                ])
                .diagonal(200);

            flower(document.getElementById("openTargetsD-DFlowerView"));

        });


}

module.exports = exports = tooltip;
