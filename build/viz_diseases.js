(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require("./index.js");

},{"./index.js":2}],2:[function(require,module,exports){
module.exports = vis = require("./src/vis.js");

},{"./src/vis.js":7}],3:[function(require,module,exports){
module.exports = require("./src/api.js");

},{"./src/api.js":4}],4:[function(require,module,exports){
var api = function (who) {

    var _methods = function () {
	var m = [];

	m.add_batch = function (obj) {
	    m.unshift(obj);
	};

	m.update = function (method, value) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			m[i][p] = value;
			return true;
		    }
		}
	    }
	    return false;
	};

	m.add = function (method, value) {
	    if (m.update (method, value) ) {
	    } else {
		var reg = {};
		reg[method] = value;
		m.add_batch (reg);
	    }
	};

	m.get = function (method) {
	    for (var i=0; i<m.length; i++) {
		for (var p in m[i]) {
		    if (p === method) {
			return m[i][p];
		    }
		}
	    }
	};

	return m;
    };

    var methods    = _methods();
    var api = function () {};

    api.check = function (method, check, msg) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.check(method[i], check, msg);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.check(check, msg);
	} else {
	    who[method].check(check, msg);
	}
	return api;
    };

    api.transform = function (method, cbak) {
	if (method instanceof Array) {
	    for (var i=0; i<method.length; i++) {
		api.transform (method[i], cbak);
	    }
	    return;
	}

	if (typeof (method) === 'function') {
	    method.transform (cbak);
	} else {
	    who[method].transform(cbak);
	}
	return api;
    };

    var attach_method = function (method, opts) {
	var checks = [];
	var transforms = [];

	var getter = opts.on_getter || function () {
	    return methods.get(method);
	};

	var setter = opts.on_setter || function (x) {
	    for (var i=0; i<transforms.length; i++) {
		x = transforms[i](x);
	    }

	    for (var j=0; j<checks.length; j++) {
		if (!checks[j].check(x)) {
		    var msg = checks[j].msg || 
			("Value " + x + " doesn't seem to be valid for this method");
		    throw (msg);
		}
	    }
	    methods.add(method, x);
	};

	var new_method = function (new_val) {
	    if (!arguments.length) {
		return getter();
	    }
	    setter(new_val);
	    return who; // Return this?
	};
	new_method.check = function (cbak, msg) {
	    if (!arguments.length) {
		return checks;
	    }
	    checks.push ({check : cbak,
			  msg   : msg});
	    return this;
	};
	new_method.transform = function (cbak) {
	    if (!arguments.length) {
		return transforms;
	    }
	    transforms.push(cbak);
	    return this;
	};

	who[method] = new_method;
    };

    var getset = function (param, opts) {
	if (typeof (param) === 'object') {
	    methods.add_batch (param);
	    for (var p in param) {
		attach_method (p, opts);
	    }
	} else {
	    methods.add (param, opts.default_value);
	    attach_method (param, opts);
	}
    };

    api.getset = function (param, def) {
	getset(param, {default_value : def});

	return api;
    };

    api.get = function (param, def) {
	var on_setter = function () {
	    throw ("Method defined only as a getter (you are trying to use it as a setter");
	};

	getset(param, {default_value : def,
		       on_setter : on_setter}
	      );

	return api;
    };

    api.set = function (param, def) {
	var on_getter = function () {
	    throw ("Method defined only as a setter (you are trying to use it as a getter");
	};

	getset(param, {default_value : def,
		       on_getter : on_getter}
	      );

	return api;
    };

    api.method = function (name, cbak) {
	if (typeof (name) === 'object') {
	    for (var p in name) {
		who[p] = name[p];
	    }
	} else {
	    who[name] = cbak;
	}
	return api;
    };

    return api;
    
};

