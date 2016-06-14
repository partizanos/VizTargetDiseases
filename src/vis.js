var cttvApi = require('cttv.api');
var tooltip = require("./tooltip.js");

var vis = function () {
    "use strict";
    var config = {
        size: 500,
        filter: null,
        disease: "EFO_0004591"
    };

    var labelSize = 100;

    var transitionSpeed = 1000;

    var points, labels, links;

    var selectedDomain;

    var api = cttvApi()
        .prefix("http://test.targetvalidation.org:8899/api/")
        .appname("cttv-web-app")
        .secret("2J23T20O31UyepRj7754pEA2osMOYfFK");

    var render = function (div) {

        var graphSize = config.size - (labelSize*2);
        var radius = graphSize/2;

        // svg
        var svg = d3.select(div)
            .append("div")
            .style("position", "relative")
            .append("svg")
            .attr("width", config.size)
            .attr("height", config.size);

        var graph = svg
            .append("g")
            .attr("transform", "translate(" + (radius + labelSize) + "," + (radius + labelSize) + ")");

        var circleColorScale = d3.scale.linear()
            .domain([0,1])
            .range([d3.rgb(0,82,163), d3.rgb(182,221,252)]);

        // get data
        var url = api.url.diseaseRelation({
            id: config.disease
        });
        console.log(url);

        // d3.json("../data/sample.json", function(error, resp) {
        //     var data = resp.data;
        api.call(url)
            .then (function (resp) {
               var data = resp.body.data;
               console.log(data);
               render.update(data, updateScales(radius));
        });

        render.update = function (data, circleScales) {
            // Rings
            var rings = graph
                .selectAll(".ring")
                .data(circleScales);
                // .data(currCirclesSize.slice(0,currCirclesSize.length-1), function (d) {
                //     return d;
                // });
            rings
                .enter()
                .append("path")
                .attr("class", "ring")
                .attr("fill", function (d) {
                    return circleColorScale(d.domain()[0]);
                })
                .attr("d", function (d) {
                    var arc = d3.svg.arc()
                        .innerRadius(d.range()[0])
                        .outerRadius(d.range()[1])
                        .startAngle(0)
                        .endAngle(2*Math.PI);
                    return arc(d);
                })
                .on("click", function (d, i) {
                    // One ring has been selected
                    var selected = d3.select(this);
                    if (selected.classed("zoomed")) {
                        selected.classed("zoomed", false);
                        unselect();
                        selectedDomain = undefined;
                        render.update(data, updateScales(radius));
                    } else {
                        selected.classed("zoomed", true);
                        // Since zoomed, gray out non zoomed labels and nodes
                        var dom = d.domain();
                        selectedDomain = dom;
                        select(function (d) {
                            // If it is a link return false always
                            if (this.nodeName === "line") {
                                return false;
                            }
                            return (((1-d.value) > dom[0]) && ((1-d.value) < dom[1]));
                        });
                        // update
                        render.update(data, updateScales(radius, d));
                    }
                });
            rings
                .transition()
                .duration(transitionSpeed)
                .attr("d", function (d, i) {
                    var arc = d3.svg.arc()
                        .innerRadius(circleScales[i].range()[0] + 0.1) // Have to add 0.1 otherwise it doesn't transition correctly
                        .outerRadius(circleScales[i].range()[1] + 0.1) // Have to add 0.1 otherwise it doesn't transition correctly
                        .startAngle(0)
                        .endAngle(2*Math.PI);
                    return arc(d, i);
                });

            // Calculate coords for each data point
            var stepRad = 25.2; // grades
            var currAngle = 0;

            for (var i=0; i<data.length; i++) {
                var p = data[i];
                var scale = circleScales[~~((1-p.value)/0.2)];
                var coords = point(scale(1 - p.value), currAngle);

                p.x = coords[0];
                p.y = coords[1];
                p.angle = currAngle;
                currAngle += (stepRad * 2 * Math.PI / 360);
            }

            // Links
            links = graph.selectAll(".openTargets_d-d_overview_link")
                .data(data, function (d) {
                    return d.object + "-" + d.subject;
                });
            links
                .enter()
                .append("line")
                .style("stroke", "navy")
                .attr("class", "openTargets_d-d_overview_link unselected");
            links
                .transition()
                .duration(transitionSpeed)
                .attr("x1", function (d) {
                    return d.x;
                })
                .attr("y1", function(d) {
                    return d.y;
                })
                .attr("x2", function(d) {
                    return radius * Math.cos(d.angle);
                })
                .attr("y2", function(d) {
                    return radius * Math.sin(d.angle);
                });

            // Nodes
            points = graph.selectAll(".openTargets_d-d_overview_node")
                .data(data, function (d) {
                    return d.object + "-" + d.subject;
                });
            points
                .enter()
                .append("circle")
                .attr("class", "openTargets_d-d_overview_node selected")
                .on("mouseout", function (d) {
                    unselect(function (p) {
                        if (selectedDomain) {
                            return (((1-p.value) > selectedDomain[0]) && ((1-p.value) < selectedDomain[1]));
                        }
                        return true;
                    });
                })
                .on("mouseover", function (d) {
                    select(function (p) {
                        return p.object == d.object;
                    });
                })
                .on("click", tooltip);
            points
                .transition()
                .duration(transitionSpeed)
                .attr("cx", function (d) {
                    return d.x;
                })
                .attr("cy", function (d) {
                    return d.y;
                })
                .attr("r", 5)
                .attr("fill", "navy");

            // Labels
            labels = graph.selectAll(".openTargets_d-d_overview_label")
                .data(data, function (d) {
                    return d.object + "-" + d.subject;
                });
            labels
                .enter()
                .append("g")
                .attr("class", "openTargets_d-d_overview_label selected")
                .attr("transform", function (d) {
                    var grades = d.angle * 360 / (2*Math.PI);
                    var x = graphSize/2 * Math.cos(d.angle);
                    var y = graphSize/2 * Math.sin(d.angle);

                    return "translate(" + x + "," + y + ")";
                })
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
                .on("mouseover", function (d) {
                    select (function (l) {
                        return d.object == l.object;
                    });
                })
                .on("mouseout", function (d) {
                    unselect(function (p) {
                        if (selectedDomain) {
                            return (((1-p.value) > selectedDomain[0]) && ((1-p.value) < selectedDomain[1]));
                        }
                        return true;
                    });
                })
                .on("click", tooltip);
        };
    };

    function updateScales (radius, selected) {
        var circleScales = [
            d3.scale.linear().domain([0.0, 0.2]).range([0,1*radius/5]).clamp(true),
            d3.scale.linear().domain([0.2, 0.4]).range([1*radius/5, 2*radius/5]).clamp(true),
            d3.scale.linear().domain([0.4, 0.6]).range([2*radius/5, 3*radius/5]).clamp(true),
            d3.scale.linear().domain([0.6, 0.8]).range([3*radius/5, 4*radius/5]).clamp(true),
            d3.scale.linear().domain([0.8, 1.0]).range([4*radius/5, 5*radius/5]).clamp(true),
        ];

        if (!selected) {
            return circleScales;
        }

        // We are focusing on a scale
        var newScales = [];
        var currRad = 0;
        for (var i=0; i<circleScales.length; i++) {
            var scale = circleScales[i];
            if (selected.domain()[0] == scale.domain()[0]) {
                var outerRad = radius-(10*(circleScales.length-i-1));
                scale.range([currRad, outerRad]);
                //currRad = radius-currRad;
                currRad = outerRad;
            } else {
                scale.range([currRad, currRad+10]);
                currRad += 10;
            }
            newScales.push(scale);
        }
        return newScales;
    }


    // private methods
    function select (cb) {
        links
            .each (function (l) {
                var checkLink = this;
                if (cb.call(checkLink, l)) {
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
                if (cb.call(checkLabel, l)) {
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
            .each (function (p) {
                var checkNode = this;
                if (cb.call(checkNode, p)) {
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

    function unselect (cb) {
        if (!cb) {
            cb = function () {return true;};
        }
        links
            .each(function (l) {
                if (cb(l)) {
                    d3.select(this)
                        .classed("selected", false)
                        .classed("unselected", true);
                }
            });
        labels
            .each(function (l) {
                if (cb(l)) {
                    d3.select(this)
                        .classed("selected", true)
                        .classed("unselected", false);
                }
            });
        points
            .each(function (p) {
                if (cb(p)) {
                    d3.select(this)
                        .classed("selected", true)
                        .classed("unselected", false);
                }
            });
    }

    function point (l, r) {
        var x = l * Math.cos(r);
        var y = l * Math.sin(r);
        return [x,y];
    }

    // Public methods
    render.disease = function (d) {
        if (!arguments.length) {
            return config.disease;
        }
        config.disease = d;
        return this;
    };

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
