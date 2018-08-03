function StackedBar() {

  var margin = {top: 0, right: 5, bottom: 20, left: 50},
      width = 400 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

  var duration = 1000;
  var x = d3.scale.ordinal();
  var y = d3.scale.linear();
  var columns;
  var config;

  var x_voronoi = d3.scale.linear();
  var y_voronoi = d3.scale.linear();

  var color = d3.scale.category20();
  var xAxis = d3.svg.axis();
  var yAxis = d3.svg.axis();

  var stack_area = d3.svg.area()
      //  .interpolate("basis")
       .x(function (d) { return x(d.x); })
       .y0(function(d) { return y(d.y0);})
       .y1(function (d) { return y(d.y0+d.y); });

   var line = d3.svg.line()
                   .interpolate("linear")
                   .x(function (d) { return x(d.x) + x.rangeBand()/2.0; })
                   .y(function (d) { return y(d.y); });


  var stack = d3.layout.stack()
        .values(function (d) { return d.values; })
        .x(function (d) { return (d.x); })
        .y(function (d) { return (d.y); });


  var prepare_data = function(data){

    var key_columns = _.filter(columns, function(c){ return c.type === 'object' });
    var key_values = _.intersection(_.map(columns, 'name'),
                                config.query.select );
    var x_values = _.difference(_.map(columns, 'name'),
                                config.query.select.concat(['total']));


    // Returns the key for each row
    var get_key = function(row){
      var values = _.map(key_values, function(c){
        return row[c];
      });
      // console.log(values);
      return _.join(values, "::");
    }

    var display_data = _.filter(data.data, function(item){ return item; });
    display_data = display_data.slice(0, config.number_of_rows);

    //console.log(display_data);

    var tmp = display_data.map(function(row){
          //  console.log(row);
           var name = get_key(row);
           var values = x_values.map(function(key){
               var y_val =  +_.get(row, key, 0);
               if (isNaN(y_val) === true){ y_val = 0;}
               return {'y': y_val,
                       'x': key,
                       'name': name }
           });
           //values = _.sortBy(values, function(o) { return o.x; });
           return {'name': name, 'values': values};
       });

    return tmp;
  }

  var prepare_total = function(data){

      var x_values = _.difference(_.map(columns, 'name'),
                                  config.query.select.concat(['total']));

      var totals = x_values.map(function(col){
          return {'col': col, 'total': 0};
      });

      var totals_map = _.chain(totals)
                    .keyBy('col')
                    .mapValues('total')
                    .value();

      //console.log("totals", JSON.stringify(totals_map));

      data.forEach(function(row){
          row.values.forEach(function(item){
              key = item['x'];
              totals_map[key] =  totals_map[key] + item['y'];
          });
      });

      //console.log("totals", JSON.stringify(totals_map));

       var totals_list = x_values.map(function(key){
           return {'x': key, 'y': totals_map[key]};
       });

       return {'name': 'total', 'values': totals_list };
  }

  var barStack = function(d) {
    var l = d[0].length
      while (l--) {
      	var posBase = 0, negBase = 0;
      	d.forEach(function(d) {
      		d=d[l]
      		d.size = Math.abs(d.y)
      		if (d.y<0)  {
      			d.y0 = negBase
      			negBase-=d.size
      		} else
      		{
      			d.y0 = posBase = posBase + d.size
      		}
      	})
      }
    return d
  };

  function chart(selection) {
      selection.each(function(tmp) {

           //begining of call()
           var data = prepare_data(tmp);
          //  pos_data = _.filter(tmp, function(item))
           var total = prepare_total(data);

           // 1. Flatten the data....
           var flatten = data.map(function(obj){
              return obj.values.map(function(item){
                  item.color = color(obj.name);
                  return item;
              });
           });

           barStack(flatten);
           flatten = _.flatten(flatten)
           var y_flat_values = _.map(flatten, function(item){
              return item.y0-item.size ;
           });
           //console.log(y_flat_values);

           var y_values = _.map(total['values'], 'y');
           var x_values = _.map(total['values'], 'x');

           y.domain(d3.extent(y_flat_values.concat(y_values))).range([height, 0]);
           x.domain(x_values).rangeRoundBands([0, width], .1);

           yAxis.scale(y)
                   .orient("left")
                   .tickFormat(d3.format("s"));

           xAxis.scale(x).orient("bottom");

           d3.select(this).selectAll("svg").remove();

            var svg = d3.select(this).selectAll("svg").data([data]);

            var gEnter = svg.enter().append("svg").append("g");

            svg.attr("width", width + margin.left + margin.right)
               .attr("height", height + margin.top + margin.bottom);

            gEnter.append("defs").append("clipPath")
                  .attr("id", "clip")
                  .append("rect")
                  .attr("width", width)
                  .attr("height", height);

            // Add the groups for axis and main plot
            gEnter.append("g")
                  .attr("class", "axis axis--x")
                  .attr("transform", "translate(0," + height + ")");

            gEnter.append("g")
                  .attr("class", "axis axis--y");

            // This is the
            gEnter.append("g")
                  .attr("class", "bars");

            gEnter.append("g")
                  .attr("class", "total");

            gEnter.append("g")
                  .attr("class", "totalpoints");

            // add the tool tip
            gEnter.append("g")
                  .attr("class", "focus")
                  .style("display", "none");

            // Main group translate everything above...
            var g = svg.select("g")
                       .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // add the axis..
            g.select(".axis--y").call(yAxis);
            g.select(".axis--x").call(xAxis);

            //----------- This is for the tool tip --------------------------
            var focus = g.select(".focus");
            focus.select("foreignObject").remove();
            focus.select("circle").remove();

            focus.append("foreignObject")
                  .attr("width", 200)
                  .attr("height", 100)
                  .attr("x", 10)
                  .attr("y", 0)
                  .append("xhtml:body")
                  .html("");

            focus.append("circle")
                  .style("fill", "none")
                  .style("stroke", "black")
                  .attr("r", 4);


       //==============================================================
       // Enter
       //==============================================================

       // Add bars...
       var bars_enter = g.select(".bars")
             .selectAll("rect")
             .data(flatten);

       bars_enter.enter()
             .append("rect")
             .attr("x", function(d) { return x(d.x); })
             .attr("y",function(d) { return y(d.y0)})
             .attr("height",function(d) { return y(0)-y(d.size)})
             .attr("width", x.rangeBand())
             .style("fill-opacity", 0.7)
             .style("fill", function(d) { return d.color; });

             // Add a total...
             var total_enter = g.select(".total")
                   .selectAll("path")
                   .data([total]);

             total_enter.enter()
                .append('path')
                .attr('d', function (d) { return line(d.values); })
                .attr('fill', 'none')
                .attr('stroke', "grey");

              var total_pts_enter = g.select(".total")
                    .selectAll("path")
                    .data(total.values);

              total_pts_enter.enter()
                 .append('circle')
                 .attr("cx", function (d) { return x(d.x) + x.rangeBand()/2.0;; })
                .attr("cy", function (d) { return y(d.y); })
                .attr("r", 6)
                .style("fill", "none");


       bars_enter.on("mouseover", function(d){

                 var info = d.name.split("::");

                 var txt = "<strong>" + info + "</strong><br>"
                 txt += Math.round(d.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

                 var fo = focus.select("foreignObject")
                 fo.html(txt);

                 if( x(d.x) > width-150){
                     fo.attr("x", -150);
                 }
                 else if( x(d.x) < 150){
                     fo.attr("x", 20);
                 }
                 else{
                     fo.attr("x", 10);
                 }

                 if( y(d.y) > height-50){
                     fo.attr("y", -50);
                 }
                 else{
                     fo.attr("y", 0);
                 }


                  var x_val = x(d.x) + x.rangeBand()/2.0;
                  //console.log(x_val);
                  focus.attr("transform", "translate(" + x_val  + "," + y(d.y0) + ")");
                  //focus.attr("transform", "translate(" + 20 + "," + 20 + ")");
                  focus.style("display", null);
               });



        bars_enter.on("mouseout", function(d){
            focus.style("display", "none");
        });



                  // .attr("d", function(d) { return stack_area(d.values); })
                  // .attr("width", x.rangeBand())
                  // .attr("y", function(d) {
                  //   console.log(x(d.x), y(d.y), y(d.y0));
                  //   return y(d.y); })
                  // .attr("height", function(d) { return y(d.y0) + y(d.y); })
                  // .style("fill", function(d) { return color(d.name); })
                  // .style("stroke", function(d) { return color(d.name); } )
                  // .style("fill-opacity", 0.7)
                  // .style("stroke-opacity", 0.2)
                  // .style("stroke-width", 0.05)
                  // .attr("id", function(d) { return d.name; });

        //           layer.selectAll("rect")
        //    .data(function(d) { return d; })
        //  .enter().append("rect")
        //    .attr("x", function(d) { return x(d.x); })
        //    .attr("y", function(d) { return y(d.y + d.y0); })
        //    .attr("height", function(d) { return y(d.y0) - y(d.y + d.y0); })
        //    .attr("width", x.rangeBand() - 1);


            //==============================================================
            // Update
            //==============================================================
            // bars_enter.transition()
            //           .attr("d", function(d) { return stack_area(d.values); });


            //==============================================================
            // exit
            //==============================================================
            // bars_enter.exit().remove();


      });
  }

  chart.duration = function(_){
    if (!arguments.length) return duration;
    duration = _;
    return chart;
  };

  chart.x = function(_){
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.y = function(_){
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return chart;
  };

  chart.columns = function(_) {
    if (!arguments.length) return columns;
    columns = _;
    return chart;
  };

  chart.config = function(_) {
    if (!arguments.length) return config;
    config = _;
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _ - margin.left - margin.right
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _ - margin.top - margin.bottom;
    return chart;
  };

  return chart;
}
