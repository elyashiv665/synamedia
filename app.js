const express = require('express');
const app = express();
const axios = require('axios');

let db = require("./db");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


let Distances = db.Distances;

async function get_hello(req, res){
  res.status(200).send('hello');
}

async function post2dataBase(source, dest, hits, dist){
    const newObj = new Distances({'source':source, 'destination':dest, 'hits':hits,'distance':dist});
    const result = await newObj.save();
    if (result !== newObj) {
      throw new Error('failed to save');
    }
}

async function googleDistance(source, destination){
  const apikey = 'AIzaSyDJt5ai8Ui06dCItSuChs30bJB--n_78mA';
  const config = {
  method: 'get',
  url: 'https://maps.googleapis.com/maps/api/distancematrix/json?origins='+ source +
        '&destinations='+ destination+'&key='+apikey,
  headers: { }
  };
  let dist;
  await axios(config).then(function (response) {
    dist = parseInt((response.data.rows[0].elements[0].distance.text).split(' ')[0]);
  })
  .catch(function (error) {
    //in the parent function(get_distance) getting -1 means error
    return -1;
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

    const connection = db.checkConnection();
    // if no connection get google distance and return
    if(!connection){
      dist = await googleDistance(source, dest);
      if(dist === -1){
        res.status(500).send("fail to find distance with google api"); 
      }
      if(!connection){
        res.status(200).send({"distance":dist});
      }
      return;
    }

    let findRes;
    let target;
    // check if distance is already in the database
    findRes = await Distances.findOne({'source':source, 'destination':dest});
    if(findRes){
      target = {'source':source, 'destination':dest};
    }else{
      findRes = await Distances.findOne({'source':dest, 'destination':source});
      if(findRes){
        target = {'source':dest, 'destination':source};
      }else{ // obj is not in database 
        //save new element in the database and return
        try{
          const dist = await googleDistance(source, dest);
          if(dist === -1){
            res.status(500).send("fail to find distance with google api"); 
            console.log("500");
            return;
          }
          await post2dataBase(source, dest, 1, dist);
          res.status(200).send({'distance':dist});
        }catch(err){
          res.status(500).send("database connection error");
        }
        return;
      }
    }
    // distance in the database
    const dist = findRes.distance;
    const hits = findRes.hits;

    //update hits
    await Distances.findOneAndUpdate(target, {'hits':(hits+1)});
    res.status(200).send(JSON.stringify({"distance":dist}));
  }catch(err){
    res.status(500).send(err.message);
  }
}
  
async function get_popular_search(req, res){
  try{
    let mostPopular = await Distances.find({}).sort({'hits' : -1}).limit(1);
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
    let hits;
    if( await Distances.findOne({'source':source, 'destination':dest})){
      const Obj = await Distances.findOneAndUpdate({'source':source, 'destination':dest}, {'distance': dist});
      hits = Obj.hits;
    }else if(await Distances.findOne({'source':dest, 'destination':source})){
      const Obj = await Distances.findOneAndUpdate({'source':dest, 'destination':source}, {'distance': dist});
      hits = Obj.hits;
    }else{ //new Distance obj
        hits = 0
        await post2dataBase(source, dest, hits, dist);
      }
    res.status(201).send({source:source, destination:dest, hits:hits});
  }catch(err){
    res.status(500).send(err.message);
  }

}



app.get('/hello', get_hello);
app.get('/distance', get_distance);
app.get('/health', db.get_health);
app.get('/popularsearch', get_popular_search);

app.post('/distance', post_distance);


app.listen(8080)