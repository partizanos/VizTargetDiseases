var cttvApi = require('cttv.api');
var tooltip = require('tnt.tooltip');

var vis = function () {
    "use strict";
    var config = {
        size: 500,
        filter: null
    };

    var labelSize = 100;

    var points, labels, links;

    var api = cttvApi()
        .prefix("http://test.targetvalidation.org:8899/api/")
        .appname("cttv-web-app")
        .secret("2J23T20O31UyepRj7754pEA2osMOYfFK");

    var render = function (div) {
        console.log(div);

        var graphSize = config.size - (labelSize*2);
        var radius = graphSize/2;

        // svg
        var svg = d3.select(div)
            .append("svg")
            .attr("width", config.size)
            .attr("height", config.size);

        var graph = svg
            .append("g")
            .attr("transform", "translate(" + (radius + labelSize) + "," + (radius + labelSize) + ")");

        // draw circles
        var circleScale = d3.scale.linear()
            .domain([0, 1])
            .range([0, graphSize/2]);

        var circlesSize = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
        var circles = graph
            .selectAll(".circle")
            .data(circlesSize)
            .enter()
            .append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", function (d) {
                return circleScale(d);
            })
            .attr("stroke", "gray")
            .attr("fill", "none")
            .attr("class", "circle");

        // get data
        // var url = api.url.diseaseRelation({
        //     id: "EFO_0004591"
        // });
        // console.log(url);

        d3.json("../data/sample.json", function(error, resp) {
            var data = resp.data;
            console.log(data);

        // api.call(url)
        //     .then (function (resp) {
                var stepRad = 25.2; // grades
                var currAngle = 0;

                for (var i=0; i<data.length; i++) {
                    var p = data[i];
                    var coords = point(circleScale(1 - p.value), currAngle);

                    p.x = coords[0];
                    p.y = coords[1];
                    p.angle = currAngle;
                    currAngle += (stepRad * 2 * Math.PI / 360);
                }

                points = graph.selectAll(".points")
                    .data(data, function (d) {
                        return d.object + "-" + d.subject;
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
                    .on("click", function (d) {
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
                         tooltip.table()
                             .width(180)
                             .show_closer(true)
                             .call (this, obj);

                    });


                labels = graph.selectAll(".label")
                    .data(data, function (d) {
                        return d.object + "-" + d.subject;
                    })
                    .enter()
                    .append("text")
                    .attr("x", function (d) {
                        var grades = d.angle * 360 / (2*Math.PI);
                        return graphSize/2 * Math.cos(d.angle);
//                        return graphSize/2 * Math.cos(grades);
                    })
                    .attr("y", function (d) {
                        return graphSize/2 * Math.sin(d.angle);
                    })
                    .attr("class", "label")
                    .style("font-size", "10px")
                    .style("text-anchor", function (d) {
                        var grades = d.angle * 360 / (2*Math.PI);
                        if (grades % 360 > 90 && grades % 360 < 275) {
                            return "end";
                        }
                        return "start";
                    })
                    .text(function(d) {
                        return d.object;
                    })
                    .attr("transform", function (d) {
                        var grades = d.angle * 360 / (2*Math.PI);
                        console.log(this);
                        console.log(d.object + " Rotate --- " + (grades % 360));
                        // return "rotate(" + (grades % 360) + ")";
                    });

                links = graph.selectAll("links")
                    .data(data, function (d) {
                        return d.object + "-" + d.subject;
                    })
                    .enter()
                    .append("line")
                    .attr("x1", function (d) {
                        return d.x;
                    })
                    .attr("y1", function(d) {
                        return d.y;
                    })
                    .attr("x2", function(d) {
                        return graphSize/2 * Math.cos(d.angle);
                    })
                    .attr("y2", function(d) {
                        return graphSize/2 * Math.sin(d.angle);
                    })
                    .style("stroke", "navy");

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

    render.filter_type = function (type) {
        points
            .style("display", function (d) {
                if (!type) {
                    return "block";
                }
                if (d.type !== type) {
                    return "none";
                }
                return "block";
            });
    };

    return render;
};

module.exports = exports = vis;
