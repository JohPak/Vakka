const bodyParser = require('body-parser'); // this allows us to access req.body.whatever
const express = require('express');
const app = express();
const fs = require('fs');
const fetch = require("node-fetch");
const port = 8080

// MODUULIT
const search = require('./modules/search.js');

// SERVE STATIC FILES Now, you can load the files that are in the public directory
// app.use(express.static('public'));
app.use(express.static(__dirname)); //NODEN käynnistyssijainti - saattaa muuttua jos appin siirtää jonnekin

// MUUT
let term = "";
let resultamount = 5;
const url = `https://eucs13.ksearchnet.com/cloud-search/n-search/search?ticket=klevu-15596371644669941&term=${term}&paginationStartsFrom=0&sortPrice=false&ipAddress=undefined&analyticsApiKey=klevu-15596371644669941&showOutOfStockProducts=true&klevuFetchPopularTerms=false&klevu_priceInterval=500&fetchMinMaxPrice=true&klevu_multiSelectFilters=true&noOfResults=${resultamount}&klevuSort=rel&enableFilters=true&filterResults=&visibility=search&category=KLEVU_PRODUCT&sv=229&lsqt=&responseType=json`

app.get('/', (req, res) => {
    console.log(req.body);
  
        // nodessa ei voi käpistellä html-tiedostoja suoraan, joten muutetaan se stringiksi
        let html = fs.readFileSync("./views/main.html").toString("utf-8");
        res.send(html); //headerit voi lähettää vain kerran, eli vain yks res.send. Res.writeja voi olla useita ja lopuksi res.send
        
        // malli miten funktion errori napataan
        // suoritaHaku().catch(e => {console.log("--------------- mitä nyt TAAS: " + e.message);})    

    })
    app.post('/', (req, res) => {
        //   POST KUTSU tuli
        // { hakusana: 'koira' } lomakkeen osis pitää olla name-attribuutit (=hakusana)
        console.clear();
        console.log("POST KUTSU tuli");
        console.log(req.body.hakusana);
        term = req.body.hakusana;

        // search.haku(url, {}, term)
        // .then(data => {
        //   console.log(data); // JSON data parsed by `data.json()` call
        // });
    })



app.listen(process.env.PORT || port, () => { //Herokua varten. Heroku asettaa portin process.env.PORT:iin
    console.log(`Vakka app listening at http://localhost:${port}`)
    console.log(process.env.PORT ? `Herokun antama portti ${process.env.PORT}` : ``);
  })  