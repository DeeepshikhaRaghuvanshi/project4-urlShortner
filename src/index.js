const express= require("express")
const bodyParser= require("body-parser")
const route= require("./route/routes")
const mongoose= require("mongoose")
const app= express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect("mongodb+srv://swati_pathak:DGhDxlBIIfyRwGwk@cluster0.ogdpf.mongodb.net/group-96Database", {
    useNewUrlParser: true
})
.then( () => console.log("MongoDb is running on 27017"))
.catch ( err => console.log(err) )

app.use('/', route);

app.all('*', function(req, res) {
    throw new Error("Bad request")
})

app.use(function(e, req, res, next) {
    if (e.message === "Bad request") {
        res.status(400).send({status : false , error: e.message});
    }
});

app.listen(process.env.PORT || 3000, function () {
    console.log('Express app running on port ' + (process.env.PORT || 3000))
});