module.exports = exports = api;
},{}],5:[function(require,module,exports){
module.exports = tooltip = require("./src/tooltip.js");

},{"./src/tooltip.js":6}],6:[function(require,module,exports){
var apijs = require("tnt.api");

var tooltip = function () {
    "use strict";

    var drag = d3.behavior.drag();
    var tooltip_div;

    var conf = {
        position : "right",
        allow_drag : true,
        show_closer : true,
        fill : function () { throw "fill is not defined in the base object"; },
        width : 180,
        id : 1
    };

    var t = function (data, event) {
        drag
            .origin(function(){
                return {
                    x : parseInt(d3.select(this).style("left")),
                    y : parseInt(d3.select(this).style("top"))
                };
            })
            .on("drag", function() {
                if (conf.allow_drag) {
                    d3.select(this)
                        .style("left", d3.event.x + "px")
                        .style("top", d3.event.y + "px");
                }
            });

        // TODO: Why do we need the div element?
        // It looks like if we anchor the tooltip in the "body"
        // The tooltip is not located in the right place (appears at the bottom)
        // See clients/tooltips_test.html for an example
        var containerElem = selectAncestor (this, "div");
        if (containerElem === undefined) {
            // We require a div element at some point to anchor the tooltip
            return;
        }

        tooltip_div = d3.select(containerElem)
            .append("div")
            .attr("class", "tnt_tooltip")
            .classed("tnt_tooltip_active", true)  // TODO: Is this needed/used???
            .call(drag);

        // prev tooltips with the same header
        d3.select("#tnt_tooltip_" + conf.id).remove();

        if ((d3.event === null) && (event)) {
            d3.event = event;
        }
        var d3mouse = d3.mouse(containerElem);
        d3.event = null;

        var xoffset = 0;
        if (conf.position === "left") {
            xoffset = conf.width;
        }

        tooltip_div.attr("id", "tnt_tooltip_" + conf.id);

        // We place the tooltip
        tooltip_div
            .style("left", (d3mouse[0] - xoffset) + "px")
            .style("top", (d3mouse[1]) + "px");

        // Close
        if (conf.show_closer) {
            tooltip_div
                .append("div")
                .attr("class", "tnt_tooltip_closer")
                .on ("click", function () {
                    t.close();
                });
        }

        conf.fill.call(tooltip_div.node(), data);

        // return this here?
        return t;
    };

    // gets the first ancestor of elem having tagname "type"
    // example : var mydiv = selectAncestor(myelem, "div");
    function selectAncestor (elem, type) {
        type = type.toLowerCase();
        if (elem.parentNode === null) {
            console.log("No more parents");
            return undefined;
        }
        var tagName = elem.parentNode.tagName;

        if ((tagName !== undefined) && (tagName.toLowerCase() === type)) {
            return elem.parentNode;
        } else {
            return selectAncestor (elem.parentNode, type);
        }
    }

    var api = apijs(t)
        .getset(conf);

    api.check('position', function (val) {
        return (val === 'left') || (val === 'right');
    }, "Only 'left' or 'right' values are allowed for position");

    api.method('close', function () {
        if (tooltip_div) {
            tooltip_div.remove();
        }
    });

    return t;
};

tooltip.list = function () {
    // list tooltip is based on general tooltips
    var t = tooltip();
    var width = 180;

    t.fill (function (obj) {
        var tooltip_div = d3.select(this);
        var obj_info_list = tooltip_div
            .append("table")
            .attr("class", "tnt_zmenu")
            .attr("border", "solid")
            .style("width", t.width() + "px");

        // Tooltip header
        if (obj.header) {
            obj_info_list
                .append("tr")
                .attr("class", "tnt_zmenu_header")
                .append("th")
                .text(obj.header);
        }

        // Tooltip rows
        var table_rows = obj_info_list.selectAll(".tnt_zmenu_row")
            .data(obj.rows)
            .enter()
            .append("tr")
            .attr("class", "tnt_zmenu_row");

        table_rows
            .append("td")
            .style("text-align", "center")
            .html(function(d,i) {
                return obj.rows[i].value;
            })
            .each(function (d) {
                if (d.link === undefined) {
                    return;
                }
                d3.select(this)
                    .classed("link", 1)
                    .on('click', function (d) {
                        d.link(d.obj);
                        t.close.call(this);
                    });
            });
    });
    return t;
};

tooltip.table = function () {
    // table tooltips are based on general tooltips
    var t = tooltip();

    var width = 180;

    t.fill (function (obj) {
        var tooltip_div = d3.select(this);

        var obj_info_table = tooltip_div
            .append("table")
            .attr("class", "tnt_zmenu")
            .attr("border", "solid")
            .style("width", t.width() + "px");

        // Tooltip header
        if (obj.header) {
            obj_info_table
                .append("tr")
                .attr("class", "tnt_zmenu_header")
                .append("th")
                .attr("colspan", 2)
                .text(obj.header);
        }

        // Tooltip rows
        var table_rows = obj_info_table.selectAll(".tnt_zmenu_row")
            .data(obj.rows)
            .enter()
            .append("tr")
            .attr("class", "tnt_zmenu_row");

        table_rows
            .append("th")
            .attr("colspan", function (d, i) {
                if (d.value === "") {
                    return 2;
                }
                return 1;
            })
            .attr("class", function (d) {
                if (d.value === "") {
                    return "tnt_zmenu_inner_header";
                }
                return "tnt_zmenu_cell";
            })
            .html(function(d,i) {
                return obj.rows[i].label;
            });

        table_rows
            .append("td")
            .html(function(d,i) {
                if (typeof obj.rows[i].value === 'function') {
                    obj.rows[i].value.call(this, d);
                } else {
                    return obj.rows[i].value;
                }
            })
            .each(function (d) {
                if (d.value === "") {
                    d3.select(this).remove();
                }
            })
            .each(function (d) {
                if (d.link === undefined) {
                    return;
                }
                d3.select(this)
                .classed("link", 1)
                .on('click', function (d) {
                    d.link(d.obj);
                    t.close.call(this);
                });
            });
    });

    return t;
};

tooltip.plain = function () {
    // plain tooltips are based on general tooltips
    var t = tooltip();

    t.fill (function (obj) {
        var tooltip_div = d3.select(this);

        var obj_info_table = tooltip_div
            .append("table")
            .attr("class", "tnt_zmenu")
            .attr("border", "solid")
            .style("width", t.width() + "px");

        if (obj.header) {
            obj_info_table
                .append("tr")
                .attr("class", "tnt_zmenu_header")
                .append("th")
                .text(obj.header);
        }

        if (obj.body) {
            obj_info_table
                .append("tr")
                .attr("class", "tnt_zmenu_row")
                .append("td")
                .style("text-align", "center")
                .html(obj.body);
        }
    });

    return t;
};

module.exports = exports = tooltip;

},{"tnt.api":3}],7:[function(require,module,exports){
// var cttvApi = require('cttv.api');
var tntTooltip = require('tnt.tooltip');
// var d3 = require('d3');
// var flowerView = require("cttv.flowerView");
//add necessary css from js so that the user doesn have to explicitely include it
//if he includes it css is not imported 
var cssId = 'myCss'; 
if (!document.getElementById(cssId))
{
    var head  = document.getElementsByTagName('head')[0];
    var link  = document.createElement('link');
    link.id   = cssId;
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = "../build/viz_diseases.css";
    link.media = 'all';
    head.appendChild(link);
}



var vis = function() {
    "use strict";
    var config = {
        allColorsExp:[],
        // allColorsExp:[],
        fontSize:"10px",
        pointSize:3.5,
        pointColor:"navy",
        size: 700,
        filter: null,
        data: [

            {
                "direction": null,
                "object": "disease1",
                "type": "diseases1",
                "value": 0.7139138126389065,
                "subject": "EFO_0004591"
            }, {
                "direction": null,
                "object": "disease1",
                "type": "diseases2",
                "value": 0.7139138126389065,
                "subject": "EFO_0004591"
            }, {
                "direction": null,
                "object": "disease1",
                "type": "diseases3",
                "value": 0.7139138126389065,
                "subject": "EFO_0004591"
            }
        ]
    };
    var graph;

    var labelSize = 100;
    var transitionSpeed = 1000;
    var points, labels, links;
    // var api = cttvApi()
    //     .prefix("http://test.targetvalidation.org:8899/api/")
    //     .appname("cttv-web-app")
    //     .secret("2J23T20O31UyepRj7754pEA2osMOYfFK");
    var dataTypes;
    var render = function(div) {

        d3.select(div).html("");
        var graphSize = config.size - (labelSize * 2);
        var radius = graphSize / 2;


        d3.select(div)
            .append("div")
            .attr("id", "sequence")
            .attr("width", config.size)
            .attr("height", 30)

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

        // d3.json("../data/sample.json", function(error, resp) {
        //     var data = resp.data;
        //     render.update(data, updateScales(radius), 'pieChart');
        // });
        // d3.json("../data/sample.json", function(error, resp) {
        //     var data = resp.data;
        // });

        var b = {
            w: 100,
            h: 30,
            s: 3,
            t: 10
        };

        render.update = function(data, circleScales, graphicMode, vizType) {

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
                dataTypes = [];
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


                function shadeColor2(color, percent) {   
                    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
                    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
                }
                // config.allColorsExp;
                var allColorsExp = {};
                if(config.allColorsExp.length!=0){
                    for(i=0; i<config.allColorsExp.length; i++){
                        allColorsExp[dataTypes[i].type] = [
                        config.allColorsExp[i],
                        shadeColor2(config.allColorsExp[i], 0.8)
                        // d3.scale.category20().range()[i % 10 * 2 + 1],
                        // d3.scale.category20().range()[i % 10 * 2]
                    ]
                    }
                }
                for (i = config.allColorsExp.length; i < dataTypes.length; i++) {
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
                        d3.selectAll("#pieChart text").style('opacity', 0);

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
                                        return i * 50;
                                    })
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
                            }, 600);
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
                        // .style("font-size", "12px")
                        .style("font-size", config.fontSize)
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

                var displData = [];
                for (i in data)
                    if (data[i].type == vizType)
                        displData.push(data[i])

                    // Calculate coords for each data point
                var stepRad = 2 * Math.PI * 360 / displData.length; // grades
                var currAngle = 0;

                for (var i = 0; i < displData.length; i++) {
                    var p = displData[i];
                    var scale = circleScales[~~((1 - p.value) / 0.2)];
                    var coords = point(scale(1 - p.value), currAngle);
                    p.x = coords[0];
                    p.y = coords[1];
                    p.angle = currAngle;
                    currAngle += (2 * Math.PI / displData.length);
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
                    .on("click",
                        tooltip
                    );
                points
                    .transition()
                    .duration(transitionSpeed)
                    .attr("cx", function(d) {
                        return d.x;
                    })
                    .attr("cy", function(d) {
                        return d.y;
                    })
                    .attr("r", config.pointSize)
                    .attr("fill", config.pointColor);

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
                    .style("font-size", config.fontSize)
                    // .style("font-size", "10px")
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
                d3.selectAll("#trail").remove()

                // Add the svg area.
                var trail = d3.select("#sequence").append("svg:svg")
                    // .attr("width", 1200)
                    .style("width", config.size)
                    .style("height", 30)
                    .attr("id", "trail");

                // Data join; key function combines name and depth (= position in sequence).
                var g = d3.select("#trail")
                    .selectAll("g")
                    .data(nodeArray, function(d) {

                        return d.name + d.depth;
                    });

                // Add breadcrumb and label for entering nodes.
                var entering = g.enter().append("svg:g");

                function renderInitialState() {
                    rings = d3.selectAll("#pieChart .ring")
                    var lines = d3.selectAll("#pieChart line")
                        // var labels=d3.selectAll("#pieChart text")
                    d3.selectAll("#pieChart text").style('opacity', 0);
                    var circles = d3.selectAll("#pieChart circle")

                    rings.transition()
                        .duration(200)
                        .style('opacity', 0);

                    d3.selectAll("#pieChart line").remove();
                    // d3.selectAll("#pieChart text").remove();
                    d3.selectAll("#pieChart .openTargets_d-d_overview_label").remove();
                    d3.selectAll("#pieChart circle").remove();

                    d3.selectAll('#sequence g').remove()

                    updateBreadcrumbs([{ name: 'Home' }]);
                    setTimeout(function() {
                        d3.selectAll("#pieChart .ring").remove();

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
                        d3.selectAll("#pieChart text").transition().duration(600).style('opacity', 1);

                    }, 500)

                }

                entering.append("svg:polygon")
                    .attr("points", breadcrumbPoints)
                    .style("fill", function(d) {
                        if (d.name == 'Home') {
                            return '#DCDCDC';
                        }
                        return allColorsExp[d.name][1]
                    })
                    .on("click", function(d, i) {
                        if (this.parentNode.childNodes[1].innerHTML == "Home")
                            renderInitialState();
                    })

                entering.append("svg:text")
                    .attr("x", (b.w + b.t) / 2)
                    .attr("y", b.h / 2)
                    .attr("dy", "0.35em")
                    .attr("text-anchor", "middle")
                    .text(function(d) {
                        var name;

                        if (d.name.length > 11) {
                            name = d.name.substring(0, 10) + '...';
                        } else {
                            name = d.name;
                        }
                        return name;
                        // return d.name;
                    })
                    .on("click", function(d, i) {
                        if (this.innerHTML == "Home")
                            renderInitialState();
                    });

                // Set position for entering and updating nodes.
                g.attr("transform", function(d, i) {
                    return "translate(" + i * (b.w + b.s) + ", 0)";
                });
            }

            function drawData(type) {
                var displData = [];
                for (i in data) {
                    if (data[i].type == type) {
                        displData.push(data[i])
                    }
                }

                // Calculate coords for each data point
                // var stepRad = 2 * Math.PI / displData.length; // grades
                // var stepRad = 2 * Math.PI * 360 / displData.length; // grades
                var stepRad = 3.5; // grades

                var currAngle = 0;

                for (var i = 0; i < displData.length; i++) {
                    var p = displData[i];
                    var scale = circleScales[~~((1 - p.value) / 0.2)];
                    var coords = point(scale(1 - p.value), currAngle);
                    p.x = coords[0];
                    p.y = coords[1];
                    p.angle = currAngle;
                    currAngle += (2 * Math.PI / displData.length);
                    // currAngle += (stepRad * 2 * Math.PI / 360);
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
                // .on("click", function(){ tooltip(this,dataTypes)});
                points
                    .transition()
                    .duration(transitionSpeed)
                    .attr("cx", function(d) {
                        return d.x;
                    })
                    .attr("cy", function(d) {
                        return d.y;
                    })
                    .attr("r", config.pointSize)
                    .attr("fill", config.pointColor);

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
                    .style("font-size", config.fontSize)
                    // .style("font-size", "10px")
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

        if (typeof config.data == "string") {
            d3.json(config.data, function(error, resp) {
                var data = resp.data;
                render.update(data, updateScales(radius), 'pieChart');
            });
        } else {

            render.update(config.data, updateScales(radius), 'pieChart');
        }



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

        var obj = {};
        obj.header = d.object;
        obj.rows = [];
        obj.rows.push({
            label: "type",
            value: d.type
        });
        obj.rows.push({
            label: "Value:",
            value: String(d.value * 100).slice(0, 5)
        });
        tntTooltip.table()
            .width(180)
            .show_closer(true)
            .call(this, obj);
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

    render.read = function(data) {
        // if (typeof data == 'object') {
            if (!arguments.length) {
                return config.data;
            }
            config.data = data;
            return this;
        // }
    }

    render.size = function(size) {
        if (!arguments.length) {
            return config.size;
        }
        config.size = size;
        return this;
    };

    render.setPieColors = function(color) {
        if (!arguments.length) {
            return config.allColorsExp;
        }
        config.allColorsExp = color;
        return this;
    };

    render.setFontSize = function(size) {
        if (!arguments.length) {
            return config.fontSize;
        }
        if(typeof size== "number"){
            size = String(size+'px');
        }
        config.fontSize=size;
        return this;
    };

    render.setPointSize = function(size) {
        if (!arguments.length) {
            return config.pointSize;
        }
        config.pointSize = size;
        return this;
    };

    render.setPointColor = function(color) {
        if (!arguments.length) {
            return config.pointColor;
        }
        config.pointColor = color;
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

},{"tnt.tooltip":5}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2RpbWl0cmlzL2Jpb2pzL3dlYnBhZ2UvVml6VGFyZ2V0RGlzZWFzZXMvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9ob21lL2RpbWl0cmlzL2Jpb2pzL3dlYnBhZ2UvVml6VGFyZ2V0RGlzZWFzZXMvZmFrZV9jMTNiZGM0Ni5qcyIsIi9ob21lL2RpbWl0cmlzL2Jpb2pzL3dlYnBhZ2UvVml6VGFyZ2V0RGlzZWFzZXMvaW5kZXguanMiLCIvaG9tZS9kaW1pdHJpcy9iaW9qcy93ZWJwYWdlL1ZpelRhcmdldERpc2Vhc2VzL25vZGVfbW9kdWxlcy90bnQuYXBpL2luZGV4LmpzIiwiL2hvbWUvZGltaXRyaXMvYmlvanMvd2VicGFnZS9WaXpUYXJnZXREaXNlYXNlcy9ub2RlX21vZHVsZXMvdG50LmFwaS9zcmMvYXBpLmpzIiwiL2hvbWUvZGltaXRyaXMvYmlvanMvd2VicGFnZS9WaXpUYXJnZXREaXNlYXNlcy9ub2RlX21vZHVsZXMvdG50LnRvb2x0aXAvaW5kZXguanMiLCIvaG9tZS9kaW1pdHJpcy9iaW9qcy93ZWJwYWdlL1ZpelRhcmdldERpc2Vhc2VzL25vZGVfbW9kdWxlcy90bnQudG9vbHRpcC9zcmMvdG9vbHRpcC5qcyIsIi9ob21lL2RpbWl0cmlzL2Jpb2pzL3dlYnBhZ2UvVml6VGFyZ2V0RGlzZWFzZXMvc3JjL3Zpcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vaW5kZXguanNcIik7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHZpcyA9IHJlcXVpcmUoXCIuL3NyYy92aXMuanNcIik7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9hcGkuanNcIik7XG4iLCJ2YXIgYXBpID0gZnVuY3Rpb24gKHdobykge1xuXG4gICAgdmFyIF9tZXRob2RzID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgbSA9IFtdO1xuXG5cdG0uYWRkX2JhdGNoID0gZnVuY3Rpb24gKG9iaikge1xuXHQgICAgbS51bnNoaWZ0KG9iaik7XG5cdH07XG5cblx0bS51cGRhdGUgPSBmdW5jdGlvbiAobWV0aG9kLCB2YWx1ZSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG0ubGVuZ3RoOyBpKyspIHtcblx0XHRmb3IgKHZhciBwIGluIG1baV0pIHtcblx0XHQgICAgaWYgKHAgPT09IG1ldGhvZCkge1xuXHRcdFx0bVtpXVtwXSA9IHZhbHVlO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0ICAgIH1cblx0XHR9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gZmFsc2U7XG5cdH07XG5cblx0bS5hZGQgPSBmdW5jdGlvbiAobWV0aG9kLCB2YWx1ZSkge1xuXHQgICAgaWYgKG0udXBkYXRlIChtZXRob2QsIHZhbHVlKSApIHtcblx0ICAgIH0gZWxzZSB7XG5cdFx0dmFyIHJlZyA9IHt9O1xuXHRcdHJlZ1ttZXRob2RdID0gdmFsdWU7XG5cdFx0bS5hZGRfYmF0Y2ggKHJlZyk7XG5cdCAgICB9XG5cdH07XG5cblx0bS5nZXQgPSBmdW5jdGlvbiAobWV0aG9kKSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bS5sZW5ndGg7IGkrKykge1xuXHRcdGZvciAodmFyIHAgaW4gbVtpXSkge1xuXHRcdCAgICBpZiAocCA9PT0gbWV0aG9kKSB7XG5cdFx0XHRyZXR1cm4gbVtpXVtwXTtcblx0XHQgICAgfVxuXHRcdH1cblx0ICAgIH1cblx0fTtcblxuXHRyZXR1cm4gbTtcbiAgICB9O1xuXG4gICAgdmFyIG1ldGhvZHMgICAgPSBfbWV0aG9kcygpO1xuICAgIHZhciBhcGkgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIGFwaS5jaGVjayA9IGZ1bmN0aW9uIChtZXRob2QsIGNoZWNrLCBtc2cpIHtcblx0aWYgKG1ldGhvZCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bWV0aG9kLmxlbmd0aDsgaSsrKSB7XG5cdFx0YXBpLmNoZWNrKG1ldGhvZFtpXSwgY2hlY2ssIG1zZyk7XG5cdCAgICB9XG5cdCAgICByZXR1cm47XG5cdH1cblxuXHRpZiAodHlwZW9mIChtZXRob2QpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBtZXRob2QuY2hlY2soY2hlY2ssIG1zZyk7XG5cdH0gZWxzZSB7XG5cdCAgICB3aG9bbWV0aG9kXS5jaGVjayhjaGVjaywgbXNnKTtcblx0fVxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkudHJhbnNmb3JtID0gZnVuY3Rpb24gKG1ldGhvZCwgY2Jhaykge1xuXHRpZiAobWV0aG9kIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtZXRob2QubGVuZ3RoOyBpKyspIHtcblx0XHRhcGkudHJhbnNmb3JtIChtZXRob2RbaV0sIGNiYWspO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuO1xuXHR9XG5cblx0aWYgKHR5cGVvZiAobWV0aG9kKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgbWV0aG9kLnRyYW5zZm9ybSAoY2Jhayk7XG5cdH0gZWxzZSB7XG5cdCAgICB3aG9bbWV0aG9kXS50cmFuc2Zvcm0oY2Jhayk7XG5cdH1cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgdmFyIGF0dGFjaF9tZXRob2QgPSBmdW5jdGlvbiAobWV0aG9kLCBvcHRzKSB7XG5cdHZhciBjaGVja3MgPSBbXTtcblx0dmFyIHRyYW5zZm9ybXMgPSBbXTtcblxuXHR2YXIgZ2V0dGVyID0gb3B0cy5vbl9nZXR0ZXIgfHwgZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIG1ldGhvZHMuZ2V0KG1ldGhvZCk7XG5cdH07XG5cblx0dmFyIHNldHRlciA9IG9wdHMub25fc2V0dGVyIHx8IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8dHJhbnNmb3Jtcy5sZW5ndGg7IGkrKykge1xuXHRcdHggPSB0cmFuc2Zvcm1zW2ldKHgpO1xuXHQgICAgfVxuXG5cdCAgICBmb3IgKHZhciBqPTA7IGo8Y2hlY2tzLmxlbmd0aDsgaisrKSB7XG5cdFx0aWYgKCFjaGVja3Nbal0uY2hlY2soeCkpIHtcblx0XHQgICAgdmFyIG1zZyA9IGNoZWNrc1tqXS5tc2cgfHwgXG5cdFx0XHQoXCJWYWx1ZSBcIiArIHggKyBcIiBkb2Vzbid0IHNlZW0gdG8gYmUgdmFsaWQgZm9yIHRoaXMgbWV0aG9kXCIpO1xuXHRcdCAgICB0aHJvdyAobXNnKTtcblx0XHR9XG5cdCAgICB9XG5cdCAgICBtZXRob2RzLmFkZChtZXRob2QsIHgpO1xuXHR9O1xuXG5cdHZhciBuZXdfbWV0aG9kID0gZnVuY3Rpb24gKG5ld192YWwpIHtcblx0ICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdHJldHVybiBnZXR0ZXIoKTtcblx0ICAgIH1cblx0ICAgIHNldHRlcihuZXdfdmFsKTtcblx0ICAgIHJldHVybiB3aG87IC8vIFJldHVybiB0aGlzP1xuXHR9O1xuXHRuZXdfbWV0aG9kLmNoZWNrID0gZnVuY3Rpb24gKGNiYWssIG1zZykge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGNoZWNrcztcblx0ICAgIH1cblx0ICAgIGNoZWNrcy5wdXNoICh7Y2hlY2sgOiBjYmFrLFxuXHRcdFx0ICBtc2cgICA6IG1zZ30pO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdH07XG5cdG5ld19tZXRob2QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGNiYWspIHtcblx0ICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdHJldHVybiB0cmFuc2Zvcm1zO1xuXHQgICAgfVxuXHQgICAgdHJhbnNmb3Jtcy5wdXNoKGNiYWspO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdH07XG5cblx0d2hvW21ldGhvZF0gPSBuZXdfbWV0aG9kO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0c2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBvcHRzKSB7XG5cdGlmICh0eXBlb2YgKHBhcmFtKSA9PT0gJ29iamVjdCcpIHtcblx0ICAgIG1ldGhvZHMuYWRkX2JhdGNoIChwYXJhbSk7XG5cdCAgICBmb3IgKHZhciBwIGluIHBhcmFtKSB7XG5cdFx0YXR0YWNoX21ldGhvZCAocCwgb3B0cyk7XG5cdCAgICB9XG5cdH0gZWxzZSB7XG5cdCAgICBtZXRob2RzLmFkZCAocGFyYW0sIG9wdHMuZGVmYXVsdF92YWx1ZSk7XG5cdCAgICBhdHRhY2hfbWV0aG9kIChwYXJhbSwgb3B0cyk7XG5cdH1cbiAgICB9O1xuXG4gICAgYXBpLmdldHNldCA9IGZ1bmN0aW9uIChwYXJhbSwgZGVmKSB7XG5cdGdldHNldChwYXJhbSwge2RlZmF1bHRfdmFsdWUgOiBkZWZ9KTtcblxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkuZ2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0dmFyIG9uX3NldHRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRocm93IChcIk1ldGhvZCBkZWZpbmVkIG9ubHkgYXMgYSBnZXR0ZXIgKHlvdSBhcmUgdHJ5aW5nIHRvIHVzZSBpdCBhcyBhIHNldHRlclwiKTtcblx0fTtcblxuXHRnZXRzZXQocGFyYW0sIHtkZWZhdWx0X3ZhbHVlIDogZGVmLFxuXHRcdCAgICAgICBvbl9zZXR0ZXIgOiBvbl9zZXR0ZXJ9XG5cdCAgICAgICk7XG5cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLnNldCA9IGZ1bmN0aW9uIChwYXJhbSwgZGVmKSB7XG5cdHZhciBvbl9nZXR0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aHJvdyAoXCJNZXRob2QgZGVmaW5lZCBvbmx5IGFzIGEgc2V0dGVyICh5b3UgYXJlIHRyeWluZyB0byB1c2UgaXQgYXMgYSBnZXR0ZXJcIik7XG5cdH07XG5cblx0Z2V0c2V0KHBhcmFtLCB7ZGVmYXVsdF92YWx1ZSA6IGRlZixcblx0XHQgICAgICAgb25fZ2V0dGVyIDogb25fZ2V0dGVyfVxuXHQgICAgICApO1xuXG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS5tZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgY2Jhaykge1xuXHRpZiAodHlwZW9mIChuYW1lKSA9PT0gJ29iamVjdCcpIHtcblx0ICAgIGZvciAodmFyIHAgaW4gbmFtZSkge1xuXHRcdHdob1twXSA9IG5hbWVbcF07XG5cdCAgICB9XG5cdH0gZWxzZSB7XG5cdCAgICB3aG9bbmFtZV0gPSBjYmFrO1xuXHR9XG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIHJldHVybiBhcGk7XG4gICAgXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBhcGk7IiwibW9kdWxlLmV4cG9ydHMgPSB0b29sdGlwID0gcmVxdWlyZShcIi4vc3JjL3Rvb2x0aXAuanNcIik7XG4iLCJ2YXIgYXBpanMgPSByZXF1aXJlKFwidG50LmFwaVwiKTtcblxudmFyIHRvb2x0aXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgZHJhZyA9IGQzLmJlaGF2aW9yLmRyYWcoKTtcbiAgICB2YXIgdG9vbHRpcF9kaXY7XG5cbiAgICB2YXIgY29uZiA9IHtcbiAgICAgICAgcG9zaXRpb24gOiBcInJpZ2h0XCIsXG4gICAgICAgIGFsbG93X2RyYWcgOiB0cnVlLFxuICAgICAgICBzaG93X2Nsb3NlciA6IHRydWUsXG4gICAgICAgIGZpbGwgOiBmdW5jdGlvbiAoKSB7IHRocm93IFwiZmlsbCBpcyBub3QgZGVmaW5lZCBpbiB0aGUgYmFzZSBvYmplY3RcIjsgfSxcbiAgICAgICAgd2lkdGggOiAxODAsXG4gICAgICAgIGlkIDogMVxuICAgIH07XG5cbiAgICB2YXIgdCA9IGZ1bmN0aW9uIChkYXRhLCBldmVudCkge1xuICAgICAgICBkcmFnXG4gICAgICAgICAgICAub3JpZ2luKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgeCA6IHBhcnNlSW50KGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcImxlZnRcIikpLFxuICAgICAgICAgICAgICAgICAgICB5IDogcGFyc2VJbnQoZDMuc2VsZWN0KHRoaXMpLnN0eWxlKFwidG9wXCIpKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm9uKFwiZHJhZ1wiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29uZi5hbGxvd19kcmFnKSB7XG4gICAgICAgICAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwibGVmdFwiLCBkMy5ldmVudC54ICsgXCJweFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwidG9wXCIsIGQzLmV2ZW50LnkgKyBcInB4XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRPRE86IFdoeSBkbyB3ZSBuZWVkIHRoZSBkaXYgZWxlbWVudD9cbiAgICAgICAgLy8gSXQgbG9va3MgbGlrZSBpZiB3ZSBhbmNob3IgdGhlIHRvb2x0aXAgaW4gdGhlIFwiYm9keVwiXG4gICAgICAgIC8vIFRoZSB0b29sdGlwIGlzIG5vdCBsb2NhdGVkIGluIHRoZSByaWdodCBwbGFjZSAoYXBwZWFycyBhdCB0aGUgYm90dG9tKVxuICAgICAgICAvLyBTZWUgY2xpZW50cy90b29sdGlwc190ZXN0Lmh0bWwgZm9yIGFuIGV4YW1wbGVcbiAgICAgICAgdmFyIGNvbnRhaW5lckVsZW0gPSBzZWxlY3RBbmNlc3RvciAodGhpcywgXCJkaXZcIik7XG4gICAgICAgIGlmIChjb250YWluZXJFbGVtID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFdlIHJlcXVpcmUgYSBkaXYgZWxlbWVudCBhdCBzb21lIHBvaW50IHRvIGFuY2hvciB0aGUgdG9vbHRpcFxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdG9vbHRpcF9kaXYgPSBkMy5zZWxlY3QoY29udGFpbmVyRWxlbSlcbiAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfdG9vbHRpcFwiKVxuICAgICAgICAgICAgLmNsYXNzZWQoXCJ0bnRfdG9vbHRpcF9hY3RpdmVcIiwgdHJ1ZSkgIC8vIFRPRE86IElzIHRoaXMgbmVlZGVkL3VzZWQ/Pz9cbiAgICAgICAgICAgIC5jYWxsKGRyYWcpO1xuXG4gICAgICAgIC8vIHByZXYgdG9vbHRpcHMgd2l0aCB0aGUgc2FtZSBoZWFkZXJcbiAgICAgICAgZDMuc2VsZWN0KFwiI3RudF90b29sdGlwX1wiICsgY29uZi5pZCkucmVtb3ZlKCk7XG5cbiAgICAgICAgaWYgKChkMy5ldmVudCA9PT0gbnVsbCkgJiYgKGV2ZW50KSkge1xuICAgICAgICAgICAgZDMuZXZlbnQgPSBldmVudDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZDNtb3VzZSA9IGQzLm1vdXNlKGNvbnRhaW5lckVsZW0pO1xuICAgICAgICBkMy5ldmVudCA9IG51bGw7XG5cbiAgICAgICAgdmFyIHhvZmZzZXQgPSAwO1xuICAgICAgICBpZiAoY29uZi5wb3NpdGlvbiA9PT0gXCJsZWZ0XCIpIHtcbiAgICAgICAgICAgIHhvZmZzZXQgPSBjb25mLndpZHRoO1xuICAgICAgICB9XG5cbiAgICAgICAgdG9vbHRpcF9kaXYuYXR0cihcImlkXCIsIFwidG50X3Rvb2x0aXBfXCIgKyBjb25mLmlkKTtcblxuICAgICAgICAvLyBXZSBwbGFjZSB0aGUgdG9vbHRpcFxuICAgICAgICB0b29sdGlwX2RpdlxuICAgICAgICAgICAgLnN0eWxlKFwibGVmdFwiLCAoZDNtb3VzZVswXSAtIHhvZmZzZXQpICsgXCJweFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidG9wXCIsIChkM21vdXNlWzFdKSArIFwicHhcIik7XG5cbiAgICAgICAgLy8gQ2xvc2VcbiAgICAgICAgaWYgKGNvbmYuc2hvd19jbG9zZXIpIHtcbiAgICAgICAgICAgIHRvb2x0aXBfZGl2XG4gICAgICAgICAgICAgICAgLmFwcGVuZChcImRpdlwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfdG9vbHRpcF9jbG9zZXJcIilcbiAgICAgICAgICAgICAgICAub24gKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25mLmZpbGwuY2FsbCh0b29sdGlwX2Rpdi5ub2RlKCksIGRhdGEpO1xuXG4gICAgICAgIC8vIHJldHVybiB0aGlzIGhlcmU/XG4gICAgICAgIHJldHVybiB0O1xuICAgIH07XG5cbiAgICAvLyBnZXRzIHRoZSBmaXJzdCBhbmNlc3RvciBvZiBlbGVtIGhhdmluZyB0YWduYW1lIFwidHlwZVwiXG4gICAgLy8gZXhhbXBsZSA6IHZhciBteWRpdiA9IHNlbGVjdEFuY2VzdG9yKG15ZWxlbSwgXCJkaXZcIik7XG4gICAgZnVuY3Rpb24gc2VsZWN0QW5jZXN0b3IgKGVsZW0sIHR5cGUpIHtcbiAgICAgICAgdHlwZSA9IHR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgaWYgKGVsZW0ucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJObyBtb3JlIHBhcmVudHNcIik7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0YWdOYW1lID0gZWxlbS5wYXJlbnROb2RlLnRhZ05hbWU7XG5cbiAgICAgICAgaWYgKCh0YWdOYW1lICE9PSB1bmRlZmluZWQpICYmICh0YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IHR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbS5wYXJlbnROb2RlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGVjdEFuY2VzdG9yIChlbGVtLnBhcmVudE5vZGUsIHR5cGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGFwaSA9IGFwaWpzKHQpXG4gICAgICAgIC5nZXRzZXQoY29uZik7XG5cbiAgICBhcGkuY2hlY2soJ3Bvc2l0aW9uJywgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICByZXR1cm4gKHZhbCA9PT0gJ2xlZnQnKSB8fCAodmFsID09PSAncmlnaHQnKTtcbiAgICB9LCBcIk9ubHkgJ2xlZnQnIG9yICdyaWdodCcgdmFsdWVzIGFyZSBhbGxvd2VkIGZvciBwb3NpdGlvblwiKTtcblxuICAgIGFwaS5tZXRob2QoJ2Nsb3NlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodG9vbHRpcF9kaXYpIHtcbiAgICAgICAgICAgIHRvb2x0aXBfZGl2LnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdDtcbn07XG5cbnRvb2x0aXAubGlzdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBsaXN0IHRvb2x0aXAgaXMgYmFzZWQgb24gZ2VuZXJhbCB0b29sdGlwc1xuICAgIHZhciB0ID0gdG9vbHRpcCgpO1xuICAgIHZhciB3aWR0aCA9IDE4MDtcblxuICAgIHQuZmlsbCAoZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgdG9vbHRpcF9kaXYgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgIHZhciBvYmpfaW5mb19saXN0ID0gdG9vbHRpcF9kaXZcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0YWJsZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJib3JkZXJcIiwgXCJzb2xpZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIiwgdC53aWR0aCgpICsgXCJweFwiKTtcblxuICAgICAgICAvLyBUb29sdGlwIGhlYWRlclxuICAgICAgICBpZiAob2JqLmhlYWRlcikge1xuICAgICAgICAgICAgb2JqX2luZm9fbGlzdFxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJ0clwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfaGVhZGVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcInRoXCIpXG4gICAgICAgICAgICAgICAgLnRleHQob2JqLmhlYWRlcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUb29sdGlwIHJvd3NcbiAgICAgICAgdmFyIHRhYmxlX3Jvd3MgPSBvYmpfaW5mb19saXN0LnNlbGVjdEFsbChcIi50bnRfem1lbnVfcm93XCIpXG4gICAgICAgICAgICAuZGF0YShvYmoucm93cylcbiAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAuYXBwZW5kKFwidHJcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfcm93XCIpO1xuXG4gICAgICAgIHRhYmxlX3Jvd3NcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0ZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLCBcImNlbnRlclwiKVxuICAgICAgICAgICAgLmh0bWwoZnVuY3Rpb24oZCxpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iai5yb3dzW2ldLnZhbHVlO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGQubGluayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwibGlua1wiLCAxKVxuICAgICAgICAgICAgICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGQubGluayhkLm9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0LmNsb3NlLmNhbGwodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHQ7XG59O1xuXG50b29sdGlwLnRhYmxlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIHRhYmxlIHRvb2x0aXBzIGFyZSBiYXNlZCBvbiBnZW5lcmFsIHRvb2x0aXBzXG4gICAgdmFyIHQgPSB0b29sdGlwKCk7XG5cbiAgICB2YXIgd2lkdGggPSAxODA7XG5cbiAgICB0LmZpbGwgKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIHRvb2x0aXBfZGl2ID0gZDMuc2VsZWN0KHRoaXMpO1xuXG4gICAgICAgIHZhciBvYmpfaW5mb190YWJsZSA9IHRvb2x0aXBfZGl2XG4gICAgICAgICAgICAuYXBwZW5kKFwidGFibGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiYm9yZGVyXCIsIFwic29saWRcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsIHQud2lkdGgoKSArIFwicHhcIik7XG5cbiAgICAgICAgLy8gVG9vbHRpcCBoZWFkZXJcbiAgICAgICAgaWYgKG9iai5oZWFkZXIpIHtcbiAgICAgICAgICAgIG9ial9pbmZvX3RhYmxlXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcInRyXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9oZWFkZXJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kKFwidGhcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNvbHNwYW5cIiwgMilcbiAgICAgICAgICAgICAgICAudGV4dChvYmouaGVhZGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRvb2x0aXAgcm93c1xuICAgICAgICB2YXIgdGFibGVfcm93cyA9IG9ial9pbmZvX3RhYmxlLnNlbGVjdEFsbChcIi50bnRfem1lbnVfcm93XCIpXG4gICAgICAgICAgICAuZGF0YShvYmoucm93cylcbiAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAuYXBwZW5kKFwidHJcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfcm93XCIpO1xuXG4gICAgICAgIHRhYmxlX3Jvd3NcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0aFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsIGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGQudmFsdWUgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZC52YWx1ZSA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ0bnRfem1lbnVfaW5uZXJfaGVhZGVyXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBcInRudF96bWVudV9jZWxsXCI7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmh0bWwoZnVuY3Rpb24oZCxpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iai5yb3dzW2ldLmxhYmVsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgdGFibGVfcm93c1xuICAgICAgICAgICAgLmFwcGVuZChcInRkXCIpXG4gICAgICAgICAgICAuaHRtbChmdW5jdGlvbihkLGkpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iai5yb3dzW2ldLnZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iai5yb3dzW2ldLnZhbHVlLmNhbGwodGhpcywgZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iai5yb3dzW2ldLnZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGlmIChkLnZhbHVlID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZC5saW5rID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgICAgICAgICAuY2xhc3NlZChcImxpbmtcIiwgMSlcbiAgICAgICAgICAgICAgICAub24oJ2NsaWNrJywgZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5saW5rKGQub2JqKTtcbiAgICAgICAgICAgICAgICAgICAgdC5jbG9zZS5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdDtcbn07XG5cbnRvb2x0aXAucGxhaW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gcGxhaW4gdG9vbHRpcHMgYXJlIGJhc2VkIG9uIGdlbmVyYWwgdG9vbHRpcHNcbiAgICB2YXIgdCA9IHRvb2x0aXAoKTtcblxuICAgIHQuZmlsbCAoZnVuY3Rpb24gKG9iaikge1xuICAgICAgICB2YXIgdG9vbHRpcF9kaXYgPSBkMy5zZWxlY3QodGhpcyk7XG5cbiAgICAgICAgdmFyIG9ial9pbmZvX3RhYmxlID0gdG9vbHRpcF9kaXZcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0YWJsZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJib3JkZXJcIiwgXCJzb2xpZFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIiwgdC53aWR0aCgpICsgXCJweFwiKTtcblxuICAgICAgICBpZiAob2JqLmhlYWRlcikge1xuICAgICAgICAgICAgb2JqX2luZm9fdGFibGVcbiAgICAgICAgICAgICAgICAuYXBwZW5kKFwidHJcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51X2hlYWRlclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJ0aFwiKVxuICAgICAgICAgICAgICAgIC50ZXh0KG9iai5oZWFkZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9iai5ib2R5KSB7XG4gICAgICAgICAgICBvYmpfaW5mb190YWJsZVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJ0clwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfcm93XCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcInRkXCIpXG4gICAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbGlnblwiLCBcImNlbnRlclwiKVxuICAgICAgICAgICAgICAgIC5odG1sKG9iai5ib2R5KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB0b29sdGlwO1xuIiwiLy8gdmFyIGN0dHZBcGkgPSByZXF1aXJlKCdjdHR2LmFwaScpO1xudmFyIHRudFRvb2x0aXAgPSByZXF1aXJlKCd0bnQudG9vbHRpcCcpO1xuLy8gdmFyIGQzID0gcmVxdWlyZSgnZDMnKTtcbi8vIHZhciBmbG93ZXJWaWV3ID0gcmVxdWlyZShcImN0dHYuZmxvd2VyVmlld1wiKTtcbi8vYWRkIG5lY2Vzc2FyeSBjc3MgZnJvbSBqcyBzbyB0aGF0IHRoZSB1c2VyIGRvZXNuIGhhdmUgdG8gZXhwbGljaXRlbHkgaW5jbHVkZSBpdFxuLy9pZiBoZSBpbmNsdWRlcyBpdCBjc3MgaXMgbm90IGltcG9ydGVkIFxudmFyIGNzc0lkID0gJ215Q3NzJzsgXG5pZiAoIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNzc0lkKSlcbntcbiAgICB2YXIgaGVhZCAgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdO1xuICAgIHZhciBsaW5rICA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpbmsnKTtcbiAgICBsaW5rLmlkICAgPSBjc3NJZDtcbiAgICBsaW5rLnJlbCAgPSAnc3R5bGVzaGVldCc7XG4gICAgbGluay50eXBlID0gJ3RleHQvY3NzJztcbiAgICBsaW5rLmhyZWYgPSBcIi4uL2J1aWxkL3Zpel9kaXNlYXNlcy5jc3NcIjtcbiAgICBsaW5rLm1lZGlhID0gJ2FsbCc7XG4gICAgaGVhZC5hcHBlbmRDaGlsZChsaW5rKTtcbn1cblxuXG5cbnZhciB2aXMgPSBmdW5jdGlvbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgY29uZmlnID0ge1xuICAgICAgICBhbGxDb2xvcnNFeHA6W10sXG4gICAgICAgIC8vIGFsbENvbG9yc0V4cDpbXSxcbiAgICAgICAgZm9udFNpemU6XCIxMHB4XCIsXG4gICAgICAgIHBvaW50U2l6ZTozLjUsXG4gICAgICAgIHBvaW50Q29sb3I6XCJuYXZ5XCIsXG4gICAgICAgIHNpemU6IDcwMCxcbiAgICAgICAgZmlsdGVyOiBudWxsLFxuICAgICAgICBkYXRhOiBbXG5cbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcImRpcmVjdGlvblwiOiBudWxsLFxuICAgICAgICAgICAgICAgIFwib2JqZWN0XCI6IFwiZGlzZWFzZTFcIixcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJkaXNlYXNlczFcIixcbiAgICAgICAgICAgICAgICBcInZhbHVlXCI6IDAuNzEzOTEzODEyNjM4OTA2NSxcbiAgICAgICAgICAgICAgICBcInN1YmplY3RcIjogXCJFRk9fMDAwNDU5MVwiXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgXCJkaXJlY3Rpb25cIjogbnVsbCxcbiAgICAgICAgICAgICAgICBcIm9iamVjdFwiOiBcImRpc2Vhc2UxXCIsXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZGlzZWFzZXMyXCIsXG4gICAgICAgICAgICAgICAgXCJ2YWx1ZVwiOiAwLjcxMzkxMzgxMjYzODkwNjUsXG4gICAgICAgICAgICAgICAgXCJzdWJqZWN0XCI6IFwiRUZPXzAwMDQ1OTFcIlxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIFwiZGlyZWN0aW9uXCI6IG51bGwsXG4gICAgICAgICAgICAgICAgXCJvYmplY3RcIjogXCJkaXNlYXNlMVwiLFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImRpc2Vhc2VzM1wiLFxuICAgICAgICAgICAgICAgIFwidmFsdWVcIjogMC43MTM5MTM4MTI2Mzg5MDY1LFxuICAgICAgICAgICAgICAgIFwic3ViamVjdFwiOiBcIkVGT18wMDA0NTkxXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH07XG4gICAgdmFyIGdyYXBoO1xuXG4gICAgdmFyIGxhYmVsU2l6ZSA9IDEwMDtcbiAgICB2YXIgdHJhbnNpdGlvblNwZWVkID0gMTAwMDtcbiAgICB2YXIgcG9pbnRzLCBsYWJlbHMsIGxpbmtzO1xuICAgIC8vIHZhciBhcGkgPSBjdHR2QXBpKClcbiAgICAvLyAgICAgLnByZWZpeChcImh0dHA6Ly90ZXN0LnRhcmdldHZhbGlkYXRpb24ub3JnOjg4OTkvYXBpL1wiKVxuICAgIC8vICAgICAuYXBwbmFtZShcImN0dHYtd2ViLWFwcFwiKVxuICAgIC8vICAgICAuc2VjcmV0KFwiMkoyM1QyME8zMVV5ZXBSajc3NTRwRUEyb3NNT1lmRktcIik7XG4gICAgdmFyIGRhdGFUeXBlcztcbiAgICB2YXIgcmVuZGVyID0gZnVuY3Rpb24oZGl2KSB7XG5cbiAgICAgICAgZDMuc2VsZWN0KGRpdikuaHRtbChcIlwiKTtcbiAgICAgICAgdmFyIGdyYXBoU2l6ZSA9IGNvbmZpZy5zaXplIC0gKGxhYmVsU2l6ZSAqIDIpO1xuICAgICAgICB2YXIgcmFkaXVzID0gZ3JhcGhTaXplIC8gMjtcblxuXG4gICAgICAgIGQzLnNlbGVjdChkaXYpXG4gICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpXG4gICAgICAgICAgICAuYXR0cihcImlkXCIsIFwic2VxdWVuY2VcIilcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgY29uZmlnLnNpemUpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCAzMClcblxuICAgICAgICB2YXIgc3ZnID0gZDMuc2VsZWN0KGRpdilcbiAgICAgICAgICAgIC5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgY29uZmlnLnNpemUpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBjb25maWcuc2l6ZSlcbiAgICAgICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIChyYWRpdXMgKyBsYWJlbFNpemUpICsgXCIsXCIgKyAocmFkaXVzICsgbGFiZWxTaXplKSArIFwiKVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJpZFwiLCBcInBpZUNoYXJ0XCIpXG5cbiAgICAgICAgdmFyIGNpcmNsZUNvbG9yU2NhbGUgPSBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgICAgLmRvbWFpbihbMCwgMV0pXG4gICAgICAgICAgICAucmFuZ2UoW2QzLnJnYigwLCA4MiwgMTYzKSwgZDMucmdiKDE4MiwgMjIxLCAyNTIpXSk7XG5cbiAgICAgICAgLy8gZDMuanNvbihcIi4uL2RhdGEvc2FtcGxlLmpzb25cIiwgZnVuY3Rpb24oZXJyb3IsIHJlc3ApIHtcbiAgICAgICAgLy8gICAgIHZhciBkYXRhID0gcmVzcC5kYXRhO1xuICAgICAgICAvLyAgICAgcmVuZGVyLnVwZGF0ZShkYXRhLCB1cGRhdGVTY2FsZXMocmFkaXVzKSwgJ3BpZUNoYXJ0Jyk7XG4gICAgICAgIC8vIH0pO1xuICAgICAgICAvLyBkMy5qc29uKFwiLi4vZGF0YS9zYW1wbGUuanNvblwiLCBmdW5jdGlvbihlcnJvciwgcmVzcCkge1xuICAgICAgICAvLyAgICAgdmFyIGRhdGEgPSByZXNwLmRhdGE7XG4gICAgICAgIC8vIH0pO1xuXG4gICAgICAgIHZhciBiID0ge1xuICAgICAgICAgICAgdzogMTAwLFxuICAgICAgICAgICAgaDogMzAsXG4gICAgICAgICAgICBzOiAzLFxuICAgICAgICAgICAgdDogMTBcbiAgICAgICAgfTtcblxuICAgICAgICByZW5kZXIudXBkYXRlID0gZnVuY3Rpb24oZGF0YSwgY2lyY2xlU2NhbGVzLCBncmFwaGljTW9kZSwgdml6VHlwZSkge1xuXG4gICAgICAgICAgICBpZiAoZ3JhcGhpY01vZGUgPT0gJ3BpZUNoYXJ0Jykge1xuICAgICAgICAgICAgICAgIGQzLnNlbGVjdEFsbChcIiNzZXF1ZW5jZSBzdmdcIikucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiZyB0ZXh0XCIpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIGQzLnNlbGVjdEFsbChcImxpbmVcIikucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiY2lyY2xlXCIpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUJyZWFkY3J1bWJzKFt7IG5hbWU6ICdIb21lJyB9XSk7XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBjcmVhdGVDb21wYXJhdG9yKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYVtwcm9wZXJ0eV0gPiBiW3Byb3BlcnR5XSkgcmV0dXJuIDFcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhW3Byb3BlcnR5XSA8IGJbcHJvcGVydHldKSByZXR1cm4gLTFcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAwXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZGF0YS5zb3J0KGNyZWF0ZUNvbXBhcmF0b3IoJ3R5cGUnKSlcblxuICAgICAgICAgICAgICAgIHZhciB0eXBlcyA9IHt9XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlc1tkYXRhW2ldLnR5cGVdID09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVzW2RhdGFbaV0udHlwZV0gPSBbXVxuICAgICAgICAgICAgICAgICAgICB0eXBlc1tkYXRhW2ldLnR5cGVdLnB1c2goZGF0YVtpXSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gcG9ydGlvbiBvZiBjaXJjbGUgcGVyIGRhdGEgdHlwZVxuICAgICAgICAgICAgICAgIGRhdGFUeXBlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoaSBpbiB0eXBlcykge1xuICAgICAgICAgICAgICAgICAgICBkYXRhVHlwZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogaSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwicG9wdWxhdGlvblwiOiB0eXBlc1tpXS5sZW5ndGggLyBkYXRhLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiY291bnRcIjogdHlwZXNbaV0ubGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRhdGFUeXBlcy5zb3J0KGZ1bmN0aW9uIGNvbXBhcmUoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYS5wb3B1bGF0aW9uID4gYi5wb3B1bGF0aW9uKSByZXR1cm4gLTE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhLnBvcHVsYXRpb24gPCBiLnBvcHVsYXRpb24pIHJldHVybiAxO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgLy9DcmVhdGUgY29sb3JzIG1hcHBpbmcgdG8gZGF0YSBUeXBlc1xuICAgICAgICAgICAgICAgIHZhciBjb2xvcnNFeHByID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IDEwOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29sb3JzRXhwci5wdXNoKFtkMy5zY2FsZS5jYXRlZ29yeTIwKCkucmFuZ2UoKVtpICogMl0sIGQzLnNjYWxlLmNhdGVnb3J5MjAoKS5yYW5nZSgpW2kgKiAyICsgMV1dKVxuICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gc2hhZGVDb2xvcjIoY29sb3IsIHBlcmNlbnQpIHsgICBcbiAgICAgICAgICAgICAgICAgICAgdmFyIGY9cGFyc2VJbnQoY29sb3Iuc2xpY2UoMSksMTYpLHQ9cGVyY2VudDwwPzA6MjU1LHA9cGVyY2VudDwwP3BlcmNlbnQqLTE6cGVyY2VudCxSPWY+PjE2LEc9Zj4+OCYweDAwRkYsQj1mJjB4MDAwMEZGO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCIjXCIrKDB4MTAwMDAwMCsoTWF0aC5yb3VuZCgodC1SKSpwKStSKSoweDEwMDAwKyhNYXRoLnJvdW5kKCh0LUcpKnApK0cpKjB4MTAwKyhNYXRoLnJvdW5kKCh0LUIpKnApK0IpKS50b1N0cmluZygxNikuc2xpY2UoMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGNvbmZpZy5hbGxDb2xvcnNFeHA7XG4gICAgICAgICAgICAgICAgdmFyIGFsbENvbG9yc0V4cCA9IHt9O1xuICAgICAgICAgICAgICAgIGlmKGNvbmZpZy5hbGxDb2xvcnNFeHAubGVuZ3RoIT0wKXtcbiAgICAgICAgICAgICAgICAgICAgZm9yKGk9MDsgaTxjb25maWcuYWxsQ29sb3JzRXhwLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbENvbG9yc0V4cFtkYXRhVHlwZXNbaV0udHlwZV0gPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWcuYWxsQ29sb3JzRXhwW2ldLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2hhZGVDb2xvcjIoY29uZmlnLmFsbENvbG9yc0V4cFtpXSwgMC44KVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZDMuc2NhbGUuY2F0ZWdvcnkyMCgpLnJhbmdlKClbaSAlIDEwICogMiArIDFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZDMuc2NhbGUuY2F0ZWdvcnkyMCgpLnJhbmdlKClbaSAlIDEwICogMl1cbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAoaSA9IGNvbmZpZy5hbGxDb2xvcnNFeHAubGVuZ3RoOyBpIDwgZGF0YVR5cGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsbENvbG9yc0V4cFtkYXRhVHlwZXNbaV0udHlwZV0gPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICBkMy5zY2FsZS5jYXRlZ29yeTIwKCkucmFuZ2UoKVtpICUgMTAgKiAyXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGQzLnNjYWxlLmNhdGVnb3J5MjAoKS5yYW5nZSgpW2kgJSAxMCAqIDIgKyAxXVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZDMuc2NhbGUuY2F0ZWdvcnkyMCgpLnJhbmdlKClbaSAlIDEwICogMiArIDFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZDMuc2NhbGUuY2F0ZWdvcnkyMCgpLnJhbmdlKClbaSAlIDEwICogMl1cbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNpcmNsZUNvbG9yU2NhbGVFeHAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5kb21haW4oWzAsIDFdKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJhbmdlKGFsbENvbG9yc0V4cFt0eXBlXSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gZ2l2ZUFyY0NvbG9yKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZG9tYWluKFswLCAxMDVdKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJhbmdlKFthbGxDb2xvcnNFeHBbdHlwZV1bMF0sIGFsbENvbG9yc0V4cFt0eXBlXVsxXV0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vY3JlYXRlIGFyY3MgZXF1aXZhbGVudCBvZiByaW5nc1xuICAgICAgICAgICAgICAgIHZhciBhcmNzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAxOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyYyA9IGQzLnN2Zy5hcmMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm91dGVyUmFkaXVzKHJhZGl1cyAtIChpICogcmFkaXVzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5pbm5lclJhZGl1cyhyYWRpdXMgLSAoaSAqIHJhZGl1cykgLSByYWRpdXMpO1xuXG4gICAgICAgICAgICAgICAgICAgIGFyY3MucHVzaChhcmMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBsYWJlbEFyYyA9IGQzLnN2Zy5hcmMoKVxuICAgICAgICAgICAgICAgICAgICAub3V0ZXJSYWRpdXMocmFkaXVzIC0gNDApXG4gICAgICAgICAgICAgICAgICAgIC5pbm5lclJhZGl1cyhyYWRpdXMgLSA0MCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcGllID0gZDMubGF5b3V0LnBpZSgpXG4gICAgICAgICAgICAgICAgICAgIC5zb3J0KG51bGwpXG4gICAgICAgICAgICAgICAgICAgIC52YWx1ZShmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5wb3B1bGF0aW9uO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHZhciBhcmMgPSBkMy5zdmcuYXJjKClcbiAgICAgICAgICAgICAgICAgICAgLm91dGVyUmFkaXVzKHJhZGl1cylcbiAgICAgICAgICAgICAgICAgICAgLmlubmVyUmFkaXVzKDApXG5cbiAgICAgICAgICAgICAgICB2YXIgcGF0aCA9IHN2Z1xuICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwicGF0aFwiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShwaWUoZGF0YVR5cGVzKSlcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwicGF0aFwiKVxuICAgICAgICAgICAgICAgICAgICAvL0dpdmUgY29sb3IgYmFzZWQgb24gZGF0YXR5cGVcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhbGxDb2xvcnNFeHBbZC5kYXRhLnR5cGVdWzBdO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImRcIiwgYXJjKVxuICAgICAgICAgICAgICAgICAgICAuZWFjaChmdW5jdGlvbihkKSB7IHRoaXMuX2N1cnJlbnQgPSBkOyB9KSAvLyBzdG9yZSB0aGUgaW5pdGlhbCB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiI3BpZUNoYXJ0IHRleHRcIikuc3R5bGUoJ29wYWNpdHknLCAwKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBEYXRhVHlwZXMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRhdGFUeXBlcykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiB0ZW1wRGF0YVR5cGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRlbXBEYXRhVHlwZXNbaV0udHlwZSA9PSBkLmRhdGEudHlwZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcERhdGFUeXBlc1tpXS5wb3B1bGF0aW9uID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcERhdGFUeXBlc1tpXS5wb3B1bGF0aW9uID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBwYXRoLmRhdGEocGllKHRlbXBEYXRhVHlwZXMpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhbGxDb2xvcnNFeHBbKGQuZGF0YS50eXBlKV1bMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGgudHJhbnNpdGlvbigpLmR1cmF0aW9uKDUwMCkuYXR0clR3ZWVuKFwiZFwiLCBmdW5jdGlvbihhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSBkMy5pbnRlcnBvbGF0ZSh0aGlzLl9jdXJyZW50LCBhKSAvLyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gayA9IGQzLmludGVycG9sYXRlKGFyYy5vdXRlclJhZGl1cygpKCksIG5ld1JhZGl1cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY3VycmVudCA9IGkoMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyYyhpKHQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmV0dXJuIGFyYy5pbm5lclJhZGl1cyhrKHQpIC8gNCkub3V0ZXJSYWRpdXMoayh0KSkoaSh0KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWxEYXRhVHlwZSA9IGQuZGF0YS50eXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVCcmVhZGNydW1icyhbeyBuYW1lOiAnSG9tZScsIGRlcHRoOiAwIH0sIHsgbmFtZTogc2VsRGF0YVR5cGUsIGRlcHRoOiAxIH1dKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkMy5zZWxlY3RBbGwoXCJnIHBhdGhcIikucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vLy8vLy8vLy9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3JhcGggPSBkMy5zZWxlY3QoXCIjcGllQ2hhcnRcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vLy8vLy8vLy8vLy8vXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByaW5ncyA9IGdyYXBoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc2VsZWN0QWxsKFwiLnJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5kYXRhKGNpcmNsZVNjYWxlcyk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByaW5nc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJwYXRoXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLy8vLy8vLy9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zdHlsZSgnb3BhY2l0eScsIDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLy8vL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNpcmNsZUNvbG9yU2NhbGVFeHAoc2VsRGF0YVR5cGUpKGQuZG9tYWluKClbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyYyA9IGQzLnN2Zy5hcmMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuaW5uZXJSYWRpdXMoZC5yYW5nZSgpWzBdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAub3V0ZXJSYWRpdXMoZC5yYW5nZSgpWzFdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc3RhcnRBbmdsZSgwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZW5kQW5nbGUoMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmMoZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJpZFwiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwicmluZ1wiICsgaTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByaW5ncy50cmFuc2l0aW9uKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5kZWxheShmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGkgKiA1MDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24oMTAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmluZ3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmUgcmluZyBoYXMgYmVlbiBzZWxlY3RlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RlZCA9IGQzLnNlbGVjdCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWQuY2xhc3NlZChcInpvb21lZFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZC5jbGFzc2VkKFwiem9vbWVkXCIsIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXIudXBkYXRlKGRhdGEsIHVwZGF0ZVNjYWxlcyhyYWRpdXMpLCAncmluZ3MnLCBzZWxEYXRhVHlwZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQuY2xhc3NlZChcInpvb21lZFwiLCB0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXIudXBkYXRlKGRhdGEsIHVwZGF0ZVNjYWxlcyhyYWRpdXMsIGQpLCAncmluZ3MnLCBzZWxEYXRhVHlwZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhd0RhdGEoc2VsRGF0YVR5cGUpXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9vbiBiYWNrZ3JvdW5kIGNoYW5nZSBicmluZyBwb2ludHMgdG8gZm9yZWdyb3VuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3Rpb24ucHJvdG90eXBlLm1vdmVUb0Zyb250ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoJ2NpcmNsZScpLm1vdmVUb0Zyb250KClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKCdsaW5lJykubW92ZVRvRnJvbnQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDYwMCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcGF0aC5lYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgc3ZnLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBcIiNmZmZcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdHlsZShcIm1hcmdpblwiLCBcIjNweFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZGVidWdnZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdyYWRlcyA9ICgoZC5zdGFydEFuZ2xlICsgZC5lbmRBbmdsZSkgLyAyKSAqIDE4MCAvIE1hdGguUEk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdyYWRlcyA+IDAgJiYgZ3JhZGVzIDwgMTgwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB4ID0gKC0yMDAgKyBncmFwaFNpemUpIC8gMiAqIE1hdGguY29zKCgoZC5zdGFydEFuZ2xlICsgZC5lbmRBbmdsZSkgLyAyKSAtIE1hdGguUEkgLyAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHkgPSAoLTIwMCArIGdyYXBoU2l6ZSkgLyAyICogTWF0aC5zaW4oKChkLnN0YXJ0QW5nbGUgKyBkLmVuZEFuZ2xlKSAvIDIpIC0gTWF0aC5QSSAvIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyB4ICsgXCIsXCIgKyB5ICsgXCIpIHJvdGF0ZShcIiArIChncmFkZXMgLSA5MCkgKyBcIilcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgeCA9ICgtMjUgKyBncmFwaFNpemUpIC8gMiAqIE1hdGguY29zKCgoZC5zdGFydEFuZ2xlICsgZC5lbmRBbmdsZSkgLyAyKSAtIE1hdGguUEkgLyAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHkgPSAoLTI1ICsgZ3JhcGhTaXplKSAvIDIgKiBNYXRoLnNpbigoKGQuc3RhcnRBbmdsZSArIGQuZW5kQW5nbGUpIC8gMikgLSBNYXRoLlBJIC8gMik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIHggKyBcIixcIiArIHkgKyBcIikgcm90YXRlKFwiICsgKGdyYWRlcyAtIDkwICsgMTgwKSArIFwiKVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAuc3R5bGUoXCJmb250LXNpemVcIiwgXCIxMnB4XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIiwgY29uZmlnLmZvbnRTaXplKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5kYXRhLnR5cGUgKyBcIiBcIiArIGQuZGF0YS5jb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB0eXBlKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgZC5wb3B1bGF0aW9uID0gK2QucG9wdWxhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGdyYXBoaWNNb2RlID09ICdyaW5ncycpIHtcblxuICAgICAgICAgICAgICAgIHZhciByaW5ncyA9IGdyYXBoXG4gICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCIucmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShjaXJjbGVTY2FsZXMpO1xuXG4gICAgICAgICAgICAgICAgcmluZ3NcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcInBhdGhcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaXJjbGVDb2xvclNjYWxlKGQuZG9tYWluKClbMF0pO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImRcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyYyA9IGQzLnN2Zy5hcmMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5pbm5lclJhZGl1cyhkLnJhbmdlKClbMF0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm91dGVyUmFkaXVzKGQucmFuZ2UoKVsxXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc3RhcnRBbmdsZSgwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5lbmRBbmdsZSgyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJjKGQpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImlkXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInJpbmdcIiArIGk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG5cblxuICAgICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25lIHJpbmcgaGFzIGJlZW4gc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWQuY2xhc3NlZChcInpvb21lZFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQuY2xhc3NlZChcInpvb21lZFwiLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXIudXBkYXRlKGRhdGEsIHVwZGF0ZVNjYWxlcyhyYWRpdXMpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLmNsYXNzZWQoXCJ6b29tZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW5kZXIudXBkYXRlKGRhdGEsIHVwZGF0ZVNjYWxlcyhyYWRpdXMsIGQpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmluZ3NcbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24odHJhbnNpdGlvblNwZWVkKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImRcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyYyA9IGQzLnN2Zy5hcmMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5pbm5lclJhZGl1cyhjaXJjbGVTY2FsZXNbaV0ucmFuZ2UoKVswXSArIDAuMSkgLy8gSGF2ZSB0byBhZGQgMC4xIG90aGVyd2lzZSBpdCBkb2Vzbid0IHRyYW5zaXRpb24gY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm91dGVyUmFkaXVzKGNpcmNsZVNjYWxlc1tpXS5yYW5nZSgpWzFdICsgMC4xKSAvLyBIYXZlIHRvIGFkZCAwLjEgb3RoZXJ3aXNlIGl0IGRvZXNuJ3QgdHJhbnNpdGlvbiBjb3JyZWN0bHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc3RhcnRBbmdsZSgwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5lbmRBbmdsZSgyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJjKGQsIGkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHZhciBkaXNwbERhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgaW4gZGF0YSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbaV0udHlwZSA9PSB2aXpUeXBlKVxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzcGxEYXRhLnB1c2goZGF0YVtpXSlcblxuICAgICAgICAgICAgICAgICAgICAvLyBDYWxjdWxhdGUgY29vcmRzIGZvciBlYWNoIGRhdGEgcG9pbnRcbiAgICAgICAgICAgICAgICB2YXIgc3RlcFJhZCA9IDIgKiBNYXRoLlBJICogMzYwIC8gZGlzcGxEYXRhLmxlbmd0aDsgLy8gZ3JhZGVzXG4gICAgICAgICAgICAgICAgdmFyIGN1cnJBbmdsZSA9IDA7XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRpc3BsRGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcCA9IGRpc3BsRGF0YVtpXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjYWxlID0gY2lyY2xlU2NhbGVzW35+KCgxIC0gcC52YWx1ZSkgLyAwLjIpXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvb3JkcyA9IHBvaW50KHNjYWxlKDEgLSBwLnZhbHVlKSwgY3VyckFuZ2xlKTtcbiAgICAgICAgICAgICAgICAgICAgcC54ID0gY29vcmRzWzBdO1xuICAgICAgICAgICAgICAgICAgICBwLnkgPSBjb29yZHNbMV07XG4gICAgICAgICAgICAgICAgICAgIHAuYW5nbGUgPSBjdXJyQW5nbGU7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJBbmdsZSArPSAoMiAqIE1hdGguUEkgLyBkaXNwbERhdGEubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBMaW5rc1xuICAgICAgICAgICAgICAgIGxpbmtzID0gZ3JhcGguc2VsZWN0QWxsKFwiLm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19saW5rXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKGRpc3BsRGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQub2JqZWN0ICsgXCItXCIgKyBkLnN1YmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGxpbmtzXG4gICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZVwiLCBcIm5hdnlcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19saW5rIHVuc2VsZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbGlua3NcbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24odHJhbnNpdGlvblNwZWVkKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLng7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQueTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmFkaXVzICogTWF0aC5jb3MoZC5hbmdsZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJhZGl1cyAqIE1hdGguc2luKGQuYW5nbGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIE5vZGVzXG4gICAgICAgICAgICAgICAgcG9pbnRzID0gZ3JhcGguc2VsZWN0QWxsKFwiLm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19ub2RlXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKGRpc3BsRGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQub2JqZWN0ICsgXCItXCIgKyBkLnN1YmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHBvaW50c1xuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiY2lyY2xlXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJvcGVuVGFyZ2V0c19kLWRfb3ZlcnZpZXdfbm9kZSBzZWxlY3RlZFwiKVxuICAgICAgICAgICAgICAgICAgICAub24oXCJtb3VzZW91dFwiLCB1bnNlbGVjdClcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsIHNlbGVjdClcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvb2x0aXBcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBwb2ludHNcbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24odHJhbnNpdGlvblNwZWVkKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImN4XCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLng7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY3lcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQueTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJyXCIsIGNvbmZpZy5wb2ludFNpemUpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBjb25maWcucG9pbnRDb2xvcik7XG5cbiAgICAgICAgICAgICAgICAvLyBMYWJlbHNcbiAgICAgICAgICAgICAgICBncmFwaC5zZWxlY3RBbGwoXCIub3BlblRhcmdldHNfZC1kX292ZXJ2aWV3X2xhYmVsXCIpLnJlbW92ZSgpXG4gICAgICAgICAgICAgICAgbGFiZWxzID0gZ3JhcGguc2VsZWN0QWxsKFwiLm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19sYWJlbFwiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShkaXNwbERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLm9iamVjdCArIFwiLVwiICsgZC5zdWJqZWN0O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBsYWJlbHNcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19sYWJlbCBzZWxlY3RlZFwiKVxuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgU1ZHIGNvbnRhaW5lciwgYW5kIGFwcGx5IGEgdHJhbnNmb3JtIHN1Y2ggdGhhdCB0aGUgb3JpZ2luIGlzIHRoZVxuICAgICAgICAgICAgICAgICAgICAvLyBjZW50ZXIgb2YgdGhlIGNhbnZhcy4gVGhpcyB3YXksIHdlIGRvbid0IG5lZWQgdG8gcG9zaXRpb24gYXJjcyBpbmRpdmlkdWFsbHlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdyYWRlcyA9IGQuYW5nbGUgKiAzNjAgLyAoMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHggPSBncmFwaFNpemUgLyAyICogTWF0aC5jb3MoZC5hbmdsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgeSA9IGdyYXBoU2l6ZSAvIDIgKiBNYXRoLnNpbihkLmFuZ2xlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgeCArIFwiLFwiICsgeSArIFwiKVwiO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIiwgY29uZmlnLmZvbnRTaXplKVxuICAgICAgICAgICAgICAgICAgICAvLyAuc3R5bGUoXCJmb250LXNpemVcIiwgXCIxMHB4XCIpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBncmFkZXMgPSBkLmFuZ2xlICogMzYwIC8gKDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChncmFkZXMgJSAzNjAgPiA5MCAmJiBncmFkZXMgJSAzNjAgPCAyNzUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJlbmRcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInN0YXJ0XCI7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLm9iamVjdDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdyYWRlcyA9IGQuYW5nbGUgKiAzNjAgLyAoMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdyYWRlcyAlIDM2MCA+IDkwICYmIGdyYWRlcyAlIDM2MCA8IDI3NSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInJvdGF0ZShcIiArICgoZ3JhZGVzICUgMzYwKSArIDE4MCkgKyBcIilcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInJvdGF0ZShcIiArIChncmFkZXMgJSAzNjApICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCBzZWxlY3QpXG4gICAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNlb3V0XCIsIHVuc2VsZWN0KVxuICAgICAgICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCB0b29sdGlwKTtcblxuICAgICAgICAgICAgICAgIC8vIGRyYXdEYXRhKFwiZGlzZWFzZXMxXCIpXG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlQnJlYWRjcnVtYnMobm9kZUFycmF5KSB7XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBicmVhZGNydW1iUG9pbnRzKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBvaW50cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBwb2ludHMucHVzaChcIjAsMFwiKTtcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRzLnB1c2goYi53ICsgXCIsMFwiKTtcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRzLnB1c2goYi53ICsgYi50ICsgXCIsXCIgKyAoYi5oIC8gMikpO1xuICAgICAgICAgICAgICAgICAgICBwb2ludHMucHVzaChiLncgKyBcIixcIiArIGIuaCk7XG4gICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKFwiMCxcIiArIGIuaCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID4gMCkgeyAvLyBMZWZ0bW9zdCBicmVhZGNydW1iOyBkb24ndCBpbmNsdWRlIDZ0aCB2ZXJ0ZXguXG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludHMucHVzaChiLnQgKyBcIixcIiArIChiLmggLyAyKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBvaW50cy5qb2luKFwiIFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiI3RyYWlsXCIpLnJlbW92ZSgpXG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgdGhlIHN2ZyBhcmVhLlxuICAgICAgICAgICAgICAgIHZhciB0cmFpbCA9IGQzLnNlbGVjdChcIiNzZXF1ZW5jZVwiKS5hcHBlbmQoXCJzdmc6c3ZnXCIpXG4gICAgICAgICAgICAgICAgICAgIC8vIC5hdHRyKFwid2lkdGhcIiwgMTIwMClcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwid2lkdGhcIiwgY29uZmlnLnNpemUpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImhlaWdodFwiLCAzMClcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJpZFwiLCBcInRyYWlsXCIpO1xuXG4gICAgICAgICAgICAgICAgLy8gRGF0YSBqb2luOyBrZXkgZnVuY3Rpb24gY29tYmluZXMgbmFtZSBhbmQgZGVwdGggKD0gcG9zaXRpb24gaW4gc2VxdWVuY2UpLlxuICAgICAgICAgICAgICAgIHZhciBnID0gZDMuc2VsZWN0KFwiI3RyYWlsXCIpXG4gICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCJnXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKG5vZGVBcnJheSwgZnVuY3Rpb24oZCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5uYW1lICsgZC5kZXB0aDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgYnJlYWRjcnVtYiBhbmQgbGFiZWwgZm9yIGVudGVyaW5nIG5vZGVzLlxuICAgICAgICAgICAgICAgIHZhciBlbnRlcmluZyA9IGcuZW50ZXIoKS5hcHBlbmQoXCJzdmc6Z1wiKTtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlbmRlckluaXRpYWxTdGF0ZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmluZ3MgPSBkMy5zZWxlY3RBbGwoXCIjcGllQ2hhcnQgLnJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpbmVzID0gZDMuc2VsZWN0QWxsKFwiI3BpZUNoYXJ0IGxpbmVcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHZhciBsYWJlbHM9ZDMuc2VsZWN0QWxsKFwiI3BpZUNoYXJ0IHRleHRcIilcbiAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiI3BpZUNoYXJ0IHRleHRcIikuc3R5bGUoJ29wYWNpdHknLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNpcmNsZXMgPSBkMy5zZWxlY3RBbGwoXCIjcGllQ2hhcnQgY2lyY2xlXCIpXG5cbiAgICAgICAgICAgICAgICAgICAgcmluZ3MudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24oMjAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiI3BpZUNoYXJ0IGxpbmVcIikucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGQzLnNlbGVjdEFsbChcIiNwaWVDaGFydCB0ZXh0XCIpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoXCIjcGllQ2hhcnQgLm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19sYWJlbFwiKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiI3BpZUNoYXJ0IGNpcmNsZVwiKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoJyNzZXF1ZW5jZSBnJykucmVtb3ZlKClcblxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVCcmVhZGNydW1icyhbeyBuYW1lOiAnSG9tZScgfV0pO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiI3BpZUNoYXJ0IC5yaW5nXCIpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gcGF0aC5kYXRhKHBpZShkYXRhVHlwZXMpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhbGxDb2xvcnNFeHBbKGQuZGF0YS50eXBlKV1bMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGgudHJhbnNpdGlvbigpLmR1cmF0aW9uKDUwMCkuYXR0clR3ZWVuKFwiZFwiLCBmdW5jdGlvbihhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSBkMy5pbnRlcnBvbGF0ZSh0aGlzLl9jdXJyZW50LCBhKSAvLyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gayA9IGQzLmludGVycG9sYXRlKGFyYy5vdXRlclJhZGl1cygpKCksIG5ld1JhZGl1cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fY3VycmVudCA9IGkoMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyYyhpKHQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmV0dXJuIGFyYy5pbm5lclJhZGl1cyhrKHQpIC8gNCkub3V0ZXJSYWRpdXMoayh0KSkoaSh0KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiI3BpZUNoYXJ0IHRleHRcIikudHJhbnNpdGlvbigpLmR1cmF0aW9uKDYwMCkuc3R5bGUoJ29wYWNpdHknLCAxKTtcblxuICAgICAgICAgICAgICAgICAgICB9LCA1MDApXG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBlbnRlcmluZy5hcHBlbmQoXCJzdmc6cG9seWdvblwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInBvaW50c1wiLCBicmVhZGNydW1iUG9pbnRzKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkLm5hbWUgPT0gJ0hvbWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcjRENEQ0RDJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhbGxDb2xvcnNFeHBbZC5uYW1lXVsxXVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wYXJlbnROb2RlLmNoaWxkTm9kZXNbMV0uaW5uZXJIVE1MID09IFwiSG9tZVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckluaXRpYWxTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgZW50ZXJpbmcuYXBwZW5kKFwic3ZnOnRleHRcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4XCIsIChiLncgKyBiLnQpIC8gMilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIGIuaCAvIDIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZHlcIiwgXCIwLjM1ZW1cIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmFtZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGQubmFtZS5sZW5ndGggPiAxMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUgPSBkLm5hbWUuc3Vic3RyaW5nKDAsIDEwKSArICcuLi4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lID0gZC5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZXR1cm4gZC5uYW1lO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pbm5lckhUTUwgPT0gXCJIb21lXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVySW5pdGlhbFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHBvc2l0aW9uIGZvciBlbnRlcmluZyBhbmQgdXBkYXRpbmcgbm9kZXMuXG4gICAgICAgICAgICAgICAgZy5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgaSAqIChiLncgKyBiLnMpICsgXCIsIDApXCI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGRyYXdEYXRhKHR5cGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGlzcGxEYXRhID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChpIGluIGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbaV0udHlwZSA9PSB0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNwbERhdGEucHVzaChkYXRhW2ldKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIGNvb3JkcyBmb3IgZWFjaCBkYXRhIHBvaW50XG4gICAgICAgICAgICAgICAgLy8gdmFyIHN0ZXBSYWQgPSAyICogTWF0aC5QSSAvIGRpc3BsRGF0YS5sZW5ndGg7IC8vIGdyYWRlc1xuICAgICAgICAgICAgICAgIC8vIHZhciBzdGVwUmFkID0gMiAqIE1hdGguUEkgKiAzNjAgLyBkaXNwbERhdGEubGVuZ3RoOyAvLyBncmFkZXNcbiAgICAgICAgICAgICAgICB2YXIgc3RlcFJhZCA9IDMuNTsgLy8gZ3JhZGVzXG5cbiAgICAgICAgICAgICAgICB2YXIgY3VyckFuZ2xlID0gMDtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGlzcGxEYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwID0gZGlzcGxEYXRhW2ldO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSBjaXJjbGVTY2FsZXNbfn4oKDEgLSBwLnZhbHVlKSAvIDAuMildO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29vcmRzID0gcG9pbnQoc2NhbGUoMSAtIHAudmFsdWUpLCBjdXJyQW5nbGUpO1xuICAgICAgICAgICAgICAgICAgICBwLnggPSBjb29yZHNbMF07XG4gICAgICAgICAgICAgICAgICAgIHAueSA9IGNvb3Jkc1sxXTtcbiAgICAgICAgICAgICAgICAgICAgcC5hbmdsZSA9IGN1cnJBbmdsZTtcbiAgICAgICAgICAgICAgICAgICAgY3VyckFuZ2xlICs9ICgyICogTWF0aC5QSSAvIGRpc3BsRGF0YS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBjdXJyQW5nbGUgKz0gKHN0ZXBSYWQgKiAyICogTWF0aC5QSSAvIDM2MCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTGlua3NcbiAgICAgICAgICAgICAgICBsaW5rcyA9IGdyYXBoLnNlbGVjdEFsbChcIi5vcGVuVGFyZ2V0c19kLWRfb3ZlcnZpZXdfbGlua1wiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShkaXNwbERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLm9iamVjdCArIFwiLVwiICsgZC5zdWJqZWN0O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBsaW5rc1xuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJzdHJva2VcIiwgXCJuYXZ5XCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJvcGVuVGFyZ2V0c19kLWRfb3ZlcnZpZXdfbGluayB1bnNlbGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIGxpbmtzXG4gICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKHRyYW5zaXRpb25TcGVlZClcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC54O1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInkxXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLnk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieDJcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJhZGl1cyAqIE1hdGguY29zKGQuYW5nbGUpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInkyXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByYWRpdXMgKiBNYXRoLnNpbihkLmFuZ2xlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBOb2Rlc1xuICAgICAgICAgICAgICAgIHBvaW50cyA9IGdyYXBoLnNlbGVjdEFsbChcIi5vcGVuVGFyZ2V0c19kLWRfb3ZlcnZpZXdfbm9kZVwiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShkaXNwbERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLm9iamVjdCArIFwiLVwiICsgZC5zdWJqZWN0O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBwb2ludHNcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwib3BlblRhcmdldHNfZC1kX292ZXJ2aWV3X25vZGUgc2VsZWN0ZWRcIilcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgdW5zZWxlY3QpXG4gICAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCBzZWxlY3QpXG4gICAgICAgICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsIHRvb2x0aXApO1xuICAgICAgICAgICAgICAgIC8vIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7IHRvb2x0aXAodGhpcyxkYXRhVHlwZXMpfSk7XG4gICAgICAgICAgICAgICAgcG9pbnRzXG4gICAgICAgICAgICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgICAgICAgICAgLmR1cmF0aW9uKHRyYW5zaXRpb25TcGVlZClcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjeFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC54O1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImN5XCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLnk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiclwiLCBjb25maWcucG9pbnRTaXplKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgY29uZmlnLnBvaW50Q29sb3IpO1xuXG4gICAgICAgICAgICAgICAgLy8gTGFiZWxzXG4gICAgICAgICAgICAgICAgZ3JhcGguc2VsZWN0QWxsKFwiLm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19sYWJlbFwiKS5yZW1vdmUoKVxuICAgICAgICAgICAgICAgIGxhYmVscyA9IGdyYXBoLnNlbGVjdEFsbChcIi5vcGVuVGFyZ2V0c19kLWRfb3ZlcnZpZXdfbGFiZWxcIilcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEoZGlzcGxEYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5vYmplY3QgKyBcIi1cIiArIGQuc3ViamVjdDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbGFiZWxzXG4gICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJvcGVuVGFyZ2V0c19kLWRfb3ZlcnZpZXdfbGFiZWwgc2VsZWN0ZWRcIilcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIFNWRyBjb250YWluZXIsIGFuZCBhcHBseSBhIHRyYW5zZm9ybSBzdWNoIHRoYXQgdGhlIG9yaWdpbiBpcyB0aGVcbiAgICAgICAgICAgICAgICAgICAgLy8gY2VudGVyIG9mIHRoZSBjYW52YXMuIFRoaXMgd2F5LCB3ZSBkb24ndCBuZWVkIHRvIHBvc2l0aW9uIGFyY3MgaW5kaXZpZHVhbGx5XG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBncmFkZXMgPSBkLmFuZ2xlICogMzYwIC8gKDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB4ID0gZ3JhcGhTaXplIC8gMiAqIE1hdGguY29zKGQuYW5nbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHkgPSBncmFwaFNpemUgLyAyICogTWF0aC5zaW4oZC5hbmdsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIHggKyBcIixcIiArIHkgKyBcIilcIjtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcInRleHRcIilcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwiZm9udC1zaXplXCIsIGNvbmZpZy5mb250U2l6ZSlcbiAgICAgICAgICAgICAgICAgICAgLy8gLnN0eWxlKFwiZm9udC1zaXplXCIsIFwiMTBweFwiKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ3JhZGVzID0gZC5hbmdsZSAqIDM2MCAvICgyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ3JhZGVzICUgMzYwID4gOTAgJiYgZ3JhZGVzICUgMzYwIDwgMjc1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiZW5kXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJzdGFydFwiO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5vYmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBncmFkZXMgPSBkLmFuZ2xlICogMzYwIC8gKDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChncmFkZXMgJSAzNjAgPiA5MCAmJiBncmFkZXMgJSAzNjAgPCAyNzUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJyb3RhdGUoXCIgKyAoKGdyYWRlcyAlIDM2MCkgKyAxODApICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJyb3RhdGUoXCIgKyAoZ3JhZGVzICUgMzYwKSArIFwiKVwiO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAub24oXCJtb3VzZW92ZXJcIiwgc2VsZWN0KVxuICAgICAgICAgICAgICAgICAgICAub24oXCJtb3VzZW91dFwiLCB1bnNlbGVjdClcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgdG9vbHRpcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcuZGF0YSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBkMy5qc29uKGNvbmZpZy5kYXRhLCBmdW5jdGlvbihlcnJvciwgcmVzcCkge1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcC5kYXRhO1xuICAgICAgICAgICAgICAgIHJlbmRlci51cGRhdGUoZGF0YSwgdXBkYXRlU2NhbGVzKHJhZGl1cyksICdwaWVDaGFydCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIHJlbmRlci51cGRhdGUoY29uZmlnLmRhdGEsIHVwZGF0ZVNjYWxlcyhyYWRpdXMpLCAncGllQ2hhcnQnKTtcbiAgICAgICAgfVxuXG5cblxuICAgIH07XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVTY2FsZXMocmFkaXVzLCBzZWxlY3RlZCkge1xuICAgICAgICB2YXIgY2lyY2xlU2NhbGVzID0gW1xuICAgICAgICAgICAgZDMuc2NhbGUubGluZWFyKCkuZG9tYWluKFswLjAsIDAuMl0pLnJhbmdlKFswLCAxICogcmFkaXVzIC8gNV0pLmNsYW1wKHRydWUpLFxuICAgICAgICAgICAgZDMuc2NhbGUubGluZWFyKCkuZG9tYWluKFswLjIsIDAuNF0pLnJhbmdlKFsxICogcmFkaXVzIC8gNSwgMiAqIHJhZGl1cyAvIDVdKS5jbGFtcCh0cnVlKSxcbiAgICAgICAgICAgIGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihbMC40LCAwLjZdKS5yYW5nZShbMiAqIHJhZGl1cyAvIDUsIDMgKiByYWRpdXMgLyA1XSkuY2xhbXAodHJ1ZSksXG4gICAgICAgICAgICBkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oWzAuNiwgMC44XSkucmFuZ2UoWzMgKiByYWRpdXMgLyA1LCA0ICogcmFkaXVzIC8gNV0pLmNsYW1wKHRydWUpLFxuICAgICAgICAgICAgZDMuc2NhbGUubGluZWFyKCkuZG9tYWluKFswLjgsIDEuMF0pLnJhbmdlKFs0ICogcmFkaXVzIC8gNSwgNSAqIHJhZGl1cyAvIDVdKS5jbGFtcCh0cnVlKSxcbiAgICAgICAgXTtcblxuICAgICAgICBpZiAoIXNlbGVjdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2lyY2xlU2NhbGVzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2UgYXJlIGZvY3VzaW5nIG9uIGEgc2NhbGVcbiAgICAgICAgdmFyIG5ld1NjYWxlcyA9IFtdO1xuICAgICAgICB2YXIgY3VyclJhZCA9IDA7XG4gICAgICAgIC8vaWYgaXQncyB0aGUgc2VsZWN0ZWQgc2NhbGUgcHV0IGl0IHRvIHRoZSBsZW5ndGggb2YgcmFkaXVzIGVsc2UgcHV0IGl0IHRvIDAgbGVuZ3RoXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2lyY2xlU2NhbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2NhbGUgPSBjaXJjbGVTY2FsZXNbaV07XG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWQuZG9tYWluKClbMF0gPT0gc2NhbGUuZG9tYWluKClbMF0pIHtcbiAgICAgICAgICAgICAgICBzY2FsZS5yYW5nZShbY3VyclJhZCwgcmFkaXVzXSk7XG4gICAgICAgICAgICAgICAgY3VyclJhZCA9IHJhZGl1cztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2NhbGUucmFuZ2UoW2N1cnJSYWQsIGN1cnJSYWRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ld1NjYWxlcy5wdXNoKHNjYWxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3U2NhbGVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvb2x0aXAoZCkge1xuXG4gICAgICAgIHZhciBvYmogPSB7fTtcbiAgICAgICAgb2JqLmhlYWRlciA9IGQub2JqZWN0O1xuICAgICAgICBvYmoucm93cyA9IFtdO1xuICAgICAgICBvYmoucm93cy5wdXNoKHtcbiAgICAgICAgICAgIGxhYmVsOiBcInR5cGVcIixcbiAgICAgICAgICAgIHZhbHVlOiBkLnR5cGVcbiAgICAgICAgfSk7XG4gICAgICAgIG9iai5yb3dzLnB1c2goe1xuICAgICAgICAgICAgbGFiZWw6IFwiVmFsdWU6XCIsXG4gICAgICAgICAgICB2YWx1ZTogU3RyaW5nKGQudmFsdWUgKiAxMDApLnNsaWNlKDAsIDUpXG4gICAgICAgIH0pO1xuICAgICAgICB0bnRUb29sdGlwLnRhYmxlKClcbiAgICAgICAgICAgIC53aWR0aCgxODApXG4gICAgICAgICAgICAuc2hvd19jbG9zZXIodHJ1ZSlcbiAgICAgICAgICAgIC5jYWxsKHRoaXMsIG9iaik7XG4gICAgfVxuXG4gICAgLy8gcHJpdmF0ZSBtZXRob2RzXG4gICAgZnVuY3Rpb24gc2VsZWN0KGQpIHtcbiAgICAgICAgdmFyIHNlbGVjdE5vZGUgPSB0aGlzO1xuICAgICAgICBsaW5rc1xuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgICAgIHZhciBjaGVja0xpbmsgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGlmIChkLm9iamVjdCA9PT0gbC5vYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0KGNoZWNrTGluaylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidW5zZWxlY3RlZFwiLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0KGNoZWNrTGluaylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInVuc2VsZWN0ZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIGxhYmVsc1xuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24obCkge1xuICAgICAgICAgICAgICAgIHZhciBjaGVja0xhYmVsID0gdGhpcztcbiAgICAgICAgICAgICAgICBpZiAoZC5vYmplY3QgPT09IGwub2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGQzLnNlbGVjdChjaGVja0xhYmVsKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ1bnNlbGVjdGVkXCIsIGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3QoY2hlY2tMYWJlbClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInVuc2VsZWN0ZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIHBvaW50c1xuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24ocCkge1xuICAgICAgICAgICAgICAgIHZhciBjaGVja05vZGUgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGlmIChwLm9iamVjdCA9PT0gZC5vYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0KGNoZWNrTm9kZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidW5zZWxlY3RlZFwiLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0KGNoZWNrTm9kZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInVuc2VsZWN0ZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5zZWxlY3QoKSB7XG4gICAgICAgIGxpbmtzXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ1bnNlbGVjdGVkXCIsIHRydWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIGxhYmVsc1xuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ1bnNlbGVjdGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICBwb2ludHNcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInNlbGVjdGVkXCIsIHRydWUpXG4gICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidW5zZWxlY3RlZFwiLCBmYWxzZSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwb2ludChsLCByKSB7XG4gICAgICAgIHZhciB4ID0gbCAqIE1hdGguY29zKHIpO1xuICAgICAgICB2YXIgeSA9IGwgKiBNYXRoLnNpbihyKTtcbiAgICAgICAgcmV0dXJuIFt4LCB5XTtcbiAgICB9XG5cbiAgICAvLyBQdWJsaWMgbWV0aG9kc1xuXG4gICAgcmVuZGVyLnJlYWQgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIC8vIGlmICh0eXBlb2YgZGF0YSA9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbmZpZy5kYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uZmlnLmRhdGEgPSBkYXRhO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIC8vIH1cbiAgICB9XG5cbiAgICByZW5kZXIuc2l6ZSA9IGZ1bmN0aW9uKHNpemUpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY29uZmlnLnNpemU7XG4gICAgICAgIH1cbiAgICAgICAgY29uZmlnLnNpemUgPSBzaXplO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgcmVuZGVyLnNldFBpZUNvbG9ycyA9IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZy5hbGxDb2xvcnNFeHA7XG4gICAgICAgIH1cbiAgICAgICAgY29uZmlnLmFsbENvbG9yc0V4cCA9IGNvbG9yO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgcmVuZGVyLnNldEZvbnRTaXplID0gZnVuY3Rpb24oc2l6ZSkge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjb25maWcuZm9udFNpemU7XG4gICAgICAgIH1cbiAgICAgICAgaWYodHlwZW9mIHNpemU9PSBcIm51bWJlclwiKXtcbiAgICAgICAgICAgIHNpemUgPSBTdHJpbmcoc2l6ZSsncHgnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25maWcuZm9udFNpemU9c2l6ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHJlbmRlci5zZXRQb2ludFNpemUgPSBmdW5jdGlvbihzaXplKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZy5wb2ludFNpemU7XG4gICAgICAgIH1cbiAgICAgICAgY29uZmlnLnBvaW50U2l6ZSA9IHNpemU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICByZW5kZXIuc2V0UG9pbnRDb2xvciA9IGZ1bmN0aW9uKGNvbG9yKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZy5wb2ludENvbG9yO1xuICAgICAgICB9XG4gICAgICAgIGNvbmZpZy5wb2ludENvbG9yID0gY29sb3I7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICByZW5kZXIuZmlsdGVyX3R5cGUgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgIHBvaW50c1xuICAgICAgICAgICAgLnN0eWxlKFwiZGlzcGxheVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcImJsb2NrXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChkLnR5cGUgIT09IHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwibm9uZVwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gXCJibG9ja1wiO1xuICAgICAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4gcmVuZGVyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdmlzO1xuIl19
