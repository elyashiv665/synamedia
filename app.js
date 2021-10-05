const express = require('express');
const app = express();
const bodyParser=require('body-parser');

var models = require("./models");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



async function get_hello(req, res){
  res.status(200).send('hello');
}

app.get('/hello', get_hello);
app.listen(8080)