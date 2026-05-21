// Importă modulele necesare pentru server
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8080;

// Setează EJS ca motor de template pentru randarea paginilor
app.set('view engine', 'ejs');

// Afișează căile importante pentru debugging
console.log("Cale fisier (__filename):", __filename);
console.log("Cale director (__dirname):", __dirname);
console.log("CWD (process.cwd()):", process.cwd());

// Creează directoarele necesare dacă nu există
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let folder of vect_foldere) {
    let folderPath = path.join(__dirname, folder);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
}


// Obiect global care stochează informații despre erori
global.obGlobal = { obErori: null };

// Funcție care inițializează datele de erori din fișierul JSON
function initErori() {
    let caleJson = path.join(__dirname, 'erori.json');
    if (!fs.existsSync(caleJson)) {
        console.error("Eroare: Nu există fișierul erori.json!");
        process.exit(1);
    }

    let textJson = fs.readFileSync(caleJson, 'utf8');

    // Validează că nu sunt duplicate de proprietate 'titlu' în JSON
    let blocuriObiecte = textJson.split('}');
    blocuriObiecte.forEach(bucata => {
        let potriviriTitlu = bucata.match(/"titlu"\s*:/g);
        if (potriviriTitlu && potriviriTitlu.length > 1) {
            console.error("Eroare (Bonus): Proprietatea 'titlu' apare de mai multe ori!");
        }
    });

    let jsonErori = JSON.parse(textJson);

    // Verifică existența proprietăților de bază în JSON
    if (!jsonErori.info_erori || !jsonErori.cale_baza || !jsonErori.eroare_default) {
        console.error("Eroare: Lipsesc proprietăți de bază!");
        process.exit(1);
    }

    // Verifică că eroarea default are toate câmpurile necesare
    if (!jsonErori.eroare_default.titlu || !jsonErori.eroare_default.text || !jsonErori.eroare_default.imagine) {
        console.error("Eroare: Erorii default îi lipsesc sub-proprietăți!");
        process.exit(1);
    }

    // Creează calea absolută către folderul de bază și verifica dacă există
    let caleBazaAbsoluta = path.join(__dirname, jsonErori.cale_baza);
    if (!fs.existsSync(caleBazaAbsoluta)) {
        console.error(`Eroare: Folderul ${caleBazaAbsoluta} nu există!`);
        fs.mkdirSync(caleBazaAbsoluta, { recursive: true });
    }

    // Construiește calea absolută către imaginea erorii default
    jsonErori.eroare_default.imagine = path.join(caleBazaAbsoluta, jsonErori.eroare_default.imagine);

    // Verifică și marcează ID-uri duplicate în lista de erori
    let setIdent = new Set();
    jsonErori.info_erori.forEach(err => {
        if (setIdent.has(err.identificator)) {
            console.error(`Eroare (Bonus): ID duplicat [${err.identificator}]`);
        }
        setIdent.add(err.identificator);
        // Construiește calea absolută pentru imaginea fiecărei erori
        err.imagine = path.join(caleBazaAbsoluta, err.imagine);
    });

    // Stochează obiectul erorilor în global
    global.obGlobal.obErori = jsonErori;
}
initErori();

// Funcție care randează o pagină de eroare cu detaliile specifice
function afisareEroare(res, identificator, titlu, text, imagine) {
    // Caută eroarea în lista de erori sau folosește eroarea default
    let errGasita = global.obGlobal.obErori.info_erori.find(e => e.identificator == identificator);
    let dateEroare = errGasita || global.obGlobal.obErori.eroare_default;

    // Folosește valorile transmise sau cele din baza de date
    let titluFinal = titlu || dateEroare.titlu;
    let textFinal = text || dateEroare.text;

    // Extrage doar numele fișierului din cale (nu și directoarele)
    let numeFisier = dateEroare.imagine.split('\\').pop().split('/').pop();

    // Construiește calea spre imaginea erorii
    let caleaSprePoza = imagine || `/resurse/imagini/erori/${numeFisier}`;

    // Setează codul HTTP de status al răspunsului
    res.status((errGasita && errGasita.status && identificator) ? identificator : 500);

    // Randează template-ul pentru pagina de eroare și trimite răspunsul
    res.render('pagini/eroare', {
        titlu: titluFinal,
        text: textFinal,
        imagine: caleaSprePoza,
        ip: res.req.ip
    });
}

// Servește fișiere statice din directorul 'resurse' (imagini, CSS, JS, etc)
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// Ruta pentru favicon - servește iconul paginii
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'resurse/imagini/favicon/favicon.ico')));

// Blochează accesul la directoare - previne listarea fișierelor din folder
app.get(/^\/resurse\/[a-zA-Z0-9_-]+\/$/, (req, res) => afisareEroare(res, 403));
// Blochează accesul direct la fișierele .ejs (template-uri)
app.get(/\.ejs$/, (req, res) => afisareEroare(res, 400));

// Ruta pentru pagina de start (/)
app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', { ip: req.ip });
});

// Ruta dinamică - renderizează orice pagină din directorul views/pagini
app.get('/:pagina', (req, res, next) => {
    let paginaCere = req.params.pagina;
    // Dacă cererea conține punct, o pasează mai departe (nu e o pagină validă)
    if (paginaCere.includes('.')) {
        return next();
    }

    // Încercă să randeze template-ul EJS pentru pagina solicitată
    res.render('pagini/' + paginaCere, { ip: req.ip }, function(err, html) {
        if (err) return err.message.startsWith("Failed to lookup view") ? afisareEroare(res, 404) : afisareEroare(res, null, "Eroare Server", err.message);
        res.send(html);
    });
});

// Ruta catch-all - pentru cererile care nu au putut fi procesate (404)
app.use((req, res) => afisareEroare(res, 404));

// Pornește serverul pe portul specificat
app.listen(PORT, () => console.log(`Serverul rulează la: http://localhost:${PORT}`));