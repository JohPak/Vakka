// const { json } = require('body-parser');
const bodyParser = require('body-parser'); // this allows us to access req.body.whatever
const express = require('express');
const app = express();
const fs = require('fs');
const fetch = require("node-fetch");
const port = 8080
const path = require('path');



// for parsing application/xwww-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true })); // tarvitaan että lomakkeelta tulee hakusana läpi
// app.use(express.json());       // to support JSON-encoded bodies
// app.use(express.urlencoded()); // to support URL-encoded bodies


// MODUULIT
const search = require('./modules/search.js');

// SERVE STATIC FILES Now, you can load the files that are in the public directory
// app.use(express.static('public')) 
app.use(express.static(__dirname)); //NODEN käynnistyssijainti - saattaa muuttua jos appin siirtää jonnekin




// MUUT
let word = "";
let resultamount = 3; //haettavien hakutulosten määrä
let searchresult = {
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
    console.log("---------------------------------------------------------------------------");
    console.log("POST KUTSU index.js, hakusana: " + req.body.hakusana);
    word = req.body.hakusana;
    resultamount = req.body.hakumaara;
    productarray.length = 0; //tyhjätään taulukko uutta hakua varten
    
    // jos hakusana on <=1 merkkiä, pudotetaan haettavien tulosten määrä nollaksi
    if (word.length <=1) {
        resultamount = 0;
        console.log("hakusanan pituus liian lyhyt, nollataan hakumäärä");
        res.write("Hakusana liian lyhyt/puuttuu");
        res.end();
    }
    
    // määrittele kaikki muuttujat ennen urlia, jotta tarvittavat muuttujat sijoittuu urliin mukaan
    let url = `https://eucs13.ksearchnet.com/cloud-search/n-search/search?ticket=klevu-15596371644669941&term=${word}&paginationStartsFrom=0&sortPrice=false&ipAddress=undefined&analyticsApiKey=klevu-15596371644669941&showOutOfStockProducts=true&klevuFetchPopularTerms=false&klevu_priceInterval=500&fetchMinMaxPrice=true&klevu_multiSelectFilters=true&noOfResults=${resultamount}&klevuSort=rel&enableFilters=true&filterResults=&visibility=search&category=KLEVU_PRODUCT&sv=229&lsqt=&responseType=json`
    
        search.haku(url, word, {}) 
        .then(data => { 
        //   console.log(data); // JSON data parsed by `data.json()` call

        try {

        for (let i = 0; i < resultamount; i++) {
            searchresult.price = "(" + data.result[i].price + " €)";
            searchresult.saleprice = data.result[i].salePrice;
            // poistetaan normihinta, mikäli se on sama kuin saleprice
                if (data.result[i].salePrice == data.result[i].price) {
                    searchresult.price = "";
                }
                // jos tarjoushinta on voimassa, muutetaan tarjoushinta punaiseksi
                else if (data.result[i].price) {
                    searchresult.saleprice = `<span class="punaisella">${data.result[i].salePrice}</span>`;
                }
            searchresult.image = data.result[i].image.replace("needtochange/","");
            searchresult.instock = data.result[i].inStock;
            searchresult.magentoid = data.result[i].id;
            searchresult.ean = data.result[i].sku;
            searchresult.weight = data.result[i].weight + " kg";
            // mikäli tuotteella ei painoa, niin:
            if (!data.result[i].weight) {
                searchresult.weight = `<span class="puuttuu">ei painoa</span>`
            }
            //siivotaan ryönää pois
            searchresult.wholecategory = data.result[i].klevu_category.replace(`KLEVU_PRODUCT;;`, "");
                searchresult.wholecategory = searchresult.wholecategory.replace(`@ku@kuCategory@ku@`, "");
                while (searchresult.wholecategory.match(`;;`) || searchresult.wholecategory.match(`;`)) {
                    searchresult.wholecategory = searchresult.wholecategory.replace(`;;`, `. `);
                    searchresult.wholecategory = searchresult.wholecategory.replace(`;`, ` > `);
                }
            searchresult.category = data.result[i].category;
            searchresult.url = data.result[i].url;
            searchresult.name = data.result[i].name;
            // mikäli tuotteella ei ole brändiä, poistetaan kentästä "undefined"-merkintä
            if (data.result[i].brandit == undefined || data.result[i].brandit == "undefined") {
                searchresult.brandi = `<span class="puuttuu">ei brändiä</span>`;
            }
            else {
                searchresult.brandi = data.result[i].brandit;
                }
            productarray.push(searchresult);
            searchresult = {}; // luodaan uusi objekti seuraavaa tuotetta varten
        }
    } catch (error) {
         console.log("ups, for:issa/tuotetiedoissa jotain pielessä" + error);
    }
console.log(productarray);

let html = fs.readFileSync("./views/main.html").toString("utf-8");
        let taulukko = "";
        for (let index = 0; index < productarray.length; index++) {
          taulukko += `
          <div class="taulukko">
            <div class="kuvadiv"><a href="${productarray[index].url}" target="_blank"><img class="kuva" src="${productarray[index].image}"></a></div>
            <div class="tietodiv">
                <span class="brandi">${productarray[index].brandi}</span><br>
                <span class="tuotenimi">${productarray[index].name}</span><br>
                <span class="myyntihinta">${productarray[index].saleprice} €</span>
                <span class="normihinta">${productarray[index].price}</span>
                <span class="varasto">Varastossa: ${productarray[index].instock}</span><br>
                <span class="paino">${productarray[index].weight}</span><br>
                <span class="url"><a href="${productarray[index].url}" target="_blank">${productarray[index].url}</a></span><br>
<br>

                <table>
                <tr>
                <th class="t-ean">Ean:</th>
                <th class="t-magento">Magento id:</th>
                <th class="t-kategoria">Kategoria</th>
                <th class="t-kategoriapolku">Kategoriapolku</th>
                </tr>
                <tr>
                <td class="t-ean">${productarray[index].ean}</td>
                <td class="t-magento">${productarray[index].magentoid}</td>
                <td class="t-kategoria">${productarray[index].category}</td>
                <td class="t-kategoriapolku">${productarray[index].wholecategory}</td>
                </tr>
                </table>
                
                
            </div>
          </div><br>
          `;
        }


       //etsitään main.html:stä div, jonka sisältö korvataan uudella (<div class="main">TÄMÄ VÄLI KORVAUTUU</div>)
        let taydennetty = html.replace(/(?<=\<div class="main">)(.*?)(?=\<\/div>)/g, taulukko);
        //etsitään hakukenttä ja palautetaan haettu sana siihen takaisin
        // taydennetty = html.replace(/(?<=hakusana" value=")(.*?)(?="\>\<label for=)/g, word);

        res.send(taydennetty);

        });
    })



app.listen(process.env.PORT || port, () => { //Herokua varten. Heroku asettaa portin process.env.PORT:iin
    console.log(`Vakka app listening at http://localhost:${port}`)
    console.log(process.env.PORT ? `Herokun antama portti ${process.env.PORT}` : ``);
  })  