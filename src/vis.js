var cttvApi = require('cttv.api');
var tooltip = require('tnt.tooltip');

var vis = function () {
    "use strict";
    var config = {
        size: 500,
    };

    var api = cttvApi()
        .prefix("http://test.targetvalidation.org:8899/api/")
        .appname("cttv-web-app")
        .secret("2J23T20O31UyepRj7754pEA2osMOYfFK");

    var render = function (div) {
        console.log(div);

        // svg
        var svg = d3.select(div)
            .append("svg")
            .attr("width", config.size)
            .attr("height", config.size);

        // draw circles
        var circleScale = d3.scale.linear()
            .domain([0, 1])
            .range([0, config.size/2]);

        var circlesSize = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
        var cirlces = svg
            .selectAll(".circle")
            .data(circlesSize)
            .enter()
            .append("circle")
            .attr("cx", config.size/2)
            .attr("cy", config.size/2)
            .attr("r", function (d) {
                return circleScale(d);
            })
            .attr("stroke", "gray")
            .attr("fill", "none")
            .attr("class", "circle");
            // .style("stroke-width", "1px");

        // get data
        var url = api.url.diseaseRelation({
            id: "EFO_0004591"
        });
        console.log(url);

        api.call(url)
            .then (function (resp) {
                console.log(resp.body.data);
                var step = 100;
                var stepRadians = 2 * Math.PI / step;
                var currAngle = 0;
                var radius = config.size/2;

                for (var i=1; i<resp.body.data.length; i++) {
                    var p = resp.body.data[i];
                    var coords = point(circleScale(1 - p.value), currAngle);
                    currAngle += stepRadians;

                    p.x = coords[0];
                    p.y = coords[1];
                }

                var points = svg.selectAll(".points")
                    .data(resp.body.data, function (d) {
                        return d.object + "-"+ d.subject;
                    })
                    .enter()
                    .append("circle")
                    .attr("cx", function (d) {
                        return d.x;
                    })
                    .attr("cy", function (d) {
                        return d.y;
                    })
                    .attr("r", 5)
                    .attr("fill", "navy")
                    .attr("transform", "translate(" + radius + "," + radius + ")")
                    .on("click", t);

                function t (d) {
                    console.log(d);
                     var obj = {};
                     obj.header = d.subject;
                     obj.rows = [];
                     obj.rows.push({
                         "label" : "subject",
                         "value" : d.subject
                     });
                     obj.rows.push({
                         "label" : "object",
                         "value" : d.object
                     });
                     obj.rows.push({
                         "label" : "type",
                         "value" : d.type
                     });
                     obj.rows.push({
                         "label" : "value",
                         "value" : d.value
                     });
                     obj.rows.push({
                         "label" : "score",
                         "value" : d.value
                     });
                     tooltip.table()
                         .width(180)
                         .show_closer(true)
                         .call (this, obj);
                }
            });

    };

    function point (l, r) {
        var x = l * Math.cos(r);
        var y = l * Math.sin(r);
        return [x,y];
    }

    // Public methods
    render.size = function (size) {
        if (!arguments.length) {
            return config.size;
        }
        config.size = size;
        return this;
    };

    render.color = function (col) {
        if (!arguments.length) {
            return config.color;
        }
        config.color = col;
        return this;
    };

    return render;
};

module.exports = exports = vis;
