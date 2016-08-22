(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require("./index.js");

},{"./index.js":2}],2:[function(require,module,exports){
module.exports = vis = require("./src/vis.js");

},{"./src/vis.js":7}],3:[function(require,module,exports){
module.exports = tooltip = require("./src/tooltip.js");

},{"./src/tooltip.js":6}],4:[function(require,module,exports){
module.exports = require("./src/api.js");

},{"./src/api.js":5}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
var apijs = require("tnt.api");
// var d3 = require("d3");

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

},{"tnt.api":4}],7:[function(require,module,exports){
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

},{"tnt.tooltip":3}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2RpbWl0cmlzL2Jpb2pzL3Rlc3RWaXpUYXJnZXREaXNlYXNlcy9WaXpUYXJnZXREaXNlYXNlcy9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvZGltaXRyaXMvYmlvanMvdGVzdFZpelRhcmdldERpc2Vhc2VzL1ZpelRhcmdldERpc2Vhc2VzL2Zha2VfYWQ5YWZlNDMuanMiLCIvaG9tZS9kaW1pdHJpcy9iaW9qcy90ZXN0Vml6VGFyZ2V0RGlzZWFzZXMvVml6VGFyZ2V0RGlzZWFzZXMvaW5kZXguanMiLCIvaG9tZS9kaW1pdHJpcy9iaW9qcy90ZXN0Vml6VGFyZ2V0RGlzZWFzZXMvVml6VGFyZ2V0RGlzZWFzZXMvbm9kZV9tb2R1bGVzL3RudC50b29sdGlwL2luZGV4LmpzIiwiL2hvbWUvZGltaXRyaXMvYmlvanMvdGVzdFZpelRhcmdldERpc2Vhc2VzL1ZpelRhcmdldERpc2Vhc2VzL25vZGVfbW9kdWxlcy90bnQudG9vbHRpcC9ub2RlX21vZHVsZXMvdG50LmFwaS9pbmRleC5qcyIsIi9ob21lL2RpbWl0cmlzL2Jpb2pzL3Rlc3RWaXpUYXJnZXREaXNlYXNlcy9WaXpUYXJnZXREaXNlYXNlcy9ub2RlX21vZHVsZXMvdG50LnRvb2x0aXAvbm9kZV9tb2R1bGVzL3RudC5hcGkvc3JjL2FwaS5qcyIsIi9ob21lL2RpbWl0cmlzL2Jpb2pzL3Rlc3RWaXpUYXJnZXREaXNlYXNlcy9WaXpUYXJnZXREaXNlYXNlcy9ub2RlX21vZHVsZXMvdG50LnRvb2x0aXAvc3JjL3Rvb2x0aXAuanMiLCIvaG9tZS9kaW1pdHJpcy9iaW9qcy90ZXN0Vml6VGFyZ2V0RGlzZWFzZXMvVml6VGFyZ2V0RGlzZWFzZXMvc3JjL3Zpcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB2aXMgPSByZXF1aXJlKFwiLi9zcmMvdmlzLmpzXCIpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB0b29sdGlwID0gcmVxdWlyZShcIi4vc3JjL3Rvb2x0aXAuanNcIik7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL3NyYy9hcGkuanNcIik7XG4iLCJ2YXIgYXBpID0gZnVuY3Rpb24gKHdobykge1xuXG4gICAgdmFyIF9tZXRob2RzID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgbSA9IFtdO1xuXG5cdG0uYWRkX2JhdGNoID0gZnVuY3Rpb24gKG9iaikge1xuXHQgICAgbS51bnNoaWZ0KG9iaik7XG5cdH07XG5cblx0bS51cGRhdGUgPSBmdW5jdGlvbiAobWV0aG9kLCB2YWx1ZSkge1xuXHQgICAgZm9yICh2YXIgaT0wOyBpPG0ubGVuZ3RoOyBpKyspIHtcblx0XHRmb3IgKHZhciBwIGluIG1baV0pIHtcblx0XHQgICAgaWYgKHAgPT09IG1ldGhvZCkge1xuXHRcdFx0bVtpXVtwXSA9IHZhbHVlO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0ICAgIH1cblx0XHR9XG5cdCAgICB9XG5cdCAgICByZXR1cm4gZmFsc2U7XG5cdH07XG5cblx0bS5hZGQgPSBmdW5jdGlvbiAobWV0aG9kLCB2YWx1ZSkge1xuXHQgICAgaWYgKG0udXBkYXRlIChtZXRob2QsIHZhbHVlKSApIHtcblx0ICAgIH0gZWxzZSB7XG5cdFx0dmFyIHJlZyA9IHt9O1xuXHRcdHJlZ1ttZXRob2RdID0gdmFsdWU7XG5cdFx0bS5hZGRfYmF0Y2ggKHJlZyk7XG5cdCAgICB9XG5cdH07XG5cblx0bS5nZXQgPSBmdW5jdGlvbiAobWV0aG9kKSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bS5sZW5ndGg7IGkrKykge1xuXHRcdGZvciAodmFyIHAgaW4gbVtpXSkge1xuXHRcdCAgICBpZiAocCA9PT0gbWV0aG9kKSB7XG5cdFx0XHRyZXR1cm4gbVtpXVtwXTtcblx0XHQgICAgfVxuXHRcdH1cblx0ICAgIH1cblx0fTtcblxuXHRyZXR1cm4gbTtcbiAgICB9O1xuXG4gICAgdmFyIG1ldGhvZHMgICAgPSBfbWV0aG9kcygpO1xuICAgIHZhciBhcGkgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIGFwaS5jaGVjayA9IGZ1bmN0aW9uIChtZXRob2QsIGNoZWNrLCBtc2cpIHtcblx0aWYgKG1ldGhvZCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8bWV0aG9kLmxlbmd0aDsgaSsrKSB7XG5cdFx0YXBpLmNoZWNrKG1ldGhvZFtpXSwgY2hlY2ssIG1zZyk7XG5cdCAgICB9XG5cdCAgICByZXR1cm47XG5cdH1cblxuXHRpZiAodHlwZW9mIChtZXRob2QpID09PSAnZnVuY3Rpb24nKSB7XG5cdCAgICBtZXRob2QuY2hlY2soY2hlY2ssIG1zZyk7XG5cdH0gZWxzZSB7XG5cdCAgICB3aG9bbWV0aG9kXS5jaGVjayhjaGVjaywgbXNnKTtcblx0fVxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkudHJhbnNmb3JtID0gZnVuY3Rpb24gKG1ldGhvZCwgY2Jhaykge1xuXHRpZiAobWV0aG9kIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0ICAgIGZvciAodmFyIGk9MDsgaTxtZXRob2QubGVuZ3RoOyBpKyspIHtcblx0XHRhcGkudHJhbnNmb3JtIChtZXRob2RbaV0sIGNiYWspO1xuXHQgICAgfVxuXHQgICAgcmV0dXJuO1xuXHR9XG5cblx0aWYgKHR5cGVvZiAobWV0aG9kKSA9PT0gJ2Z1bmN0aW9uJykge1xuXHQgICAgbWV0aG9kLnRyYW5zZm9ybSAoY2Jhayk7XG5cdH0gZWxzZSB7XG5cdCAgICB3aG9bbWV0aG9kXS50cmFuc2Zvcm0oY2Jhayk7XG5cdH1cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgdmFyIGF0dGFjaF9tZXRob2QgPSBmdW5jdGlvbiAobWV0aG9kLCBvcHRzKSB7XG5cdHZhciBjaGVja3MgPSBbXTtcblx0dmFyIHRyYW5zZm9ybXMgPSBbXTtcblxuXHR2YXIgZ2V0dGVyID0gb3B0cy5vbl9nZXR0ZXIgfHwgZnVuY3Rpb24gKCkge1xuXHQgICAgcmV0dXJuIG1ldGhvZHMuZ2V0KG1ldGhvZCk7XG5cdH07XG5cblx0dmFyIHNldHRlciA9IG9wdHMub25fc2V0dGVyIHx8IGZ1bmN0aW9uICh4KSB7XG5cdCAgICBmb3IgKHZhciBpPTA7IGk8dHJhbnNmb3Jtcy5sZW5ndGg7IGkrKykge1xuXHRcdHggPSB0cmFuc2Zvcm1zW2ldKHgpO1xuXHQgICAgfVxuXG5cdCAgICBmb3IgKHZhciBqPTA7IGo8Y2hlY2tzLmxlbmd0aDsgaisrKSB7XG5cdFx0aWYgKCFjaGVja3Nbal0uY2hlY2soeCkpIHtcblx0XHQgICAgdmFyIG1zZyA9IGNoZWNrc1tqXS5tc2cgfHwgXG5cdFx0XHQoXCJWYWx1ZSBcIiArIHggKyBcIiBkb2Vzbid0IHNlZW0gdG8gYmUgdmFsaWQgZm9yIHRoaXMgbWV0aG9kXCIpO1xuXHRcdCAgICB0aHJvdyAobXNnKTtcblx0XHR9XG5cdCAgICB9XG5cdCAgICBtZXRob2RzLmFkZChtZXRob2QsIHgpO1xuXHR9O1xuXG5cdHZhciBuZXdfbWV0aG9kID0gZnVuY3Rpb24gKG5ld192YWwpIHtcblx0ICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdHJldHVybiBnZXR0ZXIoKTtcblx0ICAgIH1cblx0ICAgIHNldHRlcihuZXdfdmFsKTtcblx0ICAgIHJldHVybiB3aG87IC8vIFJldHVybiB0aGlzP1xuXHR9O1xuXHRuZXdfbWV0aG9kLmNoZWNrID0gZnVuY3Rpb24gKGNiYWssIG1zZykge1xuXHQgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0cmV0dXJuIGNoZWNrcztcblx0ICAgIH1cblx0ICAgIGNoZWNrcy5wdXNoICh7Y2hlY2sgOiBjYmFrLFxuXHRcdFx0ICBtc2cgICA6IG1zZ30pO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdH07XG5cdG5ld19tZXRob2QudHJhbnNmb3JtID0gZnVuY3Rpb24gKGNiYWspIHtcblx0ICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdHJldHVybiB0cmFuc2Zvcm1zO1xuXHQgICAgfVxuXHQgICAgdHJhbnNmb3Jtcy5wdXNoKGNiYWspO1xuXHQgICAgcmV0dXJuIHRoaXM7XG5cdH07XG5cblx0d2hvW21ldGhvZF0gPSBuZXdfbWV0aG9kO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0c2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBvcHRzKSB7XG5cdGlmICh0eXBlb2YgKHBhcmFtKSA9PT0gJ29iamVjdCcpIHtcblx0ICAgIG1ldGhvZHMuYWRkX2JhdGNoIChwYXJhbSk7XG5cdCAgICBmb3IgKHZhciBwIGluIHBhcmFtKSB7XG5cdFx0YXR0YWNoX21ldGhvZCAocCwgb3B0cyk7XG5cdCAgICB9XG5cdH0gZWxzZSB7XG5cdCAgICBtZXRob2RzLmFkZCAocGFyYW0sIG9wdHMuZGVmYXVsdF92YWx1ZSk7XG5cdCAgICBhdHRhY2hfbWV0aG9kIChwYXJhbSwgb3B0cyk7XG5cdH1cbiAgICB9O1xuXG4gICAgYXBpLmdldHNldCA9IGZ1bmN0aW9uIChwYXJhbSwgZGVmKSB7XG5cdGdldHNldChwYXJhbSwge2RlZmF1bHRfdmFsdWUgOiBkZWZ9KTtcblxuXHRyZXR1cm4gYXBpO1xuICAgIH07XG5cbiAgICBhcGkuZ2V0ID0gZnVuY3Rpb24gKHBhcmFtLCBkZWYpIHtcblx0dmFyIG9uX3NldHRlciA9IGZ1bmN0aW9uICgpIHtcblx0ICAgIHRocm93IChcIk1ldGhvZCBkZWZpbmVkIG9ubHkgYXMgYSBnZXR0ZXIgKHlvdSBhcmUgdHJ5aW5nIHRvIHVzZSBpdCBhcyBhIHNldHRlclwiKTtcblx0fTtcblxuXHRnZXRzZXQocGFyYW0sIHtkZWZhdWx0X3ZhbHVlIDogZGVmLFxuXHRcdCAgICAgICBvbl9zZXR0ZXIgOiBvbl9zZXR0ZXJ9XG5cdCAgICAgICk7XG5cblx0cmV0dXJuIGFwaTtcbiAgICB9O1xuXG4gICAgYXBpLnNldCA9IGZ1bmN0aW9uIChwYXJhbSwgZGVmKSB7XG5cdHZhciBvbl9nZXR0ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdCAgICB0aHJvdyAoXCJNZXRob2QgZGVmaW5lZCBvbmx5IGFzIGEgc2V0dGVyICh5b3UgYXJlIHRyeWluZyB0byB1c2UgaXQgYXMgYSBnZXR0ZXJcIik7XG5cdH07XG5cblx0Z2V0c2V0KHBhcmFtLCB7ZGVmYXVsdF92YWx1ZSA6IGRlZixcblx0XHQgICAgICAgb25fZ2V0dGVyIDogb25fZ2V0dGVyfVxuXHQgICAgICApO1xuXG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIGFwaS5tZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgY2Jhaykge1xuXHRpZiAodHlwZW9mIChuYW1lKSA9PT0gJ29iamVjdCcpIHtcblx0ICAgIGZvciAodmFyIHAgaW4gbmFtZSkge1xuXHRcdHdob1twXSA9IG5hbWVbcF07XG5cdCAgICB9XG5cdH0gZWxzZSB7XG5cdCAgICB3aG9bbmFtZV0gPSBjYmFrO1xuXHR9XG5cdHJldHVybiBhcGk7XG4gICAgfTtcblxuICAgIHJldHVybiBhcGk7XG4gICAgXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBhcGk7IiwidmFyIGFwaWpzID0gcmVxdWlyZShcInRudC5hcGlcIik7XG4vLyB2YXIgZDMgPSByZXF1aXJlKFwiZDNcIik7XG5cbnZhciB0b29sdGlwID0gZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIGRyYWcgPSBkMy5iZWhhdmlvci5kcmFnKCk7XG4gICAgdmFyIHRvb2x0aXBfZGl2O1xuXG4gICAgdmFyIGNvbmYgPSB7XG4gICAgICAgIHBvc2l0aW9uIDogXCJyaWdodFwiLFxuICAgICAgICBhbGxvd19kcmFnIDogdHJ1ZSxcbiAgICAgICAgc2hvd19jbG9zZXIgOiB0cnVlLFxuICAgICAgICBmaWxsIDogZnVuY3Rpb24gKCkgeyB0aHJvdyBcImZpbGwgaXMgbm90IGRlZmluZWQgaW4gdGhlIGJhc2Ugb2JqZWN0XCI7IH0sXG4gICAgICAgIHdpZHRoIDogMTgwLFxuICAgICAgICBpZCA6IDFcbiAgICB9O1xuXG4gICAgdmFyIHQgPSBmdW5jdGlvbiAoZGF0YSwgZXZlbnQpIHtcbiAgICAgICAgZHJhZ1xuICAgICAgICAgICAgLm9yaWdpbihmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHggOiBwYXJzZUludChkMy5zZWxlY3QodGhpcykuc3R5bGUoXCJsZWZ0XCIpKSxcbiAgICAgICAgICAgICAgICAgICAgeSA6IHBhcnNlSW50KGQzLnNlbGVjdCh0aGlzKS5zdHlsZShcInRvcFwiKSlcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5vbihcImRyYWdcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbmYuYWxsb3dfZHJhZykge1xuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImxlZnRcIiwgZDMuZXZlbnQueCArIFwicHhcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdHlsZShcInRvcFwiLCBkMy5ldmVudC55ICsgXCJweFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBUT0RPOiBXaHkgZG8gd2UgbmVlZCB0aGUgZGl2IGVsZW1lbnQ/XG4gICAgICAgIC8vIEl0IGxvb2tzIGxpa2UgaWYgd2UgYW5jaG9yIHRoZSB0b29sdGlwIGluIHRoZSBcImJvZHlcIlxuICAgICAgICAvLyBUaGUgdG9vbHRpcCBpcyBub3QgbG9jYXRlZCBpbiB0aGUgcmlnaHQgcGxhY2UgKGFwcGVhcnMgYXQgdGhlIGJvdHRvbSlcbiAgICAgICAgLy8gU2VlIGNsaWVudHMvdG9vbHRpcHNfdGVzdC5odG1sIGZvciBhbiBleGFtcGxlXG4gICAgICAgIHZhciBjb250YWluZXJFbGVtID0gc2VsZWN0QW5jZXN0b3IgKHRoaXMsIFwiZGl2XCIpO1xuICAgICAgICBpZiAoY29udGFpbmVyRWxlbSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBXZSByZXF1aXJlIGEgZGl2IGVsZW1lbnQgYXQgc29tZSBwb2ludCB0byBhbmNob3IgdGhlIHRvb2x0aXBcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRvb2x0aXBfZGl2ID0gZDMuc2VsZWN0KGNvbnRhaW5lckVsZW0pXG4gICAgICAgICAgICAuYXBwZW5kKFwiZGl2XCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3Rvb2x0aXBcIilcbiAgICAgICAgICAgIC5jbGFzc2VkKFwidG50X3Rvb2x0aXBfYWN0aXZlXCIsIHRydWUpICAvLyBUT0RPOiBJcyB0aGlzIG5lZWRlZC91c2VkPz8/XG4gICAgICAgICAgICAuY2FsbChkcmFnKTtcblxuICAgICAgICAvLyBwcmV2IHRvb2x0aXBzIHdpdGggdGhlIHNhbWUgaGVhZGVyXG4gICAgICAgIGQzLnNlbGVjdChcIiN0bnRfdG9vbHRpcF9cIiArIGNvbmYuaWQpLnJlbW92ZSgpO1xuXG4gICAgICAgIGlmICgoZDMuZXZlbnQgPT09IG51bGwpICYmIChldmVudCkpIHtcbiAgICAgICAgICAgIGQzLmV2ZW50ID0gZXZlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGQzbW91c2UgPSBkMy5tb3VzZShjb250YWluZXJFbGVtKTtcbiAgICAgICAgZDMuZXZlbnQgPSBudWxsO1xuXG4gICAgICAgIHZhciB4b2Zmc2V0ID0gMDtcbiAgICAgICAgaWYgKGNvbmYucG9zaXRpb24gPT09IFwibGVmdFwiKSB7XG4gICAgICAgICAgICB4b2Zmc2V0ID0gY29uZi53aWR0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRvb2x0aXBfZGl2LmF0dHIoXCJpZFwiLCBcInRudF90b29sdGlwX1wiICsgY29uZi5pZCk7XG5cbiAgICAgICAgLy8gV2UgcGxhY2UgdGhlIHRvb2x0aXBcbiAgICAgICAgdG9vbHRpcF9kaXZcbiAgICAgICAgICAgIC5zdHlsZShcImxlZnRcIiwgKGQzbW91c2VbMF0gLSB4b2Zmc2V0KSArIFwicHhcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRvcFwiLCAoZDNtb3VzZVsxXSkgKyBcInB4XCIpO1xuXG4gICAgICAgIC8vIENsb3NlXG4gICAgICAgIGlmIChjb25mLnNob3dfY2xvc2VyKSB7XG4gICAgICAgICAgICB0b29sdGlwX2RpdlxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3Rvb2x0aXBfY2xvc2VyXCIpXG4gICAgICAgICAgICAgICAgLm9uIChcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZi5maWxsLmNhbGwodG9vbHRpcF9kaXYubm9kZSgpLCBkYXRhKTtcblxuICAgICAgICAvLyByZXR1cm4gdGhpcyBoZXJlP1xuICAgICAgICByZXR1cm4gdDtcbiAgICB9O1xuXG4gICAgLy8gZ2V0cyB0aGUgZmlyc3QgYW5jZXN0b3Igb2YgZWxlbSBoYXZpbmcgdGFnbmFtZSBcInR5cGVcIlxuICAgIC8vIGV4YW1wbGUgOiB2YXIgbXlkaXYgPSBzZWxlY3RBbmNlc3RvcihteWVsZW0sIFwiZGl2XCIpO1xuICAgIGZ1bmN0aW9uIHNlbGVjdEFuY2VzdG9yIChlbGVtLCB0eXBlKSB7XG4gICAgICAgIHR5cGUgPSB0eXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChlbGVtLnBhcmVudE5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTm8gbW9yZSBwYXJlbnRzXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGFnTmFtZSA9IGVsZW0ucGFyZW50Tm9kZS50YWdOYW1lO1xuXG4gICAgICAgIGlmICgodGFnTmFtZSAhPT0gdW5kZWZpbmVkKSAmJiAodGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSB0eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW0ucGFyZW50Tm9kZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxlY3RBbmNlc3RvciAoZWxlbS5wYXJlbnROb2RlLCB0eXBlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBhcGkgPSBhcGlqcyh0KVxuICAgICAgICAuZ2V0c2V0KGNvbmYpO1xuXG4gICAgYXBpLmNoZWNrKCdwb3NpdGlvbicsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuICh2YWwgPT09ICdsZWZ0JykgfHwgKHZhbCA9PT0gJ3JpZ2h0Jyk7XG4gICAgfSwgXCJPbmx5ICdsZWZ0JyBvciAncmlnaHQnIHZhbHVlcyBhcmUgYWxsb3dlZCBmb3IgcG9zaXRpb25cIik7XG5cbiAgICBhcGkubWV0aG9kKCdjbG9zZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRvb2x0aXBfZGl2KSB7XG4gICAgICAgICAgICB0b29sdGlwX2Rpdi5yZW1vdmUoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHQ7XG59O1xuXG50b29sdGlwLmxpc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gbGlzdCB0b29sdGlwIGlzIGJhc2VkIG9uIGdlbmVyYWwgdG9vbHRpcHNcbiAgICB2YXIgdCA9IHRvb2x0aXAoKTtcbiAgICB2YXIgd2lkdGggPSAxODA7XG5cbiAgICB0LmZpbGwgKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIHRvb2x0aXBfZGl2ID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgICB2YXIgb2JqX2luZm9fbGlzdCA9IHRvb2x0aXBfZGl2XG4gICAgICAgICAgICAuYXBwZW5kKFwidGFibGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiYm9yZGVyXCIsIFwic29saWRcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsIHQud2lkdGgoKSArIFwicHhcIik7XG5cbiAgICAgICAgLy8gVG9vbHRpcCBoZWFkZXJcbiAgICAgICAgaWYgKG9iai5oZWFkZXIpIHtcbiAgICAgICAgICAgIG9ial9pbmZvX2xpc3RcbiAgICAgICAgICAgICAgICAuYXBwZW5kKFwidHJcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51X2hlYWRlclwiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJ0aFwiKVxuICAgICAgICAgICAgICAgIC50ZXh0KG9iai5oZWFkZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVG9vbHRpcCByb3dzXG4gICAgICAgIHZhciB0YWJsZV9yb3dzID0gb2JqX2luZm9fbGlzdC5zZWxlY3RBbGwoXCIudG50X3ptZW51X3Jvd1wiKVxuICAgICAgICAgICAgLmRhdGEob2JqLnJvd3MpXG4gICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgLmFwcGVuZChcInRyXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51X3Jvd1wiKTtcblxuICAgICAgICB0YWJsZV9yb3dzXG4gICAgICAgICAgICAuYXBwZW5kKFwidGRcIilcbiAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIiwgXCJjZW50ZXJcIilcbiAgICAgICAgICAgIC5odG1sKGZ1bmN0aW9uKGQsaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmoucm93c1tpXS52YWx1ZTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICAgICAgICAgIGlmIChkLmxpbmsgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcImxpbmtcIiwgMSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkLmxpbmsoZC5vYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgdC5jbG9zZS5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiB0O1xufTtcblxudG9vbHRpcC50YWJsZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyB0YWJsZSB0b29sdGlwcyBhcmUgYmFzZWQgb24gZ2VuZXJhbCB0b29sdGlwc1xuICAgIHZhciB0ID0gdG9vbHRpcCgpO1xuXG4gICAgdmFyIHdpZHRoID0gMTgwO1xuXG4gICAgdC5maWxsIChmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHZhciB0b29sdGlwX2RpdiA9IGQzLnNlbGVjdCh0aGlzKTtcblxuICAgICAgICB2YXIgb2JqX2luZm9fdGFibGUgPSB0b29sdGlwX2RpdlxuICAgICAgICAgICAgLmFwcGVuZChcInRhYmxlXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51XCIpXG4gICAgICAgICAgICAuYXR0cihcImJvcmRlclwiLCBcInNvbGlkXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLCB0LndpZHRoKCkgKyBcInB4XCIpO1xuXG4gICAgICAgIC8vIFRvb2x0aXAgaGVhZGVyXG4gICAgICAgIGlmIChvYmouaGVhZGVyKSB7XG4gICAgICAgICAgICBvYmpfaW5mb190YWJsZVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJ0clwiKVxuICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVfaGVhZGVyXCIpXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcInRoXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJjb2xzcGFuXCIsIDIpXG4gICAgICAgICAgICAgICAgLnRleHQob2JqLmhlYWRlcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUb29sdGlwIHJvd3NcbiAgICAgICAgdmFyIHRhYmxlX3Jvd3MgPSBvYmpfaW5mb190YWJsZS5zZWxlY3RBbGwoXCIudG50X3ptZW51X3Jvd1wiKVxuICAgICAgICAgICAgLmRhdGEob2JqLnJvd3MpXG4gICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgLmFwcGVuZChcInRyXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51X3Jvd1wiKTtcblxuICAgICAgICB0YWJsZV9yb3dzXG4gICAgICAgICAgICAuYXBwZW5kKFwidGhcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY29sc3BhblwiLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgICAgIGlmIChkLnZhbHVlID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGQudmFsdWUgPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidG50X3ptZW51X2lubmVyX2hlYWRlclwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0bnRfem1lbnVfY2VsbFwiO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5odG1sKGZ1bmN0aW9uKGQsaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmoucm93c1tpXS5sYWJlbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIHRhYmxlX3Jvd3NcbiAgICAgICAgICAgIC5hcHBlbmQoXCJ0ZFwiKVxuICAgICAgICAgICAgLmh0bWwoZnVuY3Rpb24oZCxpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmoucm93c1tpXS52YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBvYmoucm93c1tpXS52YWx1ZS5jYWxsKHRoaXMsIGQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmoucm93c1tpXS52YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZC52YWx1ZSA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3QodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGQubGluayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJsaW5rXCIsIDEpXG4gICAgICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uIChkKSB7XG4gICAgICAgICAgICAgICAgICAgIGQubGluayhkLm9iaik7XG4gICAgICAgICAgICAgICAgICAgIHQuY2xvc2UuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHQ7XG59O1xuXG50b29sdGlwLnBsYWluID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIHBsYWluIHRvb2x0aXBzIGFyZSBiYXNlZCBvbiBnZW5lcmFsIHRvb2x0aXBzXG4gICAgdmFyIHQgPSB0b29sdGlwKCk7XG5cbiAgICB0LmZpbGwgKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdmFyIHRvb2x0aXBfZGl2ID0gZDMuc2VsZWN0KHRoaXMpO1xuXG4gICAgICAgIHZhciBvYmpfaW5mb190YWJsZSA9IHRvb2x0aXBfZGl2XG4gICAgICAgICAgICAuYXBwZW5kKFwidGFibGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ0bnRfem1lbnVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiYm9yZGVyXCIsIFwic29saWRcIilcbiAgICAgICAgICAgIC5zdHlsZShcIndpZHRoXCIsIHQud2lkdGgoKSArIFwicHhcIik7XG5cbiAgICAgICAgaWYgKG9iai5oZWFkZXIpIHtcbiAgICAgICAgICAgIG9ial9pbmZvX3RhYmxlXG4gICAgICAgICAgICAgICAgLmFwcGVuZChcInRyXCIpXG4gICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInRudF96bWVudV9oZWFkZXJcIilcbiAgICAgICAgICAgICAgICAuYXBwZW5kKFwidGhcIilcbiAgICAgICAgICAgICAgICAudGV4dChvYmouaGVhZGVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvYmouYm9keSkge1xuICAgICAgICAgICAgb2JqX2luZm9fdGFibGVcbiAgICAgICAgICAgICAgICAuYXBwZW5kKFwidHJcIilcbiAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwidG50X3ptZW51X3Jvd1wiKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJ0ZFwiKVxuICAgICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYWxpZ25cIiwgXCJjZW50ZXJcIilcbiAgICAgICAgICAgICAgICAuaHRtbChvYmouYm9keSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gdG9vbHRpcDtcbiIsIi8vIHZhciBjdHR2QXBpID0gcmVxdWlyZSgnY3R0di5hcGknKTtcbnZhciB0bnRUb29sdGlwID0gcmVxdWlyZSgndG50LnRvb2x0aXAnKTtcbi8vIHZhciBkMyA9IHJlcXVpcmUoJ2QzJyk7XG4vLyB2YXIgZmxvd2VyVmlldyA9IHJlcXVpcmUoXCJjdHR2LmZsb3dlclZpZXdcIik7XG4vL2FkZCBuZWNlc3NhcnkgY3NzIGZyb20ganMgc28gdGhhdCB0aGUgdXNlciBkb2VzbiBoYXZlIHRvIGV4cGxpY2l0ZWx5IGluY2x1ZGUgaXRcbi8vaWYgaGUgaW5jbHVkZXMgaXQgY3NzIGlzIG5vdCBpbXBvcnRlZCBcbnZhciBjc3NJZCA9ICdteUNzcyc7IFxuaWYgKCFkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjc3NJZCkpXG57XG4gICAgdmFyIGhlYWQgID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTtcbiAgICB2YXIgbGluayAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG4gICAgbGluay5pZCAgID0gY3NzSWQ7XG4gICAgbGluay5yZWwgID0gJ3N0eWxlc2hlZXQnO1xuICAgIGxpbmsudHlwZSA9ICd0ZXh0L2Nzcyc7XG4gICAgbGluay5ocmVmID0gXCIuLi9idWlsZC92aXpfZGlzZWFzZXMuY3NzXCI7XG4gICAgbGluay5tZWRpYSA9ICdhbGwnO1xuICAgIGhlYWQuYXBwZW5kQ2hpbGQobGluayk7XG59XG5cblxuXG52YXIgdmlzID0gZnVuY3Rpb24oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgICAgYWxsQ29sb3JzRXhwOltdLFxuICAgICAgICAvLyBhbGxDb2xvcnNFeHA6W10sXG4gICAgICAgIGZvbnRTaXplOlwiMTBweFwiLFxuICAgICAgICBwb2ludFNpemU6My41LFxuICAgICAgICBwb2ludENvbG9yOlwibmF2eVwiLFxuICAgICAgICBzaXplOiA3MDAsXG4gICAgICAgIGZpbHRlcjogbnVsbCxcbiAgICAgICAgZGF0YTogW1xuXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJkaXJlY3Rpb25cIjogbnVsbCxcbiAgICAgICAgICAgICAgICBcIm9iamVjdFwiOiBcImRpc2Vhc2UxXCIsXG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiZGlzZWFzZXMxXCIsXG4gICAgICAgICAgICAgICAgXCJ2YWx1ZVwiOiAwLjcxMzkxMzgxMjYzODkwNjUsXG4gICAgICAgICAgICAgICAgXCJzdWJqZWN0XCI6IFwiRUZPXzAwMDQ1OTFcIlxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIFwiZGlyZWN0aW9uXCI6IG51bGwsXG4gICAgICAgICAgICAgICAgXCJvYmplY3RcIjogXCJkaXNlYXNlMVwiLFxuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImRpc2Vhc2VzMlwiLFxuICAgICAgICAgICAgICAgIFwidmFsdWVcIjogMC43MTM5MTM4MTI2Mzg5MDY1LFxuICAgICAgICAgICAgICAgIFwic3ViamVjdFwiOiBcIkVGT18wMDA0NTkxXCJcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICBcImRpcmVjdGlvblwiOiBudWxsLFxuICAgICAgICAgICAgICAgIFwib2JqZWN0XCI6IFwiZGlzZWFzZTFcIixcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJkaXNlYXNlczNcIixcbiAgICAgICAgICAgICAgICBcInZhbHVlXCI6IDAuNzEzOTEzODEyNjM4OTA2NSxcbiAgICAgICAgICAgICAgICBcInN1YmplY3RcIjogXCJFRk9fMDAwNDU5MVwiXG4gICAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICB9O1xuICAgIHZhciBncmFwaDtcblxuICAgIHZhciBsYWJlbFNpemUgPSAxMDA7XG4gICAgdmFyIHRyYW5zaXRpb25TcGVlZCA9IDEwMDA7XG4gICAgdmFyIHBvaW50cywgbGFiZWxzLCBsaW5rcztcbiAgICAvLyB2YXIgYXBpID0gY3R0dkFwaSgpXG4gICAgLy8gICAgIC5wcmVmaXgoXCJodHRwOi8vdGVzdC50YXJnZXR2YWxpZGF0aW9uLm9yZzo4ODk5L2FwaS9cIilcbiAgICAvLyAgICAgLmFwcG5hbWUoXCJjdHR2LXdlYi1hcHBcIilcbiAgICAvLyAgICAgLnNlY3JldChcIjJKMjNUMjBPMzFVeWVwUmo3NzU0cEVBMm9zTU9ZZkZLXCIpO1xuICAgIHZhciBkYXRhVHlwZXM7XG4gICAgdmFyIHJlbmRlciA9IGZ1bmN0aW9uKGRpdikge1xuICAgICAgICB2YXIgZ3JhcGhTaXplID0gY29uZmlnLnNpemUgLSAobGFiZWxTaXplICogMik7XG4gICAgICAgIHZhciByYWRpdXMgPSBncmFwaFNpemUgLyAyO1xuXG5cbiAgICAgICAgZDMuc2VsZWN0KGRpdilcbiAgICAgICAgICAgIC5hcHBlbmQoXCJkaXZcIilcbiAgICAgICAgICAgIC5hdHRyKFwiaWRcIiwgXCJzZXF1ZW5jZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBjb25maWcuc2l6ZSlcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIDMwKVxuXG4gICAgICAgIHZhciBzdmcgPSBkMy5zZWxlY3QoZGl2KVxuICAgICAgICAgICAgLmFwcGVuZChcInN2Z1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCBjb25maWcuc2l6ZSlcbiAgICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGNvbmZpZy5zaXplKVxuICAgICAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgKHJhZGl1cyArIGxhYmVsU2l6ZSkgKyBcIixcIiArIChyYWRpdXMgKyBsYWJlbFNpemUpICsgXCIpXCIpXG4gICAgICAgICAgICAuYXR0cihcImlkXCIsIFwicGllQ2hhcnRcIilcblxuICAgICAgICB2YXIgY2lyY2xlQ29sb3JTY2FsZSA9IGQzLnNjYWxlLmxpbmVhcigpXG4gICAgICAgICAgICAuZG9tYWluKFswLCAxXSlcbiAgICAgICAgICAgIC5yYW5nZShbZDMucmdiKDAsIDgyLCAxNjMpLCBkMy5yZ2IoMTgyLCAyMjEsIDI1MildKTtcblxuICAgICAgICAvLyBkMy5qc29uKFwiLi4vZGF0YS9zYW1wbGUuanNvblwiLCBmdW5jdGlvbihlcnJvciwgcmVzcCkge1xuICAgICAgICAvLyAgICAgdmFyIGRhdGEgPSByZXNwLmRhdGE7XG4gICAgICAgIC8vICAgICByZW5kZXIudXBkYXRlKGRhdGEsIHVwZGF0ZVNjYWxlcyhyYWRpdXMpLCAncGllQ2hhcnQnKTtcbiAgICAgICAgLy8gfSk7XG4gICAgICAgIC8vIGQzLmpzb24oXCIuLi9kYXRhL3NhbXBsZS5qc29uXCIsIGZ1bmN0aW9uKGVycm9yLCByZXNwKSB7XG4gICAgICAgIC8vICAgICB2YXIgZGF0YSA9IHJlc3AuZGF0YTtcbiAgICAgICAgLy8gfSk7XG5cbiAgICAgICAgdmFyIGIgPSB7XG4gICAgICAgICAgICB3OiAxMDAsXG4gICAgICAgICAgICBoOiAzMCxcbiAgICAgICAgICAgIHM6IDMsXG4gICAgICAgICAgICB0OiAxMFxuICAgICAgICB9O1xuXG4gICAgICAgIHJlbmRlci51cGRhdGUgPSBmdW5jdGlvbihkYXRhLCBjaXJjbGVTY2FsZXMsIGdyYXBoaWNNb2RlLCB2aXpUeXBlKSB7XG5cbiAgICAgICAgICAgIGlmIChncmFwaGljTW9kZSA9PSAncGllQ2hhcnQnKSB7XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwiI3NlcXVlbmNlIHN2Z1wiKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoXCJnIHRleHRcIikucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0QWxsKFwibGluZVwiKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoXCJjaXJjbGVcIikucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgdXBkYXRlQnJlYWRjcnVtYnMoW3sgbmFtZTogJ0hvbWUnIH1dKTtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNyZWF0ZUNvbXBhcmF0b3IocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhW3Byb3BlcnR5XSA+IGJbcHJvcGVydHldKSByZXR1cm4gMVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFbcHJvcGVydHldIDwgYltwcm9wZXJ0eV0pIHJldHVybiAtMVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBkYXRhLnNvcnQoY3JlYXRlQ29tcGFyYXRvcigndHlwZScpKVxuXG4gICAgICAgICAgICAgICAgdmFyIHR5cGVzID0ge31cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVzW2RhdGFbaV0udHlwZV0gPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZXNbZGF0YVtpXS50eXBlXSA9IFtdXG4gICAgICAgICAgICAgICAgICAgIHR5cGVzW2RhdGFbaV0udHlwZV0ucHVzaChkYXRhW2ldKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBwb3J0aW9uIG9mIGNpcmNsZSBwZXIgZGF0YSB0eXBlXG4gICAgICAgICAgICAgICAgZGF0YVR5cGVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChpIGluIHR5cGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGFUeXBlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBpLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJwb3B1bGF0aW9uXCI6IHR5cGVzW2ldLmxlbmd0aCAvIGRhdGEubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJjb3VudFwiOiB0eXBlc1tpXS5sZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGF0YVR5cGVzLnNvcnQoZnVuY3Rpb24gY29tcGFyZShhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhLnBvcHVsYXRpb24gPiBiLnBvcHVsYXRpb24pIHJldHVybiAtMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGEucG9wdWxhdGlvbiA8IGIucG9wdWxhdGlvbikgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAvL0NyZWF0ZSBjb2xvcnMgbWFwcGluZyB0byBkYXRhIFR5cGVzXG4gICAgICAgICAgICAgICAgdmFyIGNvbG9yc0V4cHIgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgMTA7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb2xvcnNFeHByLnB1c2goW2QzLnNjYWxlLmNhdGVnb3J5MjAoKS5yYW5nZSgpW2kgKiAyXSwgZDMuc2NhbGUuY2F0ZWdvcnkyMCgpLnJhbmdlKClbaSAqIDIgKyAxXV0pXG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBzaGFkZUNvbG9yMihjb2xvciwgcGVyY2VudCkgeyAgIFxuICAgICAgICAgICAgICAgICAgICB2YXIgZj1wYXJzZUludChjb2xvci5zbGljZSgxKSwxNiksdD1wZXJjZW50PDA/MDoyNTUscD1wZXJjZW50PDA/cGVyY2VudCotMTpwZXJjZW50LFI9Zj4+MTYsRz1mPj44JjB4MDBGRixCPWYmMHgwMDAwRkY7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIiNcIisoMHgxMDAwMDAwKyhNYXRoLnJvdW5kKCh0LVIpKnApK1IpKjB4MTAwMDArKE1hdGgucm91bmQoKHQtRykqcCkrRykqMHgxMDArKE1hdGgucm91bmQoKHQtQikqcCkrQikpLnRvU3RyaW5nKDE2KS5zbGljZSgxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gY29uZmlnLmFsbENvbG9yc0V4cDtcbiAgICAgICAgICAgICAgICB2YXIgYWxsQ29sb3JzRXhwID0ge307XG4gICAgICAgICAgICAgICAgaWYoY29uZmlnLmFsbENvbG9yc0V4cC5sZW5ndGghPTApe1xuICAgICAgICAgICAgICAgICAgICBmb3IoaT0wOyBpPGNvbmZpZy5hbGxDb2xvcnNFeHAubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxsQ29sb3JzRXhwW2RhdGFUeXBlc1tpXS50eXBlXSA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy5hbGxDb2xvcnNFeHBbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzaGFkZUNvbG9yMihjb25maWcuYWxsQ29sb3JzRXhwW2ldLCAwLjgpXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkMy5zY2FsZS5jYXRlZ29yeTIwKCkucmFuZ2UoKVtpICUgMTAgKiAyICsgMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkMy5zY2FsZS5jYXRlZ29yeTIwKCkucmFuZ2UoKVtpICUgMTAgKiAyXVxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChpID0gY29uZmlnLmFsbENvbG9yc0V4cC5sZW5ndGg7IGkgPCBkYXRhVHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgYWxsQ29sb3JzRXhwW2RhdGFUeXBlc1tpXS50eXBlXSA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIGQzLnNjYWxlLmNhdGVnb3J5MjAoKS5yYW5nZSgpW2kgJSAxMCAqIDJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgZDMuc2NhbGUuY2F0ZWdvcnkyMCgpLnJhbmdlKClbaSAlIDEwICogMiArIDFdXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkMy5zY2FsZS5jYXRlZ29yeTIwKCkucmFuZ2UoKVtpICUgMTAgKiAyICsgMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkMy5zY2FsZS5jYXRlZ29yeTIwKCkucmFuZ2UoKVtpICUgMTAgKiAyXVxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gY2lyY2xlQ29sb3JTY2FsZUV4cCh0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5zY2FsZS5saW5lYXIoKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmRvbWFpbihbMCwgMV0pXG4gICAgICAgICAgICAgICAgICAgICAgICAucmFuZ2UoYWxsQ29sb3JzRXhwW3R5cGVdKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBnaXZlQXJjQ29sb3IodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5kb21haW4oWzAsIDEwNV0pXG4gICAgICAgICAgICAgICAgICAgICAgICAucmFuZ2UoW2FsbENvbG9yc0V4cFt0eXBlXVswXSwgYWxsQ29sb3JzRXhwW3R5cGVdWzFdXSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgYXJjcyBlcXVpdmFsZW50IG9mIHJpbmdzXG4gICAgICAgICAgICAgICAgdmFyIGFyY3MgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDE7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJjID0gZDMuc3ZnLmFyYygpXG4gICAgICAgICAgICAgICAgICAgICAgICAub3V0ZXJSYWRpdXMocmFkaXVzIC0gKGkgKiByYWRpdXMpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmlubmVyUmFkaXVzKHJhZGl1cyAtIChpICogcmFkaXVzKSAtIHJhZGl1cyk7XG5cbiAgICAgICAgICAgICAgICAgICAgYXJjcy5wdXNoKGFyYyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGxhYmVsQXJjID0gZDMuc3ZnLmFyYygpXG4gICAgICAgICAgICAgICAgICAgIC5vdXRlclJhZGl1cyhyYWRpdXMgLSA0MClcbiAgICAgICAgICAgICAgICAgICAgLmlubmVyUmFkaXVzKHJhZGl1cyAtIDQwKTtcblxuICAgICAgICAgICAgICAgIHZhciBwaWUgPSBkMy5sYXlvdXQucGllKClcbiAgICAgICAgICAgICAgICAgICAgLnNvcnQobnVsbClcbiAgICAgICAgICAgICAgICAgICAgLnZhbHVlKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLnBvcHVsYXRpb247XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdmFyIGFyYyA9IGQzLnN2Zy5hcmMoKVxuICAgICAgICAgICAgICAgICAgICAub3V0ZXJSYWRpdXMocmFkaXVzKVxuICAgICAgICAgICAgICAgICAgICAuaW5uZXJSYWRpdXMoMClcblxuICAgICAgICAgICAgICAgIHZhciBwYXRoID0gc3ZnXG4gICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCJwYXRoXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKHBpZShkYXRhVHlwZXMpKVxuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKS5hcHBlbmQoXCJwYXRoXCIpXG4gICAgICAgICAgICAgICAgICAgIC8vR2l2ZSBjb2xvciBiYXNlZCBvbiBkYXRhdHlwZVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFsbENvbG9yc0V4cFtkLmRhdGEudHlwZV1bMF07XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBhcmMpXG4gICAgICAgICAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKGQpIHsgdGhpcy5fY3VycmVudCA9IGQ7IH0pIC8vIHN0b3JlIHRoZSBpbml0aWFsIHZhbHVlc1xuICAgICAgICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoXCIjcGllQ2hhcnQgdGV4dFwiKS5zdHlsZSgnb3BhY2l0eScsIDApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcERhdGFUeXBlcyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGF0YVR5cGVzKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHRlbXBEYXRhVHlwZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGVtcERhdGFUeXBlc1tpXS50eXBlID09IGQuZGF0YS50eXBlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wRGF0YVR5cGVzW2ldLnBvcHVsYXRpb24gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wRGF0YVR5cGVzW2ldLnBvcHVsYXRpb24gPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aCA9IHBhdGguZGF0YShwaWUodGVtcERhdGFUeXBlcykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFsbENvbG9yc0V4cFsoZC5kYXRhLnR5cGUpXVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aC50cmFuc2l0aW9uKCkuZHVyYXRpb24oNTAwKS5hdHRyVHdlZW4oXCJkXCIsIGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaSA9IGQzLmludGVycG9sYXRlKHRoaXMuX2N1cnJlbnQsIGEpIC8vLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBrID0gZDMuaW50ZXJwb2xhdGUoYXJjLm91dGVyUmFkaXVzKCkoKSwgbmV3UmFkaXVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jdXJyZW50ID0gaSgwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJjKGkodCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZXR1cm4gYXJjLmlubmVyUmFkaXVzKGsodCkgLyA0KS5vdXRlclJhZGl1cyhrKHQpKShpKHQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlbERhdGFUeXBlID0gZC5kYXRhLnR5cGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZUJyZWFkY3J1bWJzKFt7IG5hbWU6ICdIb21lJywgZGVwdGg6IDAgfSwgeyBuYW1lOiBzZWxEYXRhVHlwZSwgZGVwdGg6IDEgfV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGQzLnNlbGVjdEFsbChcImcgcGF0aFwiKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8vLy8vLy8vL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBncmFwaCA9IGQzLnNlbGVjdChcIiNwaWVDaGFydFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8vLy8vLy8vLy8vLy9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJpbmdzID0gZ3JhcGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zZWxlY3RBbGwoXCIucmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmRhdGEoY2lyY2xlU2NhbGVzKTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJpbmdzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcInBhdGhcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vLy8vLy8vL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vLy8vXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwicmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2lyY2xlQ29sb3JTY2FsZUV4cChzZWxEYXRhVHlwZSkoZC5kb21haW4oKVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJkXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJjID0gZDMuc3ZnLmFyYygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5pbm5lclJhZGl1cyhkLnJhbmdlKClbMF0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5vdXRlclJhZGl1cyhkLnJhbmdlKClbMV0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zdGFydEFuZ2xlKDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5lbmRBbmdsZSgyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyYyhkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXR0cihcImlkXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJyaW5nXCIgKyBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJpbmdzLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmRlbGF5KGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaSAqIDUwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5kdXJhdGlvbigxMDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAxKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByaW5nc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9uZSByaW5nIGhhcyBiZWVuIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGVjdGVkID0gZDMuc2VsZWN0KHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZC5jbGFzc2VkKFwiem9vbWVkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLmNsYXNzZWQoXCJ6b29tZWRcIiwgZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlci51cGRhdGUoZGF0YSwgdXBkYXRlU2NhbGVzKHJhZGl1cyksICdyaW5ncycsIHNlbERhdGFUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZC5jbGFzc2VkKFwiem9vbWVkXCIsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlci51cGRhdGUoZGF0YSwgdXBkYXRlU2NhbGVzKHJhZGl1cywgZCksICdyaW5ncycsIHNlbERhdGFUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmF3RGF0YShzZWxEYXRhVHlwZSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL29uIGJhY2tncm91bmQgY2hhbmdlIGJyaW5nIHBvaW50cyB0byBmb3JlZ3JvdW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGQzLnNlbGVjdGlvbi5wcm90b3R5cGUubW92ZVRvRnJvbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wYXJlbnROb2RlLmFwcGVuZENoaWxkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGQzLnNlbGVjdEFsbCgnY2lyY2xlJykubW92ZVRvRnJvbnQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoJ2xpbmUnKS5tb3ZlVG9Gcm9udCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgNjAwKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBwYXRoLmVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICBzdmcuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwiI2ZmZlwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwibWFyZ2luXCIsIFwiM3B4XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkZWJ1Z2dlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ3JhZGVzID0gKChkLnN0YXJ0QW5nbGUgKyBkLmVuZEFuZ2xlKSAvIDIpICogMTgwIC8gTWF0aC5QSTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ3JhZGVzID4gMCAmJiBncmFkZXMgPCAxODApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHggPSAoLTIwMCArIGdyYXBoU2l6ZSkgLyAyICogTWF0aC5jb3MoKChkLnN0YXJ0QW5nbGUgKyBkLmVuZEFuZ2xlKSAvIDIpIC0gTWF0aC5QSSAvIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgeSA9ICgtMjAwICsgZ3JhcGhTaXplKSAvIDIgKiBNYXRoLnNpbigoKGQuc3RhcnRBbmdsZSArIGQuZW5kQW5nbGUpIC8gMikgLSBNYXRoLlBJIC8gMik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIHggKyBcIixcIiArIHkgKyBcIikgcm90YXRlKFwiICsgKGdyYWRlcyAtIDkwKSArIFwiKVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB4ID0gKC0yNSArIGdyYXBoU2l6ZSkgLyAyICogTWF0aC5jb3MoKChkLnN0YXJ0QW5nbGUgKyBkLmVuZEFuZ2xlKSAvIDIpIC0gTWF0aC5QSSAvIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgeSA9ICgtMjUgKyBncmFwaFNpemUpIC8gMiAqIE1hdGguc2luKCgoZC5zdGFydEFuZ2xlICsgZC5lbmRBbmdsZSkgLyAyKSAtIE1hdGguUEkgLyAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgeCArIFwiLFwiICsgeSArIFwiKSByb3RhdGUoXCIgKyAoZ3JhZGVzIC0gOTAgKyAxODApICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIC5zdHlsZShcImZvbnQtc2l6ZVwiLCBcIjEycHhcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLCBjb25maWcuZm9udFNpemUpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLmRhdGEudHlwZSArIFwiIFwiICsgZC5kYXRhLmNvdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHR5cGUoZCkge1xuICAgICAgICAgICAgICAgICAgICBkLnBvcHVsYXRpb24gPSArZC5wb3B1bGF0aW9uO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZ3JhcGhpY01vZGUgPT0gJ3JpbmdzJykge1xuXG4gICAgICAgICAgICAgICAgdmFyIHJpbmdzID0gZ3JhcGhcbiAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcIi5yaW5nXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKGNpcmNsZVNjYWxlcyk7XG5cbiAgICAgICAgICAgICAgICByaW5nc1xuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwicGF0aFwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwicmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImZpbGxcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNpcmNsZUNvbG9yU2NhbGUoZC5kb21haW4oKVswXSk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJjID0gZDMuc3ZnLmFyYygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmlubmVyUmFkaXVzKGQucmFuZ2UoKVswXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAub3V0ZXJSYWRpdXMoZC5yYW5nZSgpWzFdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zdGFydEFuZ2xlKDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmVuZEFuZ2xlKDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmMoZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiaWRcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwicmluZ1wiICsgaTtcbiAgICAgICAgICAgICAgICAgICAgfSlcblxuXG4gICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmUgcmluZyBoYXMgYmVlbiBzZWxlY3RlZFxuICAgICAgICAgICAgICAgICAgICB2YXIgc2VsZWN0ZWQgPSBkMy5zZWxlY3QodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZC5jbGFzc2VkKFwiem9vbWVkXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZC5jbGFzc2VkKFwiem9vbWVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlci51cGRhdGUoZGF0YSwgdXBkYXRlU2NhbGVzKHJhZGl1cykpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQuY2xhc3NlZChcInpvb21lZFwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlci51cGRhdGUoZGF0YSwgdXBkYXRlU2NhbGVzKHJhZGl1cywgZCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICByaW5nc1xuICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAgICAgICAgIC5kdXJhdGlvbih0cmFuc2l0aW9uU3BlZWQpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBmdW5jdGlvbihkLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJjID0gZDMuc3ZnLmFyYygpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmlubmVyUmFkaXVzKGNpcmNsZVNjYWxlc1tpXS5yYW5nZSgpWzBdICsgMC4xKSAvLyBIYXZlIHRvIGFkZCAwLjEgb3RoZXJ3aXNlIGl0IGRvZXNuJ3QgdHJhbnNpdGlvbiBjb3JyZWN0bHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAub3V0ZXJSYWRpdXMoY2lyY2xlU2NhbGVzW2ldLnJhbmdlKClbMV0gKyAwLjEpIC8vIEhhdmUgdG8gYWRkIDAuMSBvdGhlcndpc2UgaXQgZG9lc24ndCB0cmFuc2l0aW9uIGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zdGFydEFuZ2xlKDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmVuZEFuZ2xlKDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmMoZCwgaSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdmFyIGRpc3BsRGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoaSBpbiBkYXRhKVxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtpXS50eXBlID09IHZpelR5cGUpXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNwbERhdGEucHVzaChkYXRhW2ldKVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBjb29yZHMgZm9yIGVhY2ggZGF0YSBwb2ludFxuICAgICAgICAgICAgICAgIHZhciBzdGVwUmFkID0gMiAqIE1hdGguUEkgKiAzNjAgLyBkaXNwbERhdGEubGVuZ3RoOyAvLyBncmFkZXNcbiAgICAgICAgICAgICAgICB2YXIgY3VyckFuZ2xlID0gMDtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGlzcGxEYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwID0gZGlzcGxEYXRhW2ldO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSBjaXJjbGVTY2FsZXNbfn4oKDEgLSBwLnZhbHVlKSAvIDAuMildO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29vcmRzID0gcG9pbnQoc2NhbGUoMSAtIHAudmFsdWUpLCBjdXJyQW5nbGUpO1xuICAgICAgICAgICAgICAgICAgICBwLnggPSBjb29yZHNbMF07XG4gICAgICAgICAgICAgICAgICAgIHAueSA9IGNvb3Jkc1sxXTtcbiAgICAgICAgICAgICAgICAgICAgcC5hbmdsZSA9IGN1cnJBbmdsZTtcbiAgICAgICAgICAgICAgICAgICAgY3VyckFuZ2xlICs9ICgyICogTWF0aC5QSSAvIGRpc3BsRGF0YS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIExpbmtzXG4gICAgICAgICAgICAgICAgbGlua3MgPSBncmFwaC5zZWxlY3RBbGwoXCIub3BlblRhcmdldHNfZC1kX292ZXJ2aWV3X2xpbmtcIilcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEoZGlzcGxEYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5vYmplY3QgKyBcIi1cIiArIGQuc3ViamVjdDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbGlua3NcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImxpbmVcIilcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIFwibmF2eVwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwib3BlblRhcmdldHNfZC1kX292ZXJ2aWV3X2xpbmsgdW5zZWxlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBsaW5rc1xuICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAgICAgICAgIC5kdXJhdGlvbih0cmFuc2l0aW9uU3BlZWQpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieDFcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQueDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC55O1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByYWRpdXMgKiBNYXRoLmNvcyhkLmFuZ2xlKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmFkaXVzICogTWF0aC5zaW4oZC5hbmdsZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTm9kZXNcbiAgICAgICAgICAgICAgICBwb2ludHMgPSBncmFwaC5zZWxlY3RBbGwoXCIub3BlblRhcmdldHNfZC1kX292ZXJ2aWV3X25vZGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEoZGlzcGxEYXRhLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5vYmplY3QgKyBcIi1cIiArIGQuc3ViamVjdDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcG9pbnRzXG4gICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJjaXJjbGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19ub2RlIHNlbGVjdGVkXCIpXG4gICAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNlb3V0XCIsIHVuc2VsZWN0KVxuICAgICAgICAgICAgICAgICAgICAub24oXCJtb3VzZW92ZXJcIiwgc2VsZWN0KVxuICAgICAgICAgICAgICAgICAgICAub24oXCJjbGlja1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbHRpcFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHBvaW50c1xuICAgICAgICAgICAgICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAgICAgICAgIC5kdXJhdGlvbih0cmFuc2l0aW9uU3BlZWQpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY3hcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQueDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC55O1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInJcIiwgY29uZmlnLnBvaW50U2l6ZSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGNvbmZpZy5wb2ludENvbG9yKTtcblxuICAgICAgICAgICAgICAgIC8vIExhYmVsc1xuICAgICAgICAgICAgICAgIGdyYXBoLnNlbGVjdEFsbChcIi5vcGVuVGFyZ2V0c19kLWRfb3ZlcnZpZXdfbGFiZWxcIikucmVtb3ZlKClcbiAgICAgICAgICAgICAgICBsYWJlbHMgPSBncmFwaC5zZWxlY3RBbGwoXCIub3BlblRhcmdldHNfZC1kX292ZXJ2aWV3X2xhYmVsXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKGRpc3BsRGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQub2JqZWN0ICsgXCItXCIgKyBkLnN1YmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGxhYmVsc1xuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwib3BlblRhcmdldHNfZC1kX292ZXJ2aWV3X2xhYmVsIHNlbGVjdGVkXCIpXG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBTVkcgY29udGFpbmVyLCBhbmQgYXBwbHkgYSB0cmFuc2Zvcm0gc3VjaCB0aGF0IHRoZSBvcmlnaW4gaXMgdGhlXG4gICAgICAgICAgICAgICAgICAgIC8vIGNlbnRlciBvZiB0aGUgY2FudmFzLiBUaGlzIHdheSwgd2UgZG9uJ3QgbmVlZCB0byBwb3NpdGlvbiBhcmNzIGluZGl2aWR1YWxseVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ3JhZGVzID0gZC5hbmdsZSAqIDM2MCAvICgyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgeCA9IGdyYXBoU2l6ZSAvIDIgKiBNYXRoLmNvcyhkLmFuZ2xlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB5ID0gZ3JhcGhTaXplIC8gMiAqIE1hdGguc2luKGQuYW5nbGUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyB4ICsgXCIsXCIgKyB5ICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImZvbnQtc2l6ZVwiLCBjb25maWcuZm9udFNpemUpXG4gICAgICAgICAgICAgICAgICAgIC8vIC5zdHlsZShcImZvbnQtc2l6ZVwiLCBcIjEwcHhcIilcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwidGV4dC1hbmNob3JcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdyYWRlcyA9IGQuYW5nbGUgKiAzNjAgLyAoMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdyYWRlcyAlIDM2MCA+IDkwICYmIGdyYWRlcyAlIDM2MCA8IDI3NSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcImVuZFwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwic3RhcnRcIjtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQub2JqZWN0O1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ3JhZGVzID0gZC5hbmdsZSAqIDM2MCAvICgyICogTWF0aC5QSSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ3JhZGVzICUgMzYwID4gOTAgJiYgZ3JhZGVzICUgMzYwIDwgMjc1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwicm90YXRlKFwiICsgKChncmFkZXMgJSAzNjApICsgMTgwKSArIFwiKVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwicm90YXRlKFwiICsgKGdyYWRlcyAlIDM2MCkgKyBcIilcIjtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsIHNlbGVjdClcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2VvdXRcIiwgdW5zZWxlY3QpXG4gICAgICAgICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsIHRvb2x0aXApO1xuXG4gICAgICAgICAgICAgICAgLy8gZHJhd0RhdGEoXCJkaXNlYXNlczFcIilcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiB1cGRhdGVCcmVhZGNydW1icyhub2RlQXJyYXkpIHtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGJyZWFkY3J1bWJQb2ludHMoZCwgaSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcG9pbnRzID0gW107XG4gICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKFwiMCwwXCIpO1xuICAgICAgICAgICAgICAgICAgICBwb2ludHMucHVzaChiLncgKyBcIiwwXCIpO1xuICAgICAgICAgICAgICAgICAgICBwb2ludHMucHVzaChiLncgKyBiLnQgKyBcIixcIiArIChiLmggLyAyKSk7XG4gICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKGIudyArIFwiLFwiICsgYi5oKTtcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRzLnB1c2goXCIwLFwiICsgYi5oKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPiAwKSB7IC8vIExlZnRtb3N0IGJyZWFkY3J1bWI7IGRvbid0IGluY2x1ZGUgNnRoIHZlcnRleC5cbiAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKGIudCArIFwiLFwiICsgKGIuaCAvIDIpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcG9pbnRzLmpvaW4oXCIgXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoXCIjdHJhaWxcIikucmVtb3ZlKClcblxuICAgICAgICAgICAgICAgIC8vIEFkZCB0aGUgc3ZnIGFyZWEuXG4gICAgICAgICAgICAgICAgdmFyIHRyYWlsID0gZDMuc2VsZWN0KFwiI3NlcXVlbmNlXCIpLmFwcGVuZChcInN2ZzpzdmdcIilcbiAgICAgICAgICAgICAgICAgICAgLy8gLmF0dHIoXCJ3aWR0aFwiLCAxMjAwKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJ3aWR0aFwiLCBjb25maWcuc2l6ZSlcbiAgICAgICAgICAgICAgICAgICAgLnN0eWxlKFwiaGVpZ2h0XCIsIDMwKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImlkXCIsIFwidHJhaWxcIik7XG5cbiAgICAgICAgICAgICAgICAvLyBEYXRhIGpvaW47IGtleSBmdW5jdGlvbiBjb21iaW5lcyBuYW1lIGFuZCBkZXB0aCAoPSBwb3NpdGlvbiBpbiBzZXF1ZW5jZSkuXG4gICAgICAgICAgICAgICAgdmFyIGcgPSBkMy5zZWxlY3QoXCIjdHJhaWxcIilcbiAgICAgICAgICAgICAgICAgICAgLnNlbGVjdEFsbChcImdcIilcbiAgICAgICAgICAgICAgICAgICAgLmRhdGEobm9kZUFycmF5LCBmdW5jdGlvbihkKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLm5hbWUgKyBkLmRlcHRoO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBicmVhZGNydW1iIGFuZCBsYWJlbCBmb3IgZW50ZXJpbmcgbm9kZXMuXG4gICAgICAgICAgICAgICAgdmFyIGVudGVyaW5nID0gZy5lbnRlcigpLmFwcGVuZChcInN2ZzpnXCIpO1xuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gcmVuZGVySW5pdGlhbFN0YXRlKCkge1xuICAgICAgICAgICAgICAgICAgICByaW5ncyA9IGQzLnNlbGVjdEFsbChcIiNwaWVDaGFydCAucmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICB2YXIgbGluZXMgPSBkMy5zZWxlY3RBbGwoXCIjcGllQ2hhcnQgbGluZVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFyIGxhYmVscz1kMy5zZWxlY3RBbGwoXCIjcGllQ2hhcnQgdGV4dFwiKVxuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoXCIjcGllQ2hhcnQgdGV4dFwiKS5zdHlsZSgnb3BhY2l0eScsIDApO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2lyY2xlcyA9IGQzLnNlbGVjdEFsbChcIiNwaWVDaGFydCBjaXJjbGVcIilcblxuICAgICAgICAgICAgICAgICAgICByaW5ncy50cmFuc2l0aW9uKClcbiAgICAgICAgICAgICAgICAgICAgICAgIC5kdXJhdGlvbigyMDApXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAwKTtcblxuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoXCIjcGllQ2hhcnQgbGluZVwiKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gZDMuc2VsZWN0QWxsKFwiI3BpZUNoYXJ0IHRleHRcIikucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIGQzLnNlbGVjdEFsbChcIiNwaWVDaGFydCAub3BlblRhcmdldHNfZC1kX292ZXJ2aWV3X2xhYmVsXCIpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoXCIjcGllQ2hhcnQgY2lyY2xlXCIpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGQzLnNlbGVjdEFsbCgnI3NlcXVlbmNlIGcnKS5yZW1vdmUoKVxuXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUJyZWFkY3J1bWJzKFt7IG5hbWU6ICdIb21lJyB9XSk7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoXCIjcGllQ2hhcnQgLnJpbmdcIikucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBwYXRoLmRhdGEocGllKGRhdGFUeXBlcykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJmaWxsXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFsbENvbG9yc0V4cFsoZC5kYXRhLnR5cGUpXVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aC50cmFuc2l0aW9uKCkuZHVyYXRpb24oNTAwKS5hdHRyVHdlZW4oXCJkXCIsIGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaSA9IGQzLmludGVycG9sYXRlKHRoaXMuX2N1cnJlbnQsIGEpIC8vLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBrID0gZDMuaW50ZXJwb2xhdGUoYXJjLm91dGVyUmFkaXVzKCkoKSwgbmV3UmFkaXVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9jdXJyZW50ID0gaSgwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJjKGkodCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZXR1cm4gYXJjLmlubmVyUmFkaXVzKGsodCkgLyA0KS5vdXRlclJhZGl1cyhrKHQpKShpKHQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3RBbGwoXCIjcGllQ2hhcnQgdGV4dFwiKS50cmFuc2l0aW9uKCkuZHVyYXRpb24oNjAwKS5zdHlsZSgnb3BhY2l0eScsIDEpO1xuXG4gICAgICAgICAgICAgICAgICAgIH0sIDUwMClcblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGVudGVyaW5nLmFwcGVuZChcInN2Zzpwb2x5Z29uXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwicG9pbnRzXCIsIGJyZWFkY3J1bWJQb2ludHMpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGQubmFtZSA9PSAnSG9tZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyNEQ0RDREMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFsbENvbG9yc0V4cFtkLm5hbWVdWzFdXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnBhcmVudE5vZGUuY2hpbGROb2Rlc1sxXS5pbm5lckhUTUwgPT0gXCJIb21lXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVySW5pdGlhbFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICBlbnRlcmluZy5hcHBlbmQoXCJzdmc6dGV4dFwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInhcIiwgKGIudyArIGIudCkgLyAyKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInlcIiwgYi5oIC8gMilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJkeVwiLCBcIjAuMzVlbVwiKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuYW1lO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZC5uYW1lLmxlbmd0aCA+IDExKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSA9IGQubmFtZS5zdWJzdHJpbmcoMCwgMTApICsgJy4uLic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUgPSBkLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJldHVybiBkLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlubmVySFRNTCA9PSBcIkhvbWVcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5kZXJJbml0aWFsU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcG9zaXRpb24gZm9yIGVudGVyaW5nIGFuZCB1cGRhdGluZyBub2Rlcy5cbiAgICAgICAgICAgICAgICBnLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBpICogKGIudyArIGIucykgKyBcIiwgMClcIjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gZHJhd0RhdGEodHlwZSkge1xuICAgICAgICAgICAgICAgIHZhciBkaXNwbERhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgaW4gZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVtpXS50eXBlID09IHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3BsRGF0YS5wdXNoKGRhdGFbaV0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDYWxjdWxhdGUgY29vcmRzIGZvciBlYWNoIGRhdGEgcG9pbnRcbiAgICAgICAgICAgICAgICAvLyB2YXIgc3RlcFJhZCA9IDIgKiBNYXRoLlBJIC8gZGlzcGxEYXRhLmxlbmd0aDsgLy8gZ3JhZGVzXG4gICAgICAgICAgICAgICAgLy8gdmFyIHN0ZXBSYWQgPSAyICogTWF0aC5QSSAqIDM2MCAvIGRpc3BsRGF0YS5sZW5ndGg7IC8vIGdyYWRlc1xuICAgICAgICAgICAgICAgIHZhciBzdGVwUmFkID0gMy41OyAvLyBncmFkZXNcblxuICAgICAgICAgICAgICAgIHZhciBjdXJyQW5nbGUgPSAwO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkaXNwbERhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHAgPSBkaXNwbERhdGFbaV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY2FsZSA9IGNpcmNsZVNjYWxlc1t+figoMSAtIHAudmFsdWUpIC8gMC4yKV07XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb29yZHMgPSBwb2ludChzY2FsZSgxIC0gcC52YWx1ZSksIGN1cnJBbmdsZSk7XG4gICAgICAgICAgICAgICAgICAgIHAueCA9IGNvb3Jkc1swXTtcbiAgICAgICAgICAgICAgICAgICAgcC55ID0gY29vcmRzWzFdO1xuICAgICAgICAgICAgICAgICAgICBwLmFuZ2xlID0gY3VyckFuZ2xlO1xuICAgICAgICAgICAgICAgICAgICBjdXJyQW5nbGUgKz0gKDIgKiBNYXRoLlBJIC8gZGlzcGxEYXRhLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGN1cnJBbmdsZSArPSAoc3RlcFJhZCAqIDIgKiBNYXRoLlBJIC8gMzYwKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBMaW5rc1xuICAgICAgICAgICAgICAgIGxpbmtzID0gZ3JhcGguc2VsZWN0QWxsKFwiLm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19saW5rXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKGRpc3BsRGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQub2JqZWN0ICsgXCItXCIgKyBkLnN1YmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGxpbmtzXG4gICAgICAgICAgICAgICAgICAgIC5lbnRlcigpXG4gICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoXCJsaW5lXCIpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZVwiLCBcIm5hdnlcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19saW5rIHVuc2VsZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbGlua3NcbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24odHJhbnNpdGlvblNwZWVkKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcIngxXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLng7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQueTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ4MlwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmFkaXVzICogTWF0aC5jb3MoZC5hbmdsZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJhZGl1cyAqIE1hdGguc2luKGQuYW5nbGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIE5vZGVzXG4gICAgICAgICAgICAgICAgcG9pbnRzID0gZ3JhcGguc2VsZWN0QWxsKFwiLm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19ub2RlXCIpXG4gICAgICAgICAgICAgICAgICAgIC5kYXRhKGRpc3BsRGF0YSwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQub2JqZWN0ICsgXCItXCIgKyBkLnN1YmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHBvaW50c1xuICAgICAgICAgICAgICAgICAgICAuZW50ZXIoKVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwiY2lyY2xlXCIpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJvcGVuVGFyZ2V0c19kLWRfb3ZlcnZpZXdfbm9kZSBzZWxlY3RlZFwiKVxuICAgICAgICAgICAgICAgICAgICAub24oXCJtb3VzZW91dFwiLCB1bnNlbGVjdClcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwibW91c2VvdmVyXCIsIHNlbGVjdClcbiAgICAgICAgICAgICAgICAgICAgLm9uKFwiY2xpY2tcIiwgdG9vbHRpcCk7XG4gICAgICAgICAgICAgICAgLy8gLm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXsgdG9vbHRpcCh0aGlzLGRhdGFUeXBlcyl9KTtcbiAgICAgICAgICAgICAgICBwb2ludHNcbiAgICAgICAgICAgICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgICAgICAgICAuZHVyYXRpb24odHJhbnNpdGlvblNwZWVkKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cihcImN4XCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLng7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiY3lcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQueTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJyXCIsIGNvbmZpZy5wb2ludFNpemUpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKFwiZmlsbFwiLCBjb25maWcucG9pbnRDb2xvcik7XG5cbiAgICAgICAgICAgICAgICAvLyBMYWJlbHNcbiAgICAgICAgICAgICAgICBncmFwaC5zZWxlY3RBbGwoXCIub3BlblRhcmdldHNfZC1kX292ZXJ2aWV3X2xhYmVsXCIpLnJlbW92ZSgpXG4gICAgICAgICAgICAgICAgbGFiZWxzID0gZ3JhcGguc2VsZWN0QWxsKFwiLm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19sYWJlbFwiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShkaXNwbERhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLm9iamVjdCArIFwiLVwiICsgZC5zdWJqZWN0O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBsYWJlbHNcbiAgICAgICAgICAgICAgICAgICAgLmVudGVyKClcbiAgICAgICAgICAgICAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm9wZW5UYXJnZXRzX2QtZF9vdmVydmlld19sYWJlbCBzZWxlY3RlZFwiKVxuICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgU1ZHIGNvbnRhaW5lciwgYW5kIGFwcGx5IGEgdHJhbnNmb3JtIHN1Y2ggdGhhdCB0aGUgb3JpZ2luIGlzIHRoZVxuICAgICAgICAgICAgICAgICAgICAvLyBjZW50ZXIgb2YgdGhlIGNhbnZhcy4gVGhpcyB3YXksIHdlIGRvbid0IG5lZWQgdG8gcG9zaXRpb24gYXJjcyBpbmRpdmlkdWFsbHlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdyYWRlcyA9IGQuYW5nbGUgKiAzNjAgLyAoMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHggPSBncmFwaFNpemUgLyAyICogTWF0aC5jb3MoZC5hbmdsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgeSA9IGdyYXBoU2l6ZSAvIDIgKiBNYXRoLnNpbihkLmFuZ2xlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgeCArIFwiLFwiICsgeSArIFwiKVwiO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgICAgICAgICAuc3R5bGUoXCJmb250LXNpemVcIiwgY29uZmlnLmZvbnRTaXplKVxuICAgICAgICAgICAgICAgICAgICAvLyAuc3R5bGUoXCJmb250LXNpemVcIiwgXCIxMHB4XCIpXG4gICAgICAgICAgICAgICAgICAgIC5zdHlsZShcInRleHQtYW5jaG9yXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBncmFkZXMgPSBkLmFuZ2xlICogMzYwIC8gKDIgKiBNYXRoLlBJKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChncmFkZXMgJSAzNjAgPiA5MCAmJiBncmFkZXMgJSAzNjAgPCAyNzUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJlbmRcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInN0YXJ0XCI7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLm9iamVjdDtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdyYWRlcyA9IGQuYW5nbGUgKiAzNjAgLyAoMiAqIE1hdGguUEkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdyYWRlcyAlIDM2MCA+IDkwICYmIGdyYWRlcyAlIDM2MCA8IDI3NSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInJvdGF0ZShcIiArICgoZ3JhZGVzICUgMzYwKSArIDE4MCkgKyBcIilcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInJvdGF0ZShcIiArIChncmFkZXMgJSAzNjApICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNlb3ZlclwiLCBzZWxlY3QpXG4gICAgICAgICAgICAgICAgICAgIC5vbihcIm1vdXNlb3V0XCIsIHVuc2VsZWN0KVxuICAgICAgICAgICAgICAgICAgICAub24oXCJjbGlja1wiLCB0b29sdGlwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5kYXRhID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGQzLmpzb24oY29uZmlnLmRhdGEsIGZ1bmN0aW9uKGVycm9yLCByZXNwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwLmRhdGE7XG4gICAgICAgICAgICAgICAgcmVuZGVyLnVwZGF0ZShkYXRhLCB1cGRhdGVTY2FsZXMocmFkaXVzKSwgJ3BpZUNoYXJ0Jyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgcmVuZGVyLnVwZGF0ZShjb25maWcuZGF0YSwgdXBkYXRlU2NhbGVzKHJhZGl1cyksICdwaWVDaGFydCcpO1xuICAgICAgICB9XG5cblxuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVNjYWxlcyhyYWRpdXMsIHNlbGVjdGVkKSB7XG4gICAgICAgIHZhciBjaXJjbGVTY2FsZXMgPSBbXG4gICAgICAgICAgICBkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oWzAuMCwgMC4yXSkucmFuZ2UoWzAsIDEgKiByYWRpdXMgLyA1XSkuY2xhbXAodHJ1ZSksXG4gICAgICAgICAgICBkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oWzAuMiwgMC40XSkucmFuZ2UoWzEgKiByYWRpdXMgLyA1LCAyICogcmFkaXVzIC8gNV0pLmNsYW1wKHRydWUpLFxuICAgICAgICAgICAgZDMuc2NhbGUubGluZWFyKCkuZG9tYWluKFswLjQsIDAuNl0pLnJhbmdlKFsyICogcmFkaXVzIC8gNSwgMyAqIHJhZGl1cyAvIDVdKS5jbGFtcCh0cnVlKSxcbiAgICAgICAgICAgIGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihbMC42LCAwLjhdKS5yYW5nZShbMyAqIHJhZGl1cyAvIDUsIDQgKiByYWRpdXMgLyA1XSkuY2xhbXAodHJ1ZSksXG4gICAgICAgICAgICBkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oWzAuOCwgMS4wXSkucmFuZ2UoWzQgKiByYWRpdXMgLyA1LCA1ICogcmFkaXVzIC8gNV0pLmNsYW1wKHRydWUpLFxuICAgICAgICBdO1xuXG4gICAgICAgIGlmICghc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBjaXJjbGVTY2FsZXM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXZSBhcmUgZm9jdXNpbmcgb24gYSBzY2FsZVxuICAgICAgICB2YXIgbmV3U2NhbGVzID0gW107XG4gICAgICAgIHZhciBjdXJyUmFkID0gMDtcbiAgICAgICAgLy9pZiBpdCdzIHRoZSBzZWxlY3RlZCBzY2FsZSBwdXQgaXQgdG8gdGhlIGxlbmd0aCBvZiByYWRpdXMgZWxzZSBwdXQgaXQgdG8gMCBsZW5ndGhcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaXJjbGVTY2FsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzY2FsZSA9IGNpcmNsZVNjYWxlc1tpXTtcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZC5kb21haW4oKVswXSA9PSBzY2FsZS5kb21haW4oKVswXSkge1xuICAgICAgICAgICAgICAgIHNjYWxlLnJhbmdlKFtjdXJyUmFkLCByYWRpdXNdKTtcbiAgICAgICAgICAgICAgICBjdXJyUmFkID0gcmFkaXVzO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzY2FsZS5yYW5nZShbY3VyclJhZCwgY3VyclJhZF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3U2NhbGVzLnB1c2goc2NhbGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXdTY2FsZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9vbHRpcChkKSB7XG5cbiAgICAgICAgdmFyIG9iaiA9IHt9O1xuICAgICAgICBvYmouaGVhZGVyID0gZC5vYmplY3Q7XG4gICAgICAgIG9iai5yb3dzID0gW107XG4gICAgICAgIG9iai5yb3dzLnB1c2goe1xuICAgICAgICAgICAgbGFiZWw6IFwidHlwZVwiLFxuICAgICAgICAgICAgdmFsdWU6IGQudHlwZVxuICAgICAgICB9KTtcbiAgICAgICAgb2JqLnJvd3MucHVzaCh7XG4gICAgICAgICAgICBsYWJlbDogXCJWYWx1ZTpcIixcbiAgICAgICAgICAgIHZhbHVlOiBTdHJpbmcoZC52YWx1ZSAqIDEwMCkuc2xpY2UoMCwgNSlcbiAgICAgICAgfSk7XG4gICAgICAgIHRudFRvb2x0aXAudGFibGUoKVxuICAgICAgICAgICAgLndpZHRoKDE4MClcbiAgICAgICAgICAgIC5zaG93X2Nsb3Nlcih0cnVlKVxuICAgICAgICAgICAgLmNhbGwodGhpcywgb2JqKTtcbiAgICB9XG5cbiAgICAvLyBwcml2YXRlIG1ldGhvZHNcbiAgICBmdW5jdGlvbiBzZWxlY3QoZCkge1xuICAgICAgICB2YXIgc2VsZWN0Tm9kZSA9IHRoaXM7XG4gICAgICAgIGxpbmtzXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoZWNrTGluayA9IHRoaXM7XG4gICAgICAgICAgICAgICAgaWYgKGQub2JqZWN0ID09PSBsLm9iamVjdCkge1xuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3QoY2hlY2tMaW5rKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ1bnNlbGVjdGVkXCIsIGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3QoY2hlY2tMaW5rKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidW5zZWxlY3RlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgbGFiZWxzXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbihsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoZWNrTGFiZWwgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGlmIChkLm9iamVjdCA9PT0gbC5vYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgZDMuc2VsZWN0KGNoZWNrTGFiZWwpXG4gICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInVuc2VsZWN0ZWRcIiwgZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInNlbGVjdGVkXCIsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGQzLnNlbGVjdChjaGVja0xhYmVsKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidW5zZWxlY3RlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgcG9pbnRzXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoZWNrTm9kZSA9IHRoaXM7XG4gICAgICAgICAgICAgICAgaWYgKHAub2JqZWN0ID09PSBkLm9iamVjdCkge1xuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3QoY2hlY2tOb2RlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ1bnNlbGVjdGVkXCIsIGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkMy5zZWxlY3QoY2hlY2tOb2RlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCBmYWxzZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwidW5zZWxlY3RlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bnNlbGVjdCgpIHtcbiAgICAgICAgbGlua3NcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGQzLnNlbGVjdCh0aGlzKVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInNlbGVjdGVkXCIsIGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInVuc2VsZWN0ZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgbGFiZWxzXG4gICAgICAgICAgICAuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QodGhpcylcbiAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJzZWxlY3RlZFwiLCB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAuY2xhc3NlZChcInVuc2VsZWN0ZWRcIiwgZmFsc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIHBvaW50c1xuICAgICAgICAgICAgLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgZDMuc2VsZWN0KHRoaXMpXG4gICAgICAgICAgICAgICAgICAgIC5jbGFzc2VkKFwic2VsZWN0ZWRcIiwgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgLmNsYXNzZWQoXCJ1bnNlbGVjdGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBvaW50KGwsIHIpIHtcbiAgICAgICAgdmFyIHggPSBsICogTWF0aC5jb3Mocik7XG4gICAgICAgIHZhciB5ID0gbCAqIE1hdGguc2luKHIpO1xuICAgICAgICByZXR1cm4gW3gsIHldO1xuICAgIH1cblxuICAgIC8vIFB1YmxpYyBtZXRob2RzXG5cbiAgICByZW5kZXIucmVhZCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gaWYgKHR5cGVvZiBkYXRhID09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29uZmlnLmRhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgLy8gfVxuICAgIH1cblxuICAgIHJlbmRlci5zaXplID0gZnVuY3Rpb24oc2l6ZSkge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjb25maWcuc2l6ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25maWcuc2l6ZSA9IHNpemU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICByZW5kZXIuc2V0UGllQ29sb3JzID0gZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY29uZmlnLmFsbENvbG9yc0V4cDtcbiAgICAgICAgfVxuICAgICAgICBjb25maWcuYWxsQ29sb3JzRXhwID0gY29sb3I7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICByZW5kZXIuc2V0Rm9udFNpemUgPSBmdW5jdGlvbihzaXplKSB7XG4gICAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZy5mb250U2l6ZTtcbiAgICAgICAgfVxuICAgICAgICBpZih0eXBlb2Ygc2l6ZT09IFwibnVtYmVyXCIpe1xuICAgICAgICAgICAgc2l6ZSA9IFN0cmluZyhzaXplKydweCcpO1xuICAgICAgICB9XG4gICAgICAgIGNvbmZpZy5mb250U2l6ZT1zaXplO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgcmVuZGVyLnNldFBvaW50U2l6ZSA9IGZ1bmN0aW9uKHNpemUpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY29uZmlnLnBvaW50U2l6ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25maWcucG9pbnRTaXplID0gc2l6ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHJlbmRlci5zZXRQb2ludENvbG9yID0gZnVuY3Rpb24oY29sb3IpIHtcbiAgICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY29uZmlnLnBvaW50Q29sb3I7XG4gICAgICAgIH1cbiAgICAgICAgY29uZmlnLnBvaW50Q29sb3IgPSBjb2xvcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIHJlbmRlci5maWx0ZXJfdHlwZSA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgcG9pbnRzXG4gICAgICAgICAgICAuc3R5bGUoXCJkaXNwbGF5XCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiYmxvY2tcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGQudHlwZSAhPT0gdHlwZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBcImJsb2NrXCI7XG4gICAgICAgICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiByZW5kZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSB2aXM7XG4iXX0=
