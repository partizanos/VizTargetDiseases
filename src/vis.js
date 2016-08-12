var cttvApi = require('cttv.api');
var tntTooltip = require('tnt.tooltip');
var flowerView = require("cttv.flowerView");

var vis = function() {
    "use strict";
    var config = {
        size: 500,
        filter: null
    };
    var graph;

    var labelSize = 100;
    var transitionSpeed = 1000;
    var points, labels, links;
    var api = cttvApi()
        .prefix("http://test.targetvalidation.org:8899/api/")
        .appname("cttv-web-app")
        .secret("2J23T20O31UyepRj7754pEA2osMOYfFK");

    var render = function(div) {
        var graphSize = config.size - (labelSize * 2);
        var radius = graphSize / 2;

        var svg = d3.select(div)
            .append("svg")
            .attr("width", config.size)
            .attr("height", config.size)
            .append("g")
            .attr("transform", "translate(" + (radius + labelSize) + "," + (radius + labelSize) + ")")
            .attr("id", "pieChart")


        var circleColorScale = d3.scale.linear()
            .domain([0, 1])
            .range([d3.rgb(0, 82, 163), d3.rgb(182, 221, 252)]);

        d3.json("../data/sample.json", function(error, resp) {
            var data = resp.data;
            if (data.length > 100) {
                var originalData = data
                data = data.slice(0, 95);
            }



            render.update(data, updateScales(radius), 'pieChart');
        });
        ////////////
        // var graph;
        ////////


        var b = {
            w: 100,
            h: 30,
            s: 3,
            t: 10
        };
        // Generate a string that describes the points of a breadcrumb polygon.


        render.update = function(data, circleScales, graphicMode, vizType) {
            // debugger;
            function updateBreadcrumbs(nodeArray) {

                function breadcrumbPoints(d, i) {
                    var points = [];
                    points.push("0,0");
                    points.push(b.w + ",0");
                    points.push(b.w + b.t + "," + (b.h / 2));
                    points.push(b.w + "," + b.h);
                    points.push("0," + b.h);
                    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
                        points.push(b.t + "," + (b.h / 2));
                    }
                    return points.join(" ");
                }

                // Add the svg area.
                var trail = d3.select("#sequence").append("svg:svg")
                    // .attr("width", 1200)
                    // .attr("height", 50)
                    .attr("id", "trail");

                // Data join; key function combines name and depth (= position in sequence).
                var g = d3.select("#trail")
                    .selectAll("g")
                    .data(nodeArray, function(d) {
                        return d.name + d.depth;
                    });

                // Add breadcrumb and label for entering nodes.
                var entering = g.enter().append("svg:g");

                entering.append("svg:polygon")
                    .attr("points", breadcrumbPoints)
                    .style("fill", function(d) {
                        if (d.name == 'Home') {
                            return '#DCDCDC';
                        }
                        return allColorsExp[d.name][1]
                    })
                    .on("click", function(d, i) {
                        // debugger;
                        // alert("render.update(data, updateScales(radius), 'rings', selDataType)");
                        path = path.data(pie(dataTypes))
                            .attr("fill", function(d, i) {
                                return allColorsExp[(d.data.type)][0];
                            });

                        path.transition().duration(500).attrTween("d", function(a) {
                            var i = d3.interpolate(this._current, a) //,
                                // k = d3.interpolate(arc.outerRadius()(), newRadius);
                            this._current = i(0);
                            return function(t) {
                                return arc(i(t));
                                // return arc.innerRadius(k(t) / 4).outerRadius(k(t))(i(t));
                            };
                        });
                        // d3.select('#pieChart').html('');
                        // render.update(data, updateScales(radius), 'pieChart');
                    })

                entering.append("svg:text")
                    .attr("x", (b.w + b.t) / 2)
                    .attr("y", b.h / 2)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "middle")
                    .text(function(d) {
                        return d.name;
                    })
                    .on("click", function(d, i) {
                        // alert("render.update(data, updateScales(radius), 'rings', selDataType)");
                        path = path.data(pie(dataTypes))
                            .attr("fill", function(d, i) {
                                return allColorsExp[(d.data.type)][0];
                            });

                        path.transition().duration(500).attrTween("d", function(a) {
                            var i = d3.interpolate(this._current, a) //,
                                // k = d3.interpolate(arc.outerRadius()(), newRadius);
                            this._current = i(0);
                            return function(t) {
                                return arc(i(t));
                                // return arc.innerRadius(k(t) / 4).outerRadius(k(t))(i(t));
                            };
                        });
                        // render.update(data, updateScales(radius), 'pieChart');
                    });

                // Set position for entering and updating nodes.
                g.attr("transform", function(d, i) {
                    return "translate(" + i * (b.w + b.s) + ", 0)";
                });
            }


            if (graphicMode == 'pieChart') {
                d3.selectAll("#sequence svg").remove();
                d3.selectAll("g text").remove();
                d3.selectAll("line").remove();
                d3.selectAll("circle").remove();
                updateBreadcrumbs([{ name: 'Home' }]);

                function createComparator(property) {
                    return function(a, b) {
                        if (a[property] > b[property]) return 1
                        if (a[property] < b[property]) return -1
                        return 0
                    };
                }

                data.sort(createComparator('type'))

                var types = {}
                for (var i = 0; i < data.length; i++) {
                    if (types[data[i].type] == undefined)
                        types[data[i].type] = []
                    types[data[i].type].push(data[i])
                }
                // portion of circle per data type
                var dataTypes = [];
                for (i in types) {
                    dataTypes.push({
                        "type": i,
                        "population": types[i].length / data.length,
                        "count": types[i].length
                    })
                }
                dataTypes.sort(function compare(a, b) {
                    if (a.population > b.population) return -1;
                    if (a.population < b.population) return 1;
                    return 0;
                })

                //Create colors mapping to data Types
                var colorsExpr = [];
                for (i = 0; i < 10; i++) {
                    colorsExpr.push([d3.scale.category20().range()[i * 2], d3.scale.category20().range()[i * 2 + 1]])
                }

                var allColorsExp = {};
                for (i = 0; i < dataTypes.length; i++) {
                    allColorsExp[dataTypes[i].type] = [
                        d3.scale.category20().range()[i % 10 * 2],
                        d3.scale.category20().range()[i % 10 * 2 + 1]
                        // d3.scale.category20().range()[i % 10 * 2 + 1],
                        // d3.scale.category20().range()[i % 10 * 2]
                    ]
                }

                function circleColorScaleExp(type) {
                    return d3.scale.linear()
                        .domain([0, 1])
                        .range(allColorsExp[type]);
                }

                function giveArcColor(type) {
                    return d3.scale.linear()
                        .domain([0, 105])
                        .range([allColorsExp[type][0], allColorsExp[type][1]])
                }
                //create arcs equivalent of rings
                var arcs = [];
                for (var i = 0; i < 1; i++) {
                    var arc = d3.svg.arc()
                        .outerRadius(radius - (i * radius))
                        .innerRadius(radius - (i * radius) - radius);

                    arcs.push(arc);
                }

                var labelArc = d3.svg.arc()
                    .outerRadius(radius - 40)
                    .innerRadius(radius - 40);

                var pie = d3.layout.pie()
                    .sort(null)
                    .value(function(d) {
                        return d.population;
                    });

                var arc = d3.svg.arc()
                    .outerRadius(radius)
                    .innerRadius(0)

                var path = svg
                    .selectAll("path")
                    .data(pie(dataTypes))
                    .enter().append("path")
                    //Give color based on datatype
                    .attr("fill", function(d, i) {
                        return allColorsExp[d.data.type][0];
                    })
                    .attr("d", arc)
                    .each(function(d) { this._current = d; }) // store the initial values
                    .on("click", function(d) {
                        var tempDataTypes = JSON.parse(JSON.stringify(dataTypes));
                        for (var i in tempDataTypes) {
                            if (tempDataTypes[i].type == d.data.type)
                                tempDataTypes[i].population = 1;
                            else {
                                tempDataTypes[i].population = 0;
                            }
                        }

                        path = path.data(pie(tempDataTypes))
                            .attr("fill", function(d, i) {
                                return allColorsExp[(d.data.type)][0];
                            });

                        path.transition().duration(500).attrTween("d", function(a) {
                            var i = d3.interpolate(this._current, a) //,
                                // k = d3.interpolate(arc.outerRadius()(), newRadius);
                            this._current = i(0);
                            return function(t) {
                                return arc(i(t));
                                // return arc.innerRadius(k(t) / 4).outerRadius(k(t))(i(t));
                            };
                        });
                        //////////////////////////
                        setTimeout(
                            function() {
                                var selDataType = d.data.type;
                                updateBreadcrumbs([{ name: 'Home', depth: 0 }, { name: selDataType, depth: 1 }]);

                                // d3.selectAll("g path").remove();
                                //////////
                                graph = d3.select("#pieChart")
                                    //////////////
                                var rings = graph
                                    .selectAll(".ring")
                                    .data(circleScales);


                                rings
                                    .enter()
                                    .append("path")
                                    /////////
                                    .style('opacity', 0)
                                    /////
                                    .attr("class", "ring")
                                    .attr("fill", function(d) {
                                        return circleColorScaleExp(selDataType)(d.domain()[0]);
                                    })
                                    .attr("d", function(d) {
                                        var arc = d3.svg.arc()
                                            .innerRadius(d.range()[0])
                                            .outerRadius(d.range()[1])
                                            .startAngle(0)
                                            .endAngle(2 * Math.PI);
                                        return arc(d);
                                    })
                                    .attr("id", function(d, i) {
                                        return "ring" + i;
                                    })


                                rings.transition()
                                    .delay(function(d, i) {
                                        return i * 50; })
                                    .duration(100)
                                    .style('opacity', 1);
                             
                                rings
                                    .on("click", function(d, i) {
                                        // One ring has been selected
                                        var selected = d3.select(this);
                                        if (selected.classed("zoomed")) {
                                            selected.classed("zoomed", false);

                                            render.update(data, updateScales(radius), 'rings', selDataType);
                                        } else {
                                            selected.classed("zoomed", true);

                                            render.update(data, updateScales(radius, d), 'rings', selDataType);
                                        }
                                    });

                                drawData(selDataType)

                                //on background change bring points to foreground
                                d3.selection.prototype.moveToFront = function() {
                                    return this.each(function() {
                                        this.parentNode.appendChild(this);
                                    });
                                };
                                d3.selectAll('circle').moveToFront()
                                d3.selectAll('line').moveToFront()

                                ///////////////////////////////////////////
                                // var selected = d3.select("#ring0")
                                // selected.classed("zoomed", true);
                                // // render.update(data, updateScales(radius, scale(x) {return output(x);}));
                                // var scales=[
                                //                 d3.scale.linear().domain([0.0, 0.2]).range([0,  radius ]).clamp(true),
                                //                 d3.scale.linear().domain([0.2, 0.4]).range([radius,radius]).clamp(true),
                                //                 d3.scale.linear().domain([0.4, 0.6]).range([radius,radius]).clamp(true),
                                //                 d3.scale.linear().domain([0.6, 0.8]).range([radius,radius]).clamp(true),
                                //                 d3.scale.linear().domain([0.8, 1]).range([radius,radius]).clamp(true)]
                                // render.update(data, scales ,'rings');
                                // render.update(data, updateScales(radius, d));
                            }, 600);
                        // var selDataType = d.data.type;
                        // updateBreadcrumbs([{ name: 'Home', depth: 0},{ name: selDataType, depth: 1 }]);

                        // d3.selectAll("g path").remove();
                        // //////////
                        //  graph = d3.select("#pieChart")
                        // //////////////
                        // var rings = graph
                        //     .selectAll(".ring")
                        //     .data(circleScales);

                        // rings
                        //     .enter()
                        //     .append("path")
                        //     .attr("class", "ring")
                        //     .attr("fill", function(d) {
                        //         return circleColorScaleExp(selDataType)(d.domain()[0]);
                        //     })
                        //     .attr("d", function(d) {
                        //         var arc = d3.svg.arc()
                        //             .innerRadius(d.range()[0])
                        //             .outerRadius(d.range()[1])
                        //             .startAngle(0)
                        //             .endAngle(2 * Math.PI);
                        //         return arc(d);
                        //     })

                        // rings
                        //     .on("click", function(d, i) {
                        //         // One ring has been selected
                        //         var selected = d3.select(this);
                        //         if (selected.classed("zoomed")) {
                        //             selected.classed("zoomed", false);

                        //             render.update(data, updateScales(radius), 'rings', selDataType);
                        //         } else {
                        //             selected.classed("zoomed", true);

                        //             render.update(data, updateScales(radius, d), 'rings', selDataType);
                        //         }
                        //     });

                        // drawData(selDataType)

                        // //on background change bring points to foreground
                        // d3.selection.prototype.moveToFront = function() {
                        //     return this.each(function() {
                        //         this.parentNode.appendChild(this);
                        //     });
                        // };
                        // d3.selectAll('circle').moveToFront()
                        // d3.selectAll('line').moveToFront()

                    });

                path.each(function(d) {
                    svg.append("text")
                        .attr("fill", "#fff")
                        .style("margin", "3px")
                        .attr("transform", function() {
                            // debugger;
                            var grades = ((d.startAngle + d.endAngle) / 2) * 180 / Math.PI;
                            if (grades > 0 && grades < 180) {
                                var x = (-200 + graphSize) / 2 * Math.cos(((d.startAngle + d.endAngle) / 2) - Math.PI / 2);
                                var y = (-200 + graphSize) / 2 * Math.sin(((d.startAngle + d.endAngle) / 2) - Math.PI / 2);
                                return "translate(" + x + "," + y + ") rotate(" + (grades - 90) + ")";
                            } else {
                                var x = (-25 + graphSize) / 2 * Math.cos(((d.startAngle + d.endAngle) / 2) - Math.PI / 2);
                                var y = (-25 + graphSize) / 2 * Math.sin(((d.startAngle + d.endAngle) / 2) - Math.PI / 2);
                                return "translate(" + x + "," + y + ") rotate(" + (grades - 90 + 180) + ")";
                            }
                        })
                        .style("font-size", "13px")
                        .attr("dy", ".35em")
                        .text(function() {
                            return d.data.type + " " + d.data.count;
                        });
                })

                function type(d) {
                    d.population = +d.population;
                    return d;
                }

            } else if (graphicMode == 'rings') {
                // graph = svg
                //     .append("g")
                //     .attr("transform", "translate(" + (radius + labelSize) + "," + (radius + labelSize) + ")")

                var rings = graph
                    .selectAll(".ring")
                    .data(circleScales);

                rings
                    .enter()
                    .append("path")
                    .attr("class", "ring")
                    .attr("fill", function(d) {
                        return circleColorScale(d.domain()[0]);
                    })
                    .attr("d", function(d) {
                        var arc = d3.svg.arc()
                            .innerRadius(d.range()[0])
                            .outerRadius(d.range()[1])
                            .startAngle(0)
                            .endAngle(2 * Math.PI);
                        return arc(d);
                    })
                    .attr("id", function(d, i) {
                        return "ring" + i;
                    })


                .on("click", function(d, i) {
                    // One ring has been selected
                    var selected = d3.select(this);
                    if (selected.classed("zoomed")) {
                        selected.classed("zoomed", false);
                        render.update(data, updateScales(radius));
                    } else {
                        selected.classed("zoomed", true);
                        render.update(data, updateScales(radius, d));
                    }
                });

                // var selected = d3.select("#ring0")
                // selected.classed("zoomed", true);

                rings
                    .transition()
                    .duration(transitionSpeed)
                    .attr("d", function(d, i) {
                        var arc = d3.svg.arc()
                            .innerRadius(circleScales[i].range()[0] + 0.1) // Have to add 0.1 otherwise it doesn't transition correctly
                            .outerRadius(circleScales[i].range()[1] + 0.1) // Have to add 0.1 otherwise it doesn't transition correctly
                            .startAngle(0)
                            .endAngle(2 * Math.PI);
                        return arc(d, i);
                    });


                /////////////////////////////////////////////////////////
                // drawData(vizType)
                var displData = [];
                for (i in data)
                    if (data[i].type == vizType)
                        displData.push(data[i])

                    // Calculate coords for each data point
                var stepRad = 2 * Math.PI * 360 / displData.length; // grades
                // var stepRad = 3.5; // grades

                var currAngle = 0;

                for (var i = 0; i < displData.length; i++) {
                    var p = displData[i];
                    var scale = circleScales[~~((1 - p.value) / 0.2)];
                    var coords = point(scale(1 - p.value), currAngle);
                    p.x = coords[0];
                    p.y = coords[1];
                    p.angle = currAngle;
                    currAngle += (stepRad * 2 * Math.PI / 360);
                }

                // Links
                links = graph.selectAll(".openTargets_d-d_overview_link")
                    .data(displData, function(d) {
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
                    .attr("x1", function(d) {
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
                    .data(displData, function(d) {
                        return d.object + "-" + d.subject;
                    });
                points
                    .enter()
                    .append("circle")
                    .attr("class", "openTargets_d-d_overview_node selected")
                    .on("mouseout", unselect)
                    .on("mouseover", select)
                    .on("click", tooltip);
                points
                    .transition()
                    .duration(transitionSpeed)
                    .attr("cx", function(d) {
                        return d.x;
                    })
                    .attr("cy", function(d) {
                        return d.y;
                    })
                    .attr("r", 3.5)
                    .attr("fill", "navy");

                // Labels
                graph.selectAll(".openTargets_d-d_overview_label").remove()
                labels = graph.selectAll(".openTargets_d-d_overview_label")
                    .data(displData, function(d) {
                        return d.object + "-" + d.subject;
                    });
                labels
                    .enter()
                    .append("g")
                    .attr("class", "openTargets_d-d_overview_label selected")
                    // Create SVG container, and apply a transform such that the origin is the
                    // center of the canvas. This way, we don't need to position arcs individually
                    .attr("transform", function(d) {
                        var grades = d.angle * 360 / (2 * Math.PI);
                        var x = graphSize / 2 * Math.cos(d.angle);
                        var y = graphSize / 2 * Math.sin(d.angle);

                        return "translate(" + x + "," + y + ")";
                    })
                    .append("text")
                    .style("font-size", "10px")
                    .style("text-anchor", function(d) {
                        var grades = d.angle * 360 / (2 * Math.PI);
                        if (grades % 360 > 90 && grades % 360 < 275) {
                            return "end";
                        }
                        return "start";
                    })
                    .text(function(d) {
                        return d.object;
                    })
                    .attr("transform", function(d) {
                        var grades = d.angle * 360 / (2 * Math.PI);
                        if (grades % 360 > 90 && grades % 360 < 275) {
                            return "rotate(" + ((grades % 360) + 180) + ")";
                        }
                        return "rotate(" + (grades % 360) + ")";
                    })
                    .on("mouseover", select)
                    .on("mouseout", unselect)
                    .on("click", tooltip);

                // drawData("diseases1")

            }

            function drawData(type) {
                var displData = [];
                for (i in data)
                    if (data[i].type == type)
                        displData.push(data[i])

                    // Calculate coords for each data point
                var stepRad = 2 * Math.PI * 360 / displData.length; // grades
                // var stepRad = 3.5; // grades

                var currAngle = 0;

                for (var i = 0; i < displData.length; i++) {
                    var p = displData[i];
                    var scale = circleScales[~~((1 - p.value) / 0.2)];
                    var coords = point(scale(1 - p.value), currAngle);
                    p.x = coords[0];
                    p.y = coords[1];
                    p.angle = currAngle;
                    currAngle += (stepRad * 2 * Math.PI / 360);
                }

                // Links
                links = graph.selectAll(".openTargets_d-d_overview_link")
                    .data(displData, function(d) {
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
                    .attr("x1", function(d) {
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
                    .data(displData, function(d) {
                        return d.object + "-" + d.subject;
                    });
                points
                    .enter()
                    .append("circle")
                    .attr("class", "openTargets_d-d_overview_node selected")
                    .on("mouseout", unselect)
                    .on("mouseover", select)
                    .on("click", tooltip);
                points
                    .transition()
                    .duration(transitionSpeed)
                    .attr("cx", function(d) {
                        return d.x;
                    })
                    .attr("cy", function(d) {
                        return d.y;
                    })
                    .attr("r", 3.5)
                    .attr("fill", "navy");

                // Labels
                graph.selectAll(".openTargets_d-d_overview_label").remove()
                labels = graph.selectAll(".openTargets_d-d_overview_label")
                    .data(displData, function(d) {
                        return d.object + "-" + d.subject;
                    });
                labels
                    .enter()
                    .append("g")
                    .attr("class", "openTargets_d-d_overview_label selected")
                    // Create SVG container, and apply a transform such that the origin is the
                    // center of the canvas. This way, we don't need to position arcs individually
                    .attr("transform", function(d) {
                        var grades = d.angle * 360 / (2 * Math.PI);
                        var x = graphSize / 2 * Math.cos(d.angle);
                        var y = graphSize / 2 * Math.sin(d.angle);

                        return "translate(" + x + "," + y + ")";
                    })
                    .append("text")
                    .style("font-size", "10px")
                    .style("text-anchor", function(d) {
                        var grades = d.angle * 360 / (2 * Math.PI);
                        if (grades % 360 > 90 && grades % 360 < 275) {
                            return "end";
                        }
                        return "start";
                    })
                    .text(function(d) {
                        return d.object;
                    })
                    .attr("transform", function(d) {
                        var grades = d.angle * 360 / (2 * Math.PI);
                        if (grades % 360 > 90 && grades % 360 < 275) {
                            return "rotate(" + ((grades % 360) + 180) + ")";
                        }
                        return "rotate(" + (grades % 360) + ")";
                    })
                    .on("mouseover", select)
                    .on("mouseout", unselect)
                    .on("click", tooltip);
            }
        };
    };

    function updateScales(radius, selected) {
        var circleScales = [
            d3.scale.linear().domain([0.0, 0.2]).range([0, 1 * radius / 5]).clamp(true),
            d3.scale.linear().domain([0.2, 0.4]).range([1 * radius / 5, 2 * radius / 5]).clamp(true),
            d3.scale.linear().domain([0.4, 0.6]).range([2 * radius / 5, 3 * radius / 5]).clamp(true),
            d3.scale.linear().domain([0.6, 0.8]).range([3 * radius / 5, 4 * radius / 5]).clamp(true),
            d3.scale.linear().domain([0.8, 1.0]).range([4 * radius / 5, 5 * radius / 5]).clamp(true),
        ];

        if (!selected) {
            return circleScales;
        }

        // We are focusing on a scale
        var newScales = [];
        var currRad = 0;
        //if it's the selected scale put it to the length of radius else put it to 0 length
        for (var i = 0; i < circleScales.length; i++) {
            var scale = circleScales[i];
            if (selected.domain()[0] == scale.domain()[0]) {
                scale.range([currRad, radius]);
                currRad = radius;
            } else {
                scale.range([currRad, currRad]);
            }
            newScales.push(scale);
        }
        return newScales;
    }

    function tooltip(d) {
        // console.log(d);
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
            .call(this, obj);

        var flower = flowerView()
            .values([{
                "value": d.value,
                init: function() {
                    this.label = "Targets: " + String(this.value * 100).slice(0, 5) + "%"
                    return this;
                },
                "active": true
            }.init(), {
                "value": 0,
                "label": "",
                "active": false
            }, {
                "value": 0,
                "label": "Phenotypes",
                "active": true
            }, {
                "value": 0,
                "label": "",
                "active": false
            }, {
                "value": 0,
                "label": "Ontology",
                "active": true
            }, {
                "value": 0,
                "label": "",
                "active": false
            }])
            .diagonal(200);

        flower(document.getElementById("openTargetsD-DFlowerView"));
    }

    // private methods
    function select(d) {
        var selectNode = this;
        links
            .each(function(l) {
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
            .each(function(l) {
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
            .each(function(p) {
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

    function unselect() {
        links
            .each(function() {
                d3.select(this)
                    .classed("selected", false)
                    .classed("unselected", true);
            });
        labels
            .each(function() {
                d3.select(this)
                    .classed("selected", true)
                    .classed("unselected", false);
            });
        points
            .each(function() {
                d3.select(this)
                    .classed("selected", true)
                    .classed("unselected", false);
            });
    }

    function point(l, r) {
        var x = l * Math.cos(r);
        var y = l * Math.sin(r);
        return [x, y];
    }

    // Public methods
    render.size = function(size) {
        if (!arguments.length) {
            return config.size;
        }
        config.size = size;
        return this;
    };

    render.filter_type = function(type) {
        points
            .style("display", function(d) {
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
