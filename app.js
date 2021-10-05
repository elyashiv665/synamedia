const express = require('express');
const app = express();
const bodyParser=require('body-parser');

var mongooseTools = require("./mongooseTools");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


var Distances = mongooseTools.Distances;

async function get_hello(req, res){
  res.status(200).send('hello');
}

async function googleDistance(source, destination){
  const apikey = 'AIzaSyDJt5ai8Ui06dCItSuChs30bJB--n_78mA';
  const axios = require('axios');

  const config = {
  method: 'get',
  url: 'https://maps.googleapis.com/maps/api/distancematrix/json?origins='+ source +
        '&destinations='+ destination+'&key='+apikey,
  headers: { }
  };
  var dist;
  await axios(config).then(function (response) {
    dist = parseInt((response.data.rows[0].elements[0].distance.text).split(' ')[0]);
  })
  .catch(function (error) {
    //in the parent function(get_distance) getting false means error
    return false;
  })
  return dist;
}


async function get_distance(req, res){
  try{
    //check the input
    const source = req.query.source;
    const dest = req.query.destination;
    if((!source) || (! dest)){
      res.status(400).send("invalid arguments");
      return;
    }

    // if no connection
    if(!mongooseTools.checkConnection()){
      const distance = await googleDistance(source, dest);
      if(distance){ res.status(200).send({"distance":distance});return;}
      else{res.status(500).send("fail to find distance with google api");return;}
    }

    // get previous distance or calculate new one
    var target;
    if(await Distances.findOne({'source':source, 'destination':dest})){
      target = {'source':source, 'destination':dest};
    }else if(await Distances.findOne({'source':dest, 'destination':source})){
      target = {'source':dest, 'destination':source};
    }
    else{// else Distance is not in the database
      target = {'source':source, 'destination':dest}; 
      //save new element in the database
      const dist = await googleDistance(source, dest);
      if(!dist){
        res.status(500).send("fail to find distance with google api");
        return;
      }
      try{
        const newObj = new Distances({'source':source, 'destination':dest, 'hits':0,'distance':dist});
        await newObj.save();
      }catch(err){
        res.status(500).send("database connection error");
        return;
      }
    }

    // target is in the database, update hits and get distance:
    const obj = await Distances.findOne(target);
    const distance = obj.distance;
    const hits = obj.hits;

    //update hits
    await Distances.findOneAndUpdate(target, {'hits':(hits+1)});
    res.status(200).send(JSON.stringify({"distance":distance}));
  }catch(err){
    res.status(500).send(err.message);
  }
}
  
async function get_popular_search(req, res){
  try{
    var mostPopular = await Distances.find({}).sort({'hits' : -1}).limit(1);
    if(mostPopular ===[]){
      res.status(400).send("database is empty");
      return;
    }
    mostPopular = mostPopular[0];
    const source = mostPopular.source;
    const dest = mostPopular.destination;
    const hits = mostPopular.hits;
    res.status(200).send(JSON.stringify({'source': source, 'destination':dest, 'hits':hits}));
  }catch(err){
    res.status(500).send(err.message);
  }
}

async function post_distance(req, res){
  try{
    const source = req.body.source;
    const dest = req.body.destination;
    const dist = req.body.distance;
    //check the input
    if((!source) || (! dest) || (!dist)){
      res.status(400).send("invalid arguments");
      return;
    }
    //check if allready exist in database
    var hits;
    if( await Distances.findOne({'source':source, 'destination':dest})){
      const Obj = await Distances.findOneAndUpdate({'source':source, 'destination':dest}, {'distance': dist});
      hits = Obj.hits;
    }else if(await Distances.findOne({'source':dest, 'destination':source})){
      const Obj = await Distances.findOneAndUpdate({'source':dest, 'destination':source}, {'distance': dist});
      hits = Obj.hits;
    }else{
      const newObj = new Distances({'source':source, 'destination':dest, 'distance': dist});
      await newObj.save();
      hits = 0;
    }
    res.status(201).send({source:source, destination:dest, hits:hits});
  }catch(err){
    res.status(500).send(err.message);
  }

}



app.get('/hello', get_hello);
app.get('/distance', get_distance);
app.get('/health', mongooseTools.get_health);
app.get('/popularsearch', get_popular_search);

app.post('/distance', post_distance);


app.listen(8080)