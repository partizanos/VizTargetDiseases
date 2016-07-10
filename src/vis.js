var cttvApi = require('cttv.api');
var tntTooltip = require('tnt.tooltip');
var flowerView = require("cttv.flowerView");

var vis = function() {
    "use strict";
    var config = {
        size: 500,
        filter: null
    };

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

        // var zoom = d3.behavior.zoom()
        //     .scaleExtent([1, 10])
        //     .on("zoom", zoomed);

        // function zoomed() {
        //     graph.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        // }

        var svg = d3.select(div)
            .append("svg")
            .attr("width", config.size)
            .attr("height", config.size)

        var graph = svg
            .append("g")
            .attr("transform", "translate(" + (radius + labelSize) + "," + (radius + labelSize) + ")")
            // .call(zoom);

        var circleColorScale = d3.scale.linear()
            .domain([0, 1])
            .range([d3.rgb(0, 82, 163), d3.rgb(182, 221, 252)]);



        d3.json("../data/sample.json", function(error, resp) {
            var data = resp.data;
            if (data.length > 100) {
                var originalData = data
                data = data.slice(0, 95);
            }

            //sort by type
            function createComparator(property) {
                return function(a, b) {
                    if (a[property] > b[property]) return 1
                    if (a[property] < b[property]) return -1
                    return 0
                };
            }
            data.sort(createComparator('type'))

            //put same type together
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
                    "population": types[i].length / data.length
                })
            }
            // console.log(dataTypes);
            render.update(data, updateScales(radius), dataTypes, 'pieChart');
        });

        render.update = function(data, circleScales, dataTypes, graphicMode) {

            if (graphicMode == 'pieChart') {
                dataTypes.sort(function compare(a, b) {
                    if (a.population > b.population) return -1;
                    if (a.population < b.population) return 1;
                    return 0;
                })

                var colorsExpr = [];
                for (i = 0; i < 10; i++) {
                    colorsExpr.push([d3.scale.category20().range()[i * 2], d3.scale.category20().range()[i * 2 + 1]])
                }


                //Give color mechanism depednding on the datatype
                var allColors = [
                    [d3.rgb(0, 82, 163), d3.rgb(182, 221, 252)],
                    ["#ff0000", "#ffffcc"],
                    ["#ffa500", "#ffe4b2"],
                    ["#4A5D23", "#90EE90"],
                    ["#ffff00", "#ffffb2"],
                    ["#d0743c", "#ff8c00"]
                ];


                var allColorsExp = {};
                for (i = 0; i < dataTypes.length; i++) {
                    var colType = dataTypes[i].type

                    allColorsExp[colType] = [
                        d3.scale.category20().range()[i % 10 * 2],
                        d3.scale.category20().range()[i % 10 * 2 + 1]
                    ]

                }
                // var allColorsExp = {
                //     "shared-targets": [d3.rgb(0, 82, 163), d3.rgb(182, 221, 252)],
                //     "shared-drugs": ["#ff0000", "#ffffcc"],
                //     "shared-phenotypes": ["#ffa500", "#ffe4b2"],
                //     "shared-diseases": ["#4A5D23", "#90EE90"]
                //         // ,
                //         // ["#ffff00", "#ffffb2"],
                //         // ["#d0743c", "#ff8c00"]
                // };

                function circleColorScaleExp(type) {
                    return d3.scale.linear()
                        .domain([0, 1])
                        .range(allColorsExp[type]);
                }

                function giveColor(i) {
                    return d3.scale.linear()
                        .domain([0, 105])
                        .range([allColors[i][0], allColors[i][1]])
                }

                function giveArcColor(type) {
                    return d3.scale.linear()
                        .domain([0, 105])
                        .range([allColorsExp[type][0], allColorsExp[type][1]])
                }
                //create arcs equivalent of rings
                var arcs = [];
                for (var i = 0; i < 5; i++) {
                    var arc = d3.svg.arc()
                        .outerRadius(radius - (i * radius / 5))
                        .innerRadius(radius - (i * radius / 5) - radius / 5);

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

                var g = graph.selectAll(".arc")
                    .data(pie(dataTypes))
                    .enter().append("g")
                    // .attr("class", "arc");

                for (i = 0; i < 5; i++) {
                    g
                        .append("path")
                        .attr("d", arcs[i])
                        //Give color based on datatype
                        .style("fill", function(d) {
                            return giveArcColor(d.data.type)(i * 20)
                        })
                        .on("click", function(d) {
                            var selDataType = d.data.type
                            d3.selectAll("g path").remove();
                            var rings = graph
                                .selectAll(".ring")
                                .data(circleScales);

                            rings
                                .enter()
                                .append("path")
                                .attr("class", "ring")
                                .attr("fill", function(d) {
                                    return circleColorScaleExp(selDataType)(d.domain()[0]);
                                    // return circleColorScale(d.domain()[0]);
                                })
                                .attr("d", function(d) {
                                    var arc = d3.svg.arc()
                                        .innerRadius(d.range()[0])
                                        .outerRadius(d.range()[1])
                                        .startAngle(0)
                                        .endAngle(2 * Math.PI);
                                    return arc(d);
                                })

                            rings
                                .on("click", function(d, i) {
                                    // One ring has been selected
                                    var selected = d3.select(this);
                                    if (selected.classed("zoomed")) {
                                        selected.classed("zoomed", false);
                                        render.update(data, updateScales(radius), dataTypes, 'rings');
                                    } else {
                                        selected.classed("zoomed", true);
                                        render.update(data, updateScales(radius, d), dataTypes, 'rings');
                                    }
                                });

                            console.log(rings)

                            // rings
                            //     .transition()
                            //     .duration(transitionSpeed)
                            //     .attrTween("d", function(d) {
                            //         var interpolate = d3.interpolate(0.1, 2 * Math.PI);
                            //         return function(t) {
                            //             d.endAngle = interpolate(t);
                            //             return arc(d);
                            //         };
                            //     })

                            /////////////PROB PART
                            // rings.transition()
                            //     .duration(750)
                            //     .call(arcTween, Math.random() * 2 * Math.PI);
                            ///////////


                            function arcTween(transition, newAngle) {
                                // debugger;
                                transition.attrTween("d", function(d) {
                                    var interpolate = d3.interpolate(0, 2 * Math.PI);
                                    return function(t) {
                                        d.endAngle = interpolate(t);
                                        return arc(d);
                                    };
                                });
                            }

                            // rings
                            //     .transition()
                            //     .duration(transitionSpeed)
                            //     .attr("d", function(d, i) {
                            //         var arc = d3.svg.arc()
                            //             .innerRadius(circleScales[i].range()[0] + 0.1) // Have to add 0.1 otherwise it doesn't transition correctly
                            //             .outerRadius(circleScales[i].range()[1] + 0.1) // Have to add 0.1 otherwise it doesn't transition correctly
                            //             .startAngle(0)
                            //             .endAngle(2 * Math.PI);
                            //         return arc(d, i);
                            //     });

                            //on background change bring points to foreground
                            d3.selection.prototype.moveToFront = function() {
                                return this.each(function() {
                                    this.parentNode.appendChild(this);
                                });
                            };
                            d3.selectAll('circle').moveToFront()
                            d3.selectAll('line').moveToFront()

                        });
                }

                g.append("text")
                    // .attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
                    .style("margin", "3px")
                    .attr("transform", function(d) {
                        var grades = ((d.startAngle + d.endAngle) / 2) * 180 / Math.PI;
                        // var x = graphSize / 2 * Math.cos(d.startAngle + d.endAngle) / 2;
                        // var y = graphSize / 2 * Math.sin(d.startAngle + d.endAngle) / 2;
                        if (grades > 0 && grades < 180){
                            var x = (-200 + graphSize) / 2 * Math.cos(((d.startAngle + d.endAngle) / 2) - Math.PI / 2);
                            var y = (-200 + graphSize) / 2 * Math.sin(((d.startAngle + d.endAngle) / 2) - Math.PI / 2);
                            return "translate(" + x + "," + y + ") rotate(" + (grades - 90) + ")";
                        }else{
                            var x = (-25 + graphSize) / 2 * Math.cos(((d.startAngle + d.endAngle) / 2) - Math.PI / 2);
                            var y = (-25 + graphSize) / 2 * Math.sin(((d.startAngle + d.endAngle) / 2) - Math.PI / 2);
                            return "translate(" + x + "," + y + ") rotate(" + (grades - 90+180) + ")";
                                            }})
                    .style("font-size", "13px")
                    .attr("dy", ".35em")
                    .text(function(d) {
                        return d.data.type;
                    });
                // d3.selectAll('text').moveToFront()
                // d3.selectAll('text').moveToFront()
                function type(d) {
                    d.population = +d.population;
                    return d;
                }



            } else if (graphicMode == 'rings') {
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
            }
            drawData()

            function drawData() {
                // Calculate coords for each data point
                // var stepRad = 3.5; // grades
                var stepRad = 3.8; // grades
                // var currAngle = 0;
                var currAngle = 3 * Math.PI / 2 + 0.03;

                for (var i = 0; i < data.length; i++) {
                    var p = data[i];
                    var scale = circleScales[~~((1 - p.value) / 0.2)];
                    var coords = point(scale(1 - p.value), currAngle);
                    p.x = coords[0];
                    p.y = coords[1];
                    p.angle = currAngle;
                    currAngle += (stepRad * 2 * Math.PI / 360);
                }

                // Links
                links = graph.selectAll(".openTargets_d-d_overview_link")
                    .data(data, function(d) {
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
                    .data(data, function(d) {
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
                labels = graph.selectAll(".openTargets_d-d_overview_label")
                    .data(data, function(d) {
                        return d.object + "-" + d.subject;
                    });
                labels
                    .enter()
                    .append("g")
                    .attr("class", "openTargets_d-d_overview_label selected")
                    // Create the SVG container, and apply a transform such that the origin is the
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
        /*jshint validthis: true */
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
