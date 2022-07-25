// javascript by Trever J. Bruhn 2022

//const { data } = require("jquery");

//wrap everything in a function to create local scope for all variables and functions
(function () {
  //define psuedo-global variables that will be available to everything within the wrap function

  var attrArray = [
    "total",
    "residential",
    "commercial",
    "electric_power",
    "industrial",
    "transportation",
    "pop_2018",
  ]; //csv attributes to be joined to usStates

  var expressed = attrArray[0]; //initial variable to display set to start with total

  //variable that notes if population overlay is on
  var popOverlayStatus = "off";

  //create labels for attributes
  var attrLabels = {
    residential: "Residential",
    commercial: "Commercial",
    electric_power: "Electric Power Production",
    industrial: "Industrial",
    transportation: "Transportation",
    total: "All",
    pop_2018: "Overlay Population",
  };
  console.log("attrLabel", attrLabels.pop_2018);

  //chart frame dimensions
  var chartWidth = window.innerWidth * 0.425,
    chartHeight = 510,
    chartRange = chartHeight - 10,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

  //create scale for scale bars
  function yScale(csvData) {
    return d3
      .scaleLinear()
      .range([chartRange, 0]) //adjusted to show small vals and not have high vals touch top
      .domain([0, d3.max(csvData, (d) => parseFloat(d[expressed])) + 5]); //adjust to data range
  }
  //begin script when window loads
  window.onload = setMap();

  //set up chorpleth map
  function setMap() {
    //map frame dimensions
    var width = window.innerWidth * 0.5,
      height = 460;

    // var mapDiv = d3
    //   .select("body div")
    //   .append("div")
    //   .attr("class", "mapDiv")
    //   .style("width", window.innerWidth * 0.5 + 5 + "px");

    var map = d3
      .select(".mapDiv")
      .append("svg") //operand
      .attr("class", "map")
      .attr("width", "99%")
      .attr("height", height);

    var projection = d3
      .geoAlbers()
      .center([0, 39]) //39.5
      .rotate([100, 0, 0]) //98.35
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

      //add the population overlay map
      popOverlay(usStates, map, path, csvData);

      //add enumeration units to the map
      setEnumerationUnits(usStates, map, path, colorScale);

      legend(map);

      console.log("csvData", csvData);

      //add coordinated viz to the map
      setChart(csvData, colorScale);

      //add btnGroup selector
      createBtnGroup(csvData);

      //load page with the all button in the pressed position
      d3.select(".total")
        .style("box-shadow", "none")
        .style("background", "#80808065")
        .style("outline", "1px solid #fff")
        .style("outline-offset", "-3px");
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
        var geojsonKey = geojsonProps.stateId;

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
        return "states " + d.properties.stateId;
      })
      .attr("d", path)
      .style("fill", function (d) {
        return choropleth(d.properties, colorScale);
      })
      .on("mouseover", function (event, d) {
        highlight(d.properties);
      })
      .on("mouseout", function (event, d) {
        dehighlight(d.properties);
      })
      .on("mousemove", function (event, d) {
        moveLabel(event);
      });

    //add style descriptor to path
    var desc = states
      .append("desc")
      .text('{"stroke": "rgb(103, 102, 102)", "stroke-width": "0.5px"}');
  } //end setEnumeration units

  //function to create colorscale generator
  function makeColorScale(data, colorClass) {
    var colorClasses = [];
    var classCount = 5;
    if (colorClass == 1) {
      colorClasses = ["#deebf7", "#9ecae1", "#3182bd"];
      //["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"]; //blues-5
      //greens["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"];
      //grays["#f7f7f7", "#cccccc", "#969696", "#636363", "#252525"];
      //YlGnBu["#ffffcc", "#a1dab4", "#41b6c4", "#2c7fb8", "#253494"];
      classCount = 3;
    } else {
      colorClasses = ["#feebe2", "#fbb4b9", "#f768a1", "#c51b8a", "#7a0177"];
    }

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
    var clusters = ss.ckmeans(domainArray, classCount);
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

  //function assign color and to test for data value and return nuetral color
  function choropleth(props, colorScale) {
    var val = parseFloat(props[expressed]);
    //if val exists assign color otherwise assign grey
    if (typeof val == "number" && !isNaN(val)) {
      return colorScale(val);
    } else {
      return "#CCC";
    }
  }

  //function to create coordinated bar chart
  function setChart(csvData, colorScale) {
    //create a second SVG element
    var chart = d3
      .select(".chartDiv")
      .append("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("class", "chart");

    //rectangle for axis and background stuff
    var chartBackground = chart
      .append("rect")
      .attr("class", "chartBackground")
      .attr("width", chartInnerWidth)
      .attr("height", chartInnerHeight)
      .attr("transform", translate);

    //rectangle background for axis
    var axisBackground = chart
      .append("rect")
      .attr("class", "axisBackground")
      .attr("width", chartWidth - chartInnerWidth)
      .attr("height", chartHeight)
      .attr("rx", "0.4em")
      .style("fill", "none");

    //create vertical axis generator
    var yAxis = d3.axisLeft().scale(yScale(csvData));

    //place axis
    var axis = chart
      .append("g")
      .attr("class", "axis")
      .attr("transform", translate)
      .call(yAxis);

    //set bars by state
    var bars = chart
      .selectAll(".bar")
      .data(csvData)
      .enter()
      .append("rect")
      .sort(function (a, b) {
        return b[expressed] - a[expressed];
      })
      .attr("class", function (d) {
        return "bar " + d.stateId;
      })
      .attr("width", chartInnerWidth / csvData.length - 1)
      .on("mouseover", function (event, d) {
        highlight(d);
      })
      .on("mouseout", function (event, d) {
        dehighlight(d);
      })
      .on("mousemove", function (event) {
        moveLabel(event);
      });

    //add style descriptor to bars
    var desc = bars
      .append("desc")
      .text('{"stroke": "none", "stroke-width": "0px"}');

    //annotate bars with attribute value text
    var barLabels = chart
      .selectAll(".barLabels")
      .data(csvData)
      .enter()
      .append("text")
      .sort(function (a, b) {
        return b[expressed] - a[expressed];
      })
      .attr("class", function (d) {
        return "barLabels " + d.stateId;
      });

    //create text element for chart title
    var chartTitle = d3
      .select(".mainTitle")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", chartInnerWidth / 2 + leftPadding)
      .attr("y", 30)
      .attr("class", "chartTitle");

    //create frame for chart border
    // var chartFrame = chart
    //   .append("rect")
    //   .attr("class", "chartFrame")
    //   .attr("width", chartInnerWidth)
    //   .attr("height", chartInnerHeight)
    //   .attr("transform", translate);

    updateChart(bars, barLabels, csvData, colorScale);
  } //end setchart

  //function to create legend
  function legend(map) {
    var legBars = ["high", "mid high", "mid", "mid low", "low"],
      colorClasses = ["#feebe2", "#fbb4b9", "#f768a1", "#c51b8a", "#7a0177"],
      popLegBars = ["high", "mid", "low"],
      popColorClasses = ["#deebf7", "#9ecae1", "#3182bd"],
      maxX = 130,
      minX = 50,
      maxY = 420,
      minY = 340;

    //3 class legend for the population overlay chorpleth
    var popLegend = map
      .selectAll(".popLegendBar")
      .data(popLegBars)
      .enter()
      .append("rect")
      .attr("class", "popLegendBar")
      .attr("x", (d, i) => minX + i * 26.66666)
      .attr("y", minY)
      .attr("height", "100px")
      .attr("width", "26.66666px")
      .style("fill", (d, i) => popColorClasses[i]);

    //5 class legend for the chorpleth attributes
    var legend = map
      .selectAll(".legendBar")
      .data(legBars)
      .enter()
      .append("rect")
      .attr("class", "legendBar")
      .attr("x", minX)
      .attr("y", function (d, i) {
        return maxY - i * 20;
      })
      .attr("height", "20px")
      .attr("width", "80px")
      .style("fill", function (d, i) {
        return colorClasses[i];
      });

    //labels for the legend
    var legendLabel = map
      .selectAll(".legendLabel")
      .data(["Low", "High"])
      .enter()
      .append("text")
      .attr("class", "legendLabel")
      .attr("x", function (d) {
        if (d == "Low") {
          return minX - 1;
        } else if (d == "High") {
          return maxX + 1;
        } else {
          return "0";
        }
      })
      .attr("y", function (d) {
        if (d == "Low") {
          return maxY + 20;
        } else if (d == "High") {
          return minY + 15;
        } else {
          return "0";
        }
      })
      .style("fill", "rgb(41, 40, 40)")
      .text((d) => d)
      .attr("text-anchor", function (d) {
        if (d == "Low") {
          return "end";
        } else if (d == "High") {
          return "start";
        } else {
          return "middle";
        }
      });
  }

  //function to create btnGroup menu for attribute selection and add event listeners for buttons
  function createBtnGroup(csvData) {
    var btnGroup = d3
      .select(".mapDiv")
      .append("div")
      .attr("class", "btn-group")
      .attr("width", "100%");

    //add attribute name options
    var attrOptions = btnGroup
      .selectAll("attrOptions")
      .data(attrArray)
      .enter()
      .append("button")
      .attr("class", (d) => "attrOptions " + d)
      .attr("value", (d) => d)
      .text((d) => attrLabels[d])
      .style("width", "14.1%")
      .style("height", "42px")
      .on("click", function () {
        //distiguish between pop overlay button and attribute change buttons
        if (this.value == "pop_2018") {
          //change transparancy to show pop overlay
          if (popOverlayStatus == "off") {
            d3.selectAll(".states").style("fill-opacity", "50%");
            d3.selectAll(".legendBar").style("fill-opacity", "50%");
            popOverlayStatus = "on";
            d3.select(".pop_2018")
              .html("Remove Population")
              .style("box-shadow", "none")
              .style("background", "#9ecae1")
              .style("outline", "1px solid #fff")
              .style("outline-offset", "-3px");
          } else {
            //restore transparancy to hide pop
            d3.selectAll(".states").style("fill-opacity", "100%");
            d3.selectAll(".legendBar").style("fill-opacity", "100%");
            popOverlayStatus = "off";
            d3.select(".pop_2018")
              .html("Overlay Population")
              .style("box-shadow", "0px 1px 2px rgba(0, 0, 0, 0.5)")
              .style("background", "#deebf7")
              .style("outline", "none");
          }
        } else {
          changeAttribute(this.value, csvData);
          //make button appear pressed down
          //first remove pressed look from all
          d3.selectAll(".attrOptions:not(.pop_2018)")
            .style("box-shadow", "0px 1px 2px rgba(0, 0, 0, 0.5)")
            .style("background", "#e8e6e6")
            .style("outline", "none");
          //then apply pressed look to the selected
          d3.select("." + this.value)
            .style("box-shadow", "none")
            .style("background", "#80808065")
            .style("outline", "1px solid #fff")
            .style("outline-offset", "-3px");
        }
      })
      .on("mouseover", function () {
        // decrease size of other buttons on hover
        d3.selectAll(".attrOptions").style("transform", "scale(90%)");
        // increase size of button on hover
        d3.select("." + this.value).style("transform", "scale(105%)");
      })
      .on("mouseout", function () {
        //return all buttons to size
        d3.selectAll(".attrOptions").style("transform", "scale(100%)");
      });
  } //end createBtnGroup

  //btnGroup change event listener
  function changeAttribute(attribute, csvData) {
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var states = d3
      .selectAll(".states")
      .transition()
      .duration(1000)
      .style("fill", function (d) {
        return choropleth(d.properties, colorScale);
      });

    var bars = d3
      .selectAll(".bar")
      //resort bars
      .sort(function (a, b) {
        return b[expressed] - a[expressed];
      })
      .transition()
      .delay(function (d, i) {
        return i * 20;
      })
      .duration(500);

    var barLabels = d3
      .selectAll(".barLabels")
      .sort(function (a, b) {
        return b[expressed] - a[expressed];
      })
      .transition()
      .delay(function (d, i) {
        return i * 20;
      })
      .duration(500);

    //transition flash axisBackground
    var axisBackground = d3
      .selectAll(".axisBackground")
      .transition()
      .style("fill", "#f1e1f2")
      .duration(1200)
      .transition()
      .style("fill", "none");

    updateChart(bars, barLabels, csvData, colorScale);
  } // end changeAttribute

  //function to position style and color bars in chart
  function updateChart(bars, barLabels, csvData, colorScale) {
    //dynamically update axis values
    //create vertical axis generator
    var yAxis = d3.axisLeft().scale(yScale(csvData));
    //update axis values
    var axis = d3
      .select(".axis")
      .transition()
      .duration(1500)
      .ease(d3.easeElastic)
      .call(yAxis.tickSize(5 - chartInnerWidth))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick text").attr("x", "-5"));

    bars
      .attr("x", function (d, i) {
        return i * (chartInnerWidth / csvData.length) + leftPadding;
      })
      .attr("height", function (d) {
        return chartRange - yScale(csvData)(parseFloat(d[expressed]));
      })
      .attr("y", function (d) {
        return yScale(csvData)(parseFloat(d[expressed])) + topBottomPadding;
      })
      //recolor bars
      .style("fill", function (d) {
        return choropleth(d, colorScale);
      });

    barLabels
      .attr("text-anchor", "middle")
      .attr("x", function (d, i) {
        var fraction = chartInnerWidth / csvData.length;
        return leftPadding + i * fraction + (fraction - 1) / 2;
      })
      .attr("y", function (d) {
        return yScale(csvData)(parseFloat(d[expressed])) + topBottomPadding + 8;
      })
      .text(function (d) {
        return d.stateId; //use state abbr instead of vals
      });

    var chartTitle = d3
      .select(".chartTitle")
      .text(
        "Metric Tons of CO2 emitted by " + attrLabels[expressed] + " sources"
      );
  } //end update chart

  //function to highlight elements on mouseover
  function highlight(props) {
    //limit the classes to exclude the labels
    var limitClass = [".states", ".bar"];
    limitClass.forEach(selected);
    function selected(item) {
      return d3
        .selectAll("." + props.stateId)
        .filter(item)
        .style("stroke", "white")
        .style("stroke-width", "2px");
    }
    setLabel(props);
  }

  //function to remove highlight from elements on mouseout
  function dehighlight(props) {
    //limit the classes to exclude the labels
    var limitClass = [".states", ".bar"];
    limitClass.forEach(selected);
    function selected(item) {
      return d3
        .selectAll("." + props.stateId)
        .filter(item)
        .style("stroke", function () {
          return getStyle(this, "stroke");
        })
        .style("stroke-width", function () {
          return getStyle(this, "stroke-width");
        });
    }

    //remove the info label
    d3.select(".infoLabel").remove();

    function getStyle(element, styleName) {
      var styleText = d3.select(element).select("desc").text();

      var styleObject = JSON.parse(styleText);
      return styleObject[styleName];
    }
  }

  //function to create dynamic label
  function setLabel(props) {
    //round mtco2 to 2 decimal
    var mtco2 = Number(props[expressed]).toFixed(2);

    //label content
    var labelAttribute =
      "<h1>" +
      mtco2 +
      "</h1><b>MTCO2 <br> " +
      attrLabels[expressed] +
      " sources</b>";

    //create info label div
    var infoLabel = d3
      .select("body div")
      .append("div")
      .attr("class", "infoLabel")
      .attr("id", props.stateId + "_label")
      .html(labelAttribute);

    var stateName = infoLabel
      .append("div")
      .attr("class", "labelname")
      .html(props.state_name);
  }

  //function to move label with mouse
  function moveLabel(event) {
    //get width of the label
    var labelWidth = d3
      .select(".infoLabel")
      .node()
      .getBoundingClientRect().width;

    //use coords of the mousemove event to set label coords
    var x1 = event.clientX + 10,
      y1 = event.clientY - 75,
      x2 = event.clientX - labelWidth - 10,
      y2 = event.clientY + 25;

    //horizontal label coord testion for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    var y = event.clientY < 75 ? y2 : y1;

    d3.select(".infoLabel")
      .style("left", x + "px")
      .style("top", y + "px");
  }

  //function to overlay population data(actually underlay)
  function popOverlay(usStates, map, path, csvData) {
    var statePop = map
      .selectAll(".pop")
      .data(usStates)
      .enter()
      .append("path") //operand
      .attr("class", function (d) {
        return "pop " + d.properties.stateId;
      })
      .attr("d", path)
      .style("fill", function (d) {
        return choropleth(d.properties, makeColorScale(csvData, 1));
      });
  }
})(); //close out wrap local-scope function
