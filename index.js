// const { json } = require('body-parser');
const bodyParser = require('body-parser'); // this allows us to access req.body.whatever
const express = require('express');
const app = express();
const fs = require('fs');
const fetch = require("node-fetch");
const port = 8080
const path = require('path');

// MODUULIT
const search = require('./modules/search.js');



// for parsing application/xwww-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true })); // tarvitaan että lomakkeelta tulee hakusana läpi
// app.use(express.json());       // to support JSON-encoded bodies
// app.use(express.urlencoded()); // to support URL-encoded bodies



// SERVE STATIC FILES Now, you can load the files that are in the public directory
// app.use(express.static('public')) 
app.use(express.static(__dirname)); //NODEN käynnistyssijainti - saattaa muuttua jos appin siirtää jonnekin




// MUUT
let word = "";
let resultamount = ""; 
let filterresultsby = ""; // minkä perusteella tulokset järjestetään
let html = fs.readFileSync("./views/main.html").toString("utf-8");
let withoutimages = "";
let productarray = [];
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

app.get('/', (req, res) => {
    console.log(req.body);
    
    // nodessa ei voi käpistellä html-tiedostoja suoraan, joten muutetaan se stringiksi
    let html = fs.readFileSync("./views/main.html").toString("utf-8");
    res.send(html); //headerit voi lähettää vain kerran, eli vain yks res.send. Res.writeja voi olla useita ja lopuksi res.send
    
    // malli miten funktion errori napataan
    // suoritaHaku().catch(e => {console.log("--------------- mitä nyt TAAS: " + e.message);})    
    
}) //END APP.GET

app.post('/', (req, res) => {
    // { hakusana: 'koira' } lomakkeen osis pitää olla name-attribuutit (=hakusana)
    console.log("---------------------------------------------------------------------------");
    console.log("POST KUTSU index.js, hakusana: " + req.body.hakusana);
    word = req.body.hakusana;
    resultamount = (req.body.hakumaara < 10) ? 10 : req.body.hakumaara; //oletushakumäärä
    productarray.length = 0; //tyhjätään taulukko uutta hakua varten
    filterresultsby = req.body.sorttaus;
    withoutimages = req.body.kuvattomat;
    
    // määrittele kaikki muuttujat ennen urlia, jotta tarvittavat muuttujat sijoittuu urliin mukaan
    // huomaa hakusanan muutos enkoodatuksi! Muuten haku ei toimi ääkkösillä
    let url = `https://eucs13.ksearchnet.com/cloud-search/n-search/search?ticket=klevu-15596371644669941&term=${encodeURIComponent(word)}&paginationStartsFrom=0&sortPrice=false&ipAddress=undefined&analyticsApiKey=klevu-15596371644669941&showOutOfStockProducts=true&klevuFetchPopularTerms=false&klevu_priceInterval=500&fetchMinMaxPrice=true&klevu_multiSelectFilters=true&noOfResults=${resultamount}&klevuSort=${filterresultsby}&enableFilters=false&filterResults=&visibility=search&category=KLEVU_PRODUCT&sv=229&lsqt=&responseType=json`
    

        search.haku(url, {}) 
        .then(data => { 
        //   console.log(data); // JSON data parsed by `data.json()` call
        
        // jos hakusana on <=1 merkkiä, herjataan
        if (word.length <=1) {
            console.log("hakusanan pituus liian lyhyt");
            sendThis(html.replace(/(?<=\<div class="main">)(.*?)(?=\<\/div>)/g, `<span class="virhe">Hakusana liian lyhyt/puuttuu</span>`));
        }
        let findingsamount = data.meta.totalResultsFound;
        
        // TÄMÄ TÄRKEÄ. Mikäli for-lause yrittää luupata enemmän hakutuloksia kuin niitä on tarjolla, haku kaatuu.
        // jos hakumäärä > löydettyjen määrä, muuta hakumäärä löydettyjen määräksi
        resultamount = (resultamount > findingsamount) ? findingsamount : resultamount;    

        for (let i = 0; i < resultamount; i++) {
            try {
                if (data.result[i].price != undefined && data.result[i].price != "") {
                    searchresult.price = `<span class="normihinta">${parseFloat(data.result[i].price).toFixed(2)} €</span>`;
                }
                    searchresult.saleprice = `${parseFloat(data.result[i].salePrice).toFixed(2)} €`;
                    // poistetaan normihinta, mikäli se on sama kuin saleprice
                    if (parseFloat(data.result[i].salePrice).toFixed(2) == parseFloat(data.result[i].price).toFixed(2)) {
                        searchresult.price = "";
                    }
                    // jos tarjoushinta on voimassa, muutetaan tarjoushinta punaiseksi
                    else if (data.result[i].price) {
                        searchresult.saleprice = `<span class="punaisella">ale ${parseFloat(data.result[i].salePrice).toFixed(2)} €</span>`;
                    }
            } catch (error) {
                console.log("HINTAHAUSSA virhe " + error);
                sendThis(html.replace(/(?<=\<div class="main">)(.*?)(?=\<\/div>)/g, `<span class="virhe"><h2>Noniin</h2>Nyt sä rikoit sen.<br><br>${error}<br><br>${JSON.stringify(data)}</span>`));
               }

            try {
                // laitetaan oletuskuva, mikäli kuvaa ei ole
                // var beverage = (age >= 21) ? "Beer" : "Juice";
                searchresult.image = (data.result[i].image == "") ? "https://www.minimani.fi/media/catalog/product/placeholder/default/minimaniph.png" : data.result[i].image.replace("needtochange/","");
    
                // ternääri: onko varastoarvo yes ? true=kyllä : false=ei
                searchresult.instock = (data.result[i].inStock == "yes") ? `<span class="vihrealla">kyllä</span>` : `<span class="punaisella">ei</span>`;
    
                searchresult.magentoid = data.result[i].id;
                searchresult.ean = data.result[i].sku;
                
                searchresult.weight = +data.result[i].weight.toString() + " kg"; //plussa edessä muuttaa numeroksi, tostring perässä tekstiksi poistaen samalla ylimääräiset nollat
                // mikäli tuotteella ei painoa, niin:
                if (!data.result[i].weight) {
                    searchresult.weight = `<span class="puuttuu">ei painoa</span>`
                }
            } catch (error) {
                console.log("KUVA, VARASTO, MAGENTOID, PAINO, EAN: virhe " + error);
                sendThis(html.replace(/(?<=\<div class="main">)(.*?)(?=\<\/div>)/g, `<span class="virhe"><h2>Noniin</h2>Nyt sä rikoit sen.<br><br>${error}<br><br>${JSON.stringify(data)}</span>`));
               }

            try {
                //siivotaan ryönää pois
                searchresult.wholecategory = data.result[i].klevu_category.replace(`KLEVU_PRODUCT;;`, "").replace(`KLEVU_PRODUCT`, "").replace(`@ku@kuCategory@ku@`, "");
        
                // jos wholecategory sisältää merkkejä, siivotaan ne
                if (searchresult.wholecategory != undefined) {
                    
                    while (searchresult.wholecategory.match(`;;`) || searchresult.wholecategory.match(`;`)) {
                        searchresult.wholecategory = searchresult.wholecategory.replace(`;;`, `. `);
                        searchresult.wholecategory = searchresult.wholecategory.replace(`;`, ` > `);
                    }
                }
                // jos category sisältää merkkejä, siivotaan ne
                searchresult.category = (data.result[i].category == undefined) ? "" : data.result[i].category; 
                if (searchresult.category != undefined) {
                    // lisää ryönän siivousta
                        while (searchresult.category.match(`;;`) || searchresult.category.match(`;`)) {
                            searchresult.category = searchresult.category.replace(`;;`, `. `);
                            searchresult.category = searchresult.category.replace(`;`, ` > `);
                        }
                }
                // liitetään kategoriaan linkki
                searchresult.category = `<a href="/" onclick="clickCat(${searchresult.category})">${searchresult.category}</a>`;
            } catch (error) {
                console.log("KATEGORIAHAUSSA virhe " + error);
                sendThis(html.replace(/(?<=\<div class="main">)(.*?)(?=\<\/div>)/g, `<span class="virhe"><h2>Noniin</h2>Nyt sä rikoit sen.<br><br>${error}<br><br>${JSON.stringify(data)}</span>`));
               }

                searchresult.url = data.result[i].url;
                searchresult.name = data.result[i].name;

                // mikäli tuotteella ei ole brändiä, poistetaan kentästä "undefined"-merkintä
                searchresult.brandi = (data.result[i].brandit == undefined || data.result[i].brandit == "undefined") ? `<span class="puuttuu">ei brändiä</span>` : data.result[i].brandit;
                
                // sijoita valmis tuotepläjäys taulukkoon
                productarray.push(searchresult);

                searchresult = {}; // luodaan uusi objekti seuraavaa tuotetta varten
                
        } //END FOR

    
        // console.log(productarray);
            if (filterresultsby == "newfirst") {
                // sortataan productarray magentoidn mukaan (UUSIMMAT ENSIN)
                productarray.sort(function(a, b){
                    return b.magentoid-a.magentoid
                })
            } else if (filterresultsby == "oldfirst") {
                // sortataan productarray magentoidn mukaan (VANHIMMAT ENSIN)
                productarray.sort(function(a, b){
                    return a.magentoid-b.magentoid
                })
            }

        let taulukko = `<div class="tulosmaara">Näytetään ${resultamount} / ${findingsamount} hakutuloksesta.</div>`;
        for (let index = 0; index < productarray.length; index++) {
          taulukko += `
          
          <div class="taulukko">
            <div class="kuvadiv"><a href="${productarray[index].url}" target="_blank"><img class="kuva" src="${productarray[index].image}"></a></div>
            <div class="tietodiv">
                <span class="brandi">${productarray[index].brandi}</span><br>
                <span class="tuotenimi"><a href="${productarray[index].url}" id="nimilinkki" target="_blank">${productarray[index].name}</a></span><br>
                <span class="myyntihinta">${productarray[index].saleprice}</span>
                ${productarray[index].price}
                <span class="varasto">Ostettavissa vk:sta: ${productarray[index].instock}</span>
                <span class="paino">${productarray[index].weight}</span><br><br>
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
            } // END TAULUKKO FOR
    

       //etsitään main.html:stä div, jonka sisältö korvataan uudella (<div class="main">TÄMÄ VÄLI KORVAUTUU</div>)
        let taydennetty = html.replace(/(?<=\<div class="main">)(.*?)(?=\<\/div>)/g, taulukko);

        //etsitään hakukenttä ja palautetaan haettu sana siihen takaisin
        taydennetty = taydennetty.replace(`hakusana" value=""`, `hakusana" value="${word}"`);

        // palautetaan käyttäjän valitsema arvo select-boksiin..huhheijaa
        if (filterresultsby == "lth") {
            taydennetty = taydennetty.replace(`<option value="lth">`, `<option value="lth" selected>`);
        } else if (filterresultsby == "htl") {
            taydennetty = taydennetty.replace(`<option value="htl">`, `<option value="htl" selected>`);    
        } else if (filterresultsby == "rel") {
            taydennetty = taydennetty.replace(`<option value="rel">`, `<option value="rel" selected>`);        
        } else if (filterresultsby == "newfirst") {
            taydennetty = taydennetty.replace(`<option value="newfirst">`, `<option value="newfirst" selected>`);
        } else if (filterresultsby == "oldfirst") {
            taydennetty = taydennetty.replace(`<option value="oldfirst">`, `<option value="oldfirst" selected>`);
        }
        
        
        

        sendThis(taydennetty = taydennetty.replace(`name="hakumaara" value="10"`, `name="hakumaara" value="${resultamount}"`));

        // LÄHETTÄJÄ
        function sendThis(params) {
            res.send(params);
        }

        }); //END SEARCH
    })



app.listen(process.env.PORT || port, () => { //Herokua varten. Heroku asettaa portin process.env.PORT:iin
    console.log(`Vakka app listening at http://localhost:${port}`)
    console.log(process.env.PORT ? `Herokun antama portti ${process.env.PORT}` : ``);
  })  