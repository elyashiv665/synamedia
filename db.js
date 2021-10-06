const mongoose = require("mongoose");
mongoose.connect(
    "mongodb+srv://elyashivmn:Tt026519310@cluster0.ogygj.mongodb.net/Synamedia?retryWrites=true&w=majority",
    {
      useNewUrlParser: true
    }
  );

const distancesSchema = new mongoose.Schema({
source:{
    type: String,
    require: true,
},
destination:{
    type: String,
    require: true
},
distance:{
  type: Number,
  require: true
},
hits:{
  type: Number,
  require: true
}
});

async function checkConnection(){
  const connectionStatus = mongoose.connection.readyState;
    return (connectionStatus === 1);
}


async function get_health(req, res){
    if(checkConnection()){
      res.status(200).send();
    }else{
      response.status(500).send("db is disconnected");
    }
}

const Distances = mongoose.model("Distances", distancesSchema);
distancesSchema.index({ hits: 1 });

module.exports = {Distances:Distances, get_health:get_health, checkConnection:checkConnection};