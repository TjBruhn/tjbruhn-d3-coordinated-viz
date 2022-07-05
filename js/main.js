// javascript by Trever J. Bruhn 2022

//begin script when window loads
window.onload = setMap();

//set up chorpleth map
function setMap() {
  //map frame dimensions
  var width = 960,
    height = 460;

  var map = d3
    .select("body div")
    .append("svg") //operand
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);

  var projection = d3
    .geoAlbers()
    .center([0, 39.5])
    .rotate([98.35, 0, 0])
    .parallels([33, 45])
    .scale(932)
    .translate([width / 2, height / 2]);

  var path = d3
    .geoPath() //path generator
    .projection(projection);

  //use queue to parallelize asynchronous data loading
  var promises = [];
  promises.push(d3.csv("data/stateData.csv")); //load attributes from csv
  promises.push(d3.json("data/usStates.topojson")); //Load spatial data
  Promise.all(promises).then(callback);

  function callback(data) {
    csvData = data[0];
    usSt = data[1];

    //graticule generator
    var graticule = d3.geoGraticule().step([5, 5]); //places lines every 5 deg of lat/lon
    console.log("graticule", graticule.lines());
    //create graticule background
    var gratBackground = map
      .append("path")
      .datum(graticule.outline()) //bind grat background
      .attr("class", "gratBackground")
      .attr("d", path);

    var gratLines = map
      .selectAll(".gratLines")
      .data(graticule.lines())
      .enter()
      .append("path") //append each item as a path element
      .attr("class", "gratLines")
      .attr("d", path);

    //translate us topojson
    var usStates = topojson.feature(usSt, usSt.objects.usStates).features;

    console.log("ustates: ", usStates);

    //add states to the map
    // var states = map
    //   .append("path")
    //   .datum(usStates) //the geojson feature collection as a single datum drawn as a single feature
    //   .attr("class", "states")
    //   .attr("d", path); // d is an attribute of <path> not the variable d that holds data in a data block

    var states = map
      .selectAll(".states")
      .data(usStates)
      .enter()
      .append("path") //operand
      .attr("class", function (d) {
        return "states " + d.properties.postal;
      })
      .attr("d", path);
  }
}
