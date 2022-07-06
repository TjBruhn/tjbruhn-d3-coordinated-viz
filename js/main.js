// javascript by Trever J. Bruhn 2022

//wrap everything in a function to create local scope for all variables and functions
(function () {
  //define psuedo-global variables that will be available to everything within the wrap function

  var attrArray = [
    "residential",
    "commercial",
    "electric_power",
    "industrial",
    "transportation",
    "total",
    "pop_2018",
  ]; //csv attributes to be joined to usStates
  var expressed = attrArray[5]; //initial variable in the array

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

      console.log("csv: ", csvData[47]);
      console.log("usSt: ", usSt.objects.usStates.geometries[0].properties);

      //place graticule on map
      setGraticule(map, path);

      //translate us topojson
      var usStates = topojson.feature(usSt, usSt.objects.usStates).features;

      console.log("new usSt: ", usSt.objects.usStates.geometries[0].properties);

      //could use to add adjacent countries to the map
      // var states = map
      //   .append("path")
      //   .datum(usStates) //the geojson feature collection as a single datum drawn as a single feature
      //   .attr("class", "states")
      //   .attr("d", path); // d is an attribute of <path> not the variable d that holds data in a data block

      //join csvdata to geojson enumeration units
      usStates = joinData(usStates, csvData);

      //create color scale
      var colorScale = makeColorScale(csvData);

      //add enumeration units to the map
      setEnumerationUnits(usStates, map, path, colorScale);
    } //end of callback
  } //end of setmap

  function setGraticule(map, path) {
    var graticule = d3
      .geoGraticule() //graticule generator
      .step([5, 5]); //places lines every 5 deg of lat/lon

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
  } //end setGraticule

  function joinData(usStates, csvData) {
    //loop through csv to join attributes to each state in usStates
    for (var i = 0; i < csvData.length; i++) {
      var csvState = csvData[i]; //current state
      var csvKey = csvState.stateId;

      //loop through the usStates to match the correct state
      for (a = 0; a < usStates.length; a++) {
        var geojsonProps = usStates[a].properties;
        var geojsonKey = geojsonProps.postal;

        //check for match
        if (geojsonKey == csvKey) {
          //assign attributes and values
          geojsonProps["state_name"] = csvState["state_name"]; //assign state_nam attr val seperate to retain as string
          attrArray.forEach(function (attr) {
            var val = parseFloat(csvState[attr]); //get attribute value as float
            geojsonProps[attr] = val; // assign attr value to usStates
          });
        }
      }
    }
    return usStates;
  } //end joinData

  function setEnumerationUnits(usStates, map, path, colorScale) {
    var states = map
      .selectAll(".states")
      .data(usStates)
      .enter()
      .append("path") //operand
      .attr("class", function (d) {
        return "states " + d.properties.postal;
      })
      .attr("d", path)
      .style("fill", function (d) {
        return choropleth(d.properties, colorScale);
      });
  } //end setEnumeration units

  //function to create colorscale generator
  function makeColorScale(data) {
    var colorClasses = ["#D4B9DA", "#C994C7", "#DF65B0", "#DD1C77", "#980043"];

    //create colorscale generator
    var colorScale = d3.scaleThreshold().range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i = 0; i < data.length; i++) {
      //conditional toremove US totals from vals
      if (data[i]["stateId"] != "US") {
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
      }
    }

    //clustering data using ckmeans to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function (d) {
      return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster mins as domain
    colorScale.domain(domainArray);

    return colorScale;
  }

  //function to test for data value and return nuetral color
  function choropleth(props, colorScale) {
    var val = parseFloat(props[expressed]);

    //if val exists assign color otherwise assign grey
    if (typeof val == "number" && !isNaN(val)) {
      return colorScale(val);
    } else {
      return "#CCC";
    }
  }
})(); //close out wrap local-scope function
