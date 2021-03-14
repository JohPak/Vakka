const { json } = require('body-parser');
const bodyParser = require('body-parser'); // this allows us to access req.body.whatever
const express = require('express');
const app = express();
const fs = require('fs');
const fetch = require("node-fetch");
const port = 8080

// for parsing application/xwww-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true })); // tarvitaan että lomakkeelta tulee hakusana läpi
// app.use(express.json());       // to support JSON-encoded bodies
// app.use(express.urlencoded()); // to support URL-encoded bodies


// MODUULIT
const search = require('./modules/search.js');

// SERVE STATIC FILES Now, you can load the files that are in the public directory
// app.use(express.static('public'));
app.use(express.static(__dirname)); //NODEN käynnistyssijainti - saattaa muuttua jos appin siirtää jonnekin

// MUUT
let word = "";
let resultamount = 3; //haettavien hakutulosten määrä
let result = {
    brandi: "",
    price: "",
    saleprice: "",
    image: "",
    instock: "",
    magentoid: "",
    ean: "",
    weight: "",
    wholecategory: "",
    category: "",
    url: "",
    name: "",

};
let productarray = [];

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
    console.log("POST KUTSU index.js, hakusana: " + req.body.hakusana);
    word = req.body.hakusana;
    
    // jos hakusana on <=1 merkkiä, pudotetaan haettavien tulosten määrä nollaksi
    if (word.length <=1) {
        resultamount = 0;            
    }
    
    // määrittele kaikki muuttujat ennen urlia, jotta tarvittavat muuttujat sijoittuu urliin mukaan
    let url = `https://eucs13.ksearchnet.com/cloud-search/n-search/search?ticket=klevu-15596371644669941&term=${word}&paginationStartsFrom=0&sortPrice=false&ipAddress=undefined&analyticsApiKey=klevu-15596371644669941&showOutOfStockProducts=true&klevuFetchPopularTerms=false&klevu_priceInterval=500&fetchMinMaxPrice=true&klevu_multiSelectFilters=true&noOfResults=${resultamount}&klevuSort=rel&enableFilters=true&filterResults=&visibility=search&category=KLEVU_PRODUCT&sv=229&lsqt=&responseType=json`
    
        search.haku(url, word, {}) 
        .then(data => { 
        //   console.log(data); // JSON data parsed by `data.json()` call
        res.json(data);
        // res.send(data);

        console.log(data.result.length, "datan pituus");
        for (let i = 0; i < data.result.length; i++) {
            result[i].brandi = data.result.brandit;
            result[i].price = data.result.price;
            result[i].saleprice = data.result.salePrice;
            result[i].image = data.result.image;
            result[i].instock = data.result.inStock;
            result[i].magentoid = data.result.id;
            result[i].ean = data.result.sku;
            result[i].weight = data.result.weight;
            result[i].wholecategory = data.result.klevu_category;
            result[i].category = data.result.category;
            result[i].url = data.result.url;
            result[i].name = data.result.name;
            console.log(result[i]);

            productarray.push(result[i]);
        }
console.log(productarray);
// res.send(productarray);
        });
    })



app.listen(process.env.PORT || port, () => { //Herokua varten. Heroku asettaa portin process.env.PORT:iin
    console.log(`Vakka app listening at http://localhost:${port}`)
    console.log(process.env.PORT ? `Herokun antama portti ${process.env.PORT}` : ``);
  })  