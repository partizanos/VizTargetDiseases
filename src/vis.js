var cttvApi = require('cttv.api');
var tntTooltip = require('tnt.tooltip');
var flowerView = require("cttv.flowerView");

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

        // draw circles / rings

        var circleScale = d3.scale.linear()
            .domain([0, 1])
            .range([0, graphSize/2]);

        var circleColorScale = d3.scale.linear()
            .domain([0,1])
            .range([d3.rgb(0,82,163), d3.rgb(182,221,252)]);
            //.range(["#0000FF", "#2ECCFA"]);

        var circlesSize = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

        var rings = graph
            .selectAll(".ring")
            .data(circlesSize.slice(0,circlesSize.length-1))
            .enter()
            .append("path")
            .attr("class", "ring")
            .attr("d", function (d, i) {
                var arc = d3.svg.arc()
                    .innerRadius(circleScale(circlesSize[i]))
                    .outerRadius(circleScale(circlesSize[i+1]))
                    .startAngle(0) //converting from degs to radians
                    .endAngle(2*Math.PI); //just radians
                return arc(d, i);
            })
            .attr("fill", function (d, i) {
                return circleColorScale(circlesSize[i]);
            });

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


                links = graph.selectAll(".openTargets_d-d_overview_link")
                    .data(data, function (d) {
                        return d.object + "-" + d.subject;
                    })
                    .enter()
                    .append("line")
                    .attr("class", "openTargets_d-d_overview_link unselected")
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

                points = graph.selectAll(".openTargets_d-d_overview_node")
                    .data(data, function (d) {
                        return d.object + "-" + d.subject;
                    })
                    .enter()
                    .append("circle")
                    .attr("class", "openTargets_d-d_overview_node selected")
                    .attr("cx", function (d) {
                        return d.x;
                    })
                    .attr("cy", function (d) {
                        return d.y;
                    })
                    .attr("r", 5)
                    .attr("fill", "navy")
                    .on("mouseout", unselect)
                    .on("mouseover", select)
                    .on("click", tooltip);


                labels = graph.selectAll(".openTargets_d-d_overview_label")
                    .data(data, function (d) {
                        return d.object + "-" + d.subject;
                    })
                    .enter()
                    .append("g")
                    .attr("transform", function (d) {
                        var grades = d.angle * 360 / (2*Math.PI);
                        var x = graphSize/2 * Math.cos(d.angle);
                        var y = graphSize/2 * Math.sin(d.angle);

                        return "translate(" + x + "," + y + ")";
                    })
                    .attr("class", "openTargets_d-d_overview_label selected")
                    .append("text")
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
                        if (grades % 360 > 90 && grades % 360 < 275) {
                            return "rotate(" + ((grades % 360) + 180) + ")";
                        }
                        return "rotate(" + (grades % 360) + ")";
                    })
                    .on("mouseover", select)
                    .on("mouseout", unselect)
                    .on("click", tooltip);
            });

    };

    function tooltip (d) {
        console.log(d);
         var obj = {};
         obj.header = d.object;
         obj.rows = [];
         obj.rows.push({
             value: "<div id=openTargetsD-DFlowerView></div>"
         });
         tntTooltip.list()
             .width(180)
             .show_closer(true)
             /*jshint validthis: true */
             .call (this, obj);

         var flower = flowerView()
             .values([
                 {
                     "value": d.value,
                     "label": "Targets",
                     "active": true
                 },
                 {
                     "value": 0,
                     "label": "Phenotypes",
                     "active": true
                 },
                 {
                     "value": 0,
                     "label": "Ontology",
                     "active": true
                 }
             ])
             .diagonal(200);

         flower(document.getElementById("openTargetsD-DFlowerView"));

    }

    // private methods
    function select (d) {
        /*jshint validthis: true */
        var selectNode = this;
        links
            .each (function (l) {
                var checkLink = this;
                if (d.object === l.object) {
                    d3.select(checkLink)
                        .classed("unselected", false)
                        .classed("selected", true);
                } else {
                    d3.select(checkLink)
                        .classed("selected", false)
                        .classed("unselected", true);
                }
            });
        labels
            .each (function (l) {
                var checkLabel = this;
                if (d.object === l.object) {
                    d3.select(checkLabel)
                        .classed("unselected", false)
                        .classed("selected", true);
                } else {
                    d3.select(checkLabel)
                        .classed("selected", false)
                        .classed("unselected", true);
                }
            });
        points
            .each(function (p) {
                var checkNode = this;
                if (p.object === d.object) {
                    d3.select(checkNode)
                        .classed("unselected", false)
                        .classed("selected", true);
                } else {
                    d3.select(checkNode)
                        .classed("selected", false)
                        .classed("unselected", true);
                }
            });
    }

    function unselect () {
        links
            .each(function () {
                d3.select(this)
                    .classed("selected", false)
                    .classed("unselected", true);
            });
        labels
            .each(function () {
                d3.select(this)
                    .classed("selected", true)
                    .classed("unselected", false);
            });
        points
            .each(function () {
                d3.select(this)
                    .classed("selected", true)
                    .classed("unselected", false);
            });
    }

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
