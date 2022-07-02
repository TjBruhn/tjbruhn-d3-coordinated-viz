// javascript by Trever J. Bruhn 2022

//begin script when window loads
window.onload = setMap();

//set up chorpleth map
function setMap() {
  //use queue to parallelize asynchronous data loading
  d3.queue()
    .defer(d3.csv, "data/stateData.csv") //load attributes from csv
    .defer(d3.json, "data/usStates.topojson") //Load spatial data
    .await(callback);

  function callback(error, csvData, us) {
    //translate us topojson
    // var usStates = topojson.feature(us, us.objects.usStates);
    if (error) throw error;
    console.log("error: ", error);
    console.log("csv", csvData);
    console.log("usStates", us);
  }
}
