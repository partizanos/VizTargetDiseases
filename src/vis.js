var cttvApi = require('cttv.api');

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

        d3.json("../data/sample.json", function(error, root) {
            console.log(root[0]
        )})
        // api.call(url)
        //     .then (function (resp) {
        //         console.log(resp.body.data);
        //     });

    };

    function update () {

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
