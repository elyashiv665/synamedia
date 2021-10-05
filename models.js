const mongoose = require("mongoose");
mongoose.connect(
    "mongodb+srv://elyashiv:Tt026519310@cluster0.cuvnq.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useFindAndModify: false,
      useUnifiedTopology: true
    }
  );

  
module.exports = {};