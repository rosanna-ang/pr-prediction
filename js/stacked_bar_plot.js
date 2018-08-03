var data;

function plot_area(data){

    var config = {};
    config.query = {};
    config.number_of_rows = 10;
    config.query.select = ['store'];

    // Plots the data as an area chart
    var chart = StackedBar()
                    .width(820)
                    .height(450)
                    .columns(data.columns)
                    .config(config)
                    .margin({top: 30, right: 20, bottom: 20, left: 60})
                    .x(d3.scale.ordinal())
                    .y(d3.scale.linear());

  console.log(data['data']);
  d3.select("#divPR").datum(data).call(chart);

}

d3.json("data/data.json", function(error, d) {
  data = d;
  plot_area(data);
});
