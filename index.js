// Importa modulele necesare pentru server
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8080;
const sass = require('sass'); 
// Setează EJS ca motor de template pentru randarea paginilor
app.set('view engine', 'ejs');

// Afiseaza caile importante pentru debugging
console.log("Cale fisier (__filename):", __filename);
console.log("Cale director (__dirname):", __dirname);
console.log("CWD (process.cwd()):", process.cwd());

// Creeaza directoarele necesare dacă nu exista
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate", "resurse/scss", "resurse/css", "backup/resurse/css"];
for (let folder of vect_foldere) {
    let folderPath = path.join(__dirname, folder);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
}


global.folderScss = path.join(__dirname, "resurse", "scss");
global.folderCss = path.join(__dirname, "resurse", "css");

function compileazaScss(caleScss, caleCss) {
    let caleIn = path.isAbsolute(caleScss) ? caleScss : path.join(global.folderScss, caleScss);
    let caleOut = caleCss;
    
    if (!caleOut) {
        
        let numeFisierFaraExtensie = path.basename(caleIn, path.extname(caleIn));
        caleOut = path.join(global.folderCss, numeFisierFaraExtensie + ".css");
    } else {
        caleOut = path.isAbsolute(caleCss) ? caleCss : path.join(global.folderCss, caleCss);
    }

    
    if (fs.existsSync(caleOut)) {
        let folderBackupSubcale = path.join(__dirname, "backup", "resurse", "css");
        if (!fs.existsSync(folderBackupSubcale)) {
            fs.mkdirSync(folderBackupSubcale, { recursive: true });
        }
        
        let numeCss = path.basename(caleOut);
        
        let numeBackup = numeCss.replace(".css", `_${Date.now()}.css`);
        let caleBackupAbs = path.join(folderBackupSubcale, numeBackup);
        
        try {
            fs.copyFileSync(caleOut, caleBackupAbs);
        } catch (err) {
            console.error(`[Backup CSS] Eroare la copiere:`, err.message);
        }
    }

    
    try {
        
        const rezCompilare = sass.compile(caleIn, { quietDeps: true });
        fs.writeFileSync(caleOut, rezCompilare.css);
        console.log(`[SCSS] Compilat: ${path.basename(caleIn)} -> ${path.basename(caleOut)}`);
    } catch (err) {
        console.error(`[SCSS] Eroare la compilarea fișierului ${path.basename(caleIn)}:`, err.message);
    }
}

if (fs.existsSync(global.folderScss)) {
    fs.readdirSync(global.folderScss).forEach(file => {
        if (file.endsWith('.scss') && file !== 'galerie_animata.scss') {
            compileazaScss(file);
        }
    });
}


fs.watch(global.folderScss, (eventType, filename) => {
    if (filename && filename.endsWith('.scss') && filename !== 'galerie_animata.scss') {
        let caleFisier = path.join(global.folderScss, filename);
        if (fs.existsSync(caleFisier)) {
            compileazaScss(filename);
        }
    }
});

global.obGlobal = { obErori: null };

// Functie care initializeaza datele de erori din fisierul JSON
function initErori() {
    let caleJson = path.join(__dirname, 'erori.json');
    if (!fs.existsSync(caleJson)) {
        console.error("Eroare: Nu există fișierul erori.json!");
        process.exit(1);
    }

    let textJson = fs.readFileSync(caleJson, 'utf8');

    // Valideaza ca nu sunt duplicate de proprietate 'titlu' în JSON
    let blocuriObiecte = textJson.split('}');
    blocuriObiecte.forEach(bucata => {
        let potriviriTitlu = bucata.match(/"titlu"\s*:/g);
        if (potriviriTitlu && potriviriTitlu.length > 1) {
            console.error("Eroare (Bonus): Proprietatea 'titlu' apare de mai multe ori!");
        }
    });

    let jsonErori = JSON.parse(textJson);

    // Verifica existenta proprietatilor de baza în JSON
    if (!jsonErori.info_erori || !jsonErori.cale_baza || !jsonErori.eroare_default) {
        console.error("Eroare: Lipsesc proprietăți de bază!");
        process.exit(1);
    }

    // Verifica ca eroarea default are toate campurile necesare
    if (!jsonErori.eroare_default.titlu || !jsonErori.eroare_default.text || !jsonErori.eroare_default.imagine) {
        console.error("Eroare: Erorii default îi lipsesc sub-proprietăți!");
        process.exit(1);
    }

    // Creeaza calea absoluta catre folderul de baza și verifica dacă exista
    let caleBazaAbsoluta = path.join(__dirname, jsonErori.cale_baza);
    if (!fs.existsSync(caleBazaAbsoluta)) {
        console.error(`Eroare: Folderul ${caleBazaAbsoluta} nu există!`);
        fs.mkdirSync(caleBazaAbsoluta, { recursive: true });
    }

    // Construieste calea absoluta către imaginea erorii default
    jsonErori.eroare_default.imagine = path.join(caleBazaAbsoluta, jsonErori.eroare_default.imagine);

    // Verifica și marcheaza ID-uri duplicate în lista de erori
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

// Functie care randeaza o pagina de eroare cu detaliile specifice
function afisareEroare(res, identificator, titlu, text, imagine) {
    // Cauta eroarea în lista de erori sau foloseste eroarea default
    let errGasita = global.obGlobal.obErori.info_erori.find(e => e.identificator == identificator);
    let dateEroare = errGasita || global.obGlobal.obErori.eroare_default;

    // Foloseste valorile transmise sau cele din baza de date
    let titluFinal = titlu || dateEroare.titlu;
    let textFinal = text || dateEroare.text;

    // Extrage doar numele fisierului din cale (nu și directoarele)
    let numeFisier = dateEroare.imagine.split('\\').pop().split('/').pop();

    // Construieste calea spre imaginea erorii
    let caleaSprePoza = imagine || `/resurse/imagini/erori/${numeFisier}`;

    // Seteaza codul HTTP de status al răspunsului
    res.status((errGasita && errGasita.status && identificator) ? identificator : 500);

    // Randeaza template-ul pentru pagina de eroare si trimite raspunsul
    res.render('pagini/eroare', {
        titlu: titluFinal,
        text: textFinal,
        imagine: caleaSprePoza,
        ip: res.req.ip
    });
}

// Serveste fisiere statice din directorul 'resurse' (imagini, CSS, JS, etc)
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// Ruta pentru favicon - serveste iconul paginii
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'resurse/imagini/favicon/favicon.ico')));

app.get('/galerie', (req, res) => {
    let jsonCale = path.join(__dirname, 'resurse', 'imagini', 'galerie' ,'galerie.json');
    let date = JSON.parse(fs.readFileSync(jsonCale, 'utf8'));
    res.render('pagini/galerie-statica', { imagini: date.imagini, cale_galerie: date.cale_galerie, ip: req.ip });
});

app.get('/galerie-animata', (req, res) => {
    let jsonCale = path.join(__dirname, 'resurse','imagini', 'galerie' ,'galerie.json');
    let date = JSON.parse(fs.readFileSync(jsonCale, 'utf8'));
    let imaginiAnimate = date.imagini.filter(img => img['galerie-animata'] === true);
    res.render('pagini/galerie-dinamica', { imagini: imaginiAnimate, cale_galerie: date.cale_galerie, ip: req.ip });
});
// Blocheaza accesul la directoare - previne listarea fisierelor din folder
app.get(/^\/resurse\/[a-zA-Z0-9_-]+\/$/, (req, res) => afisareEroare(res, 403));
// Blocheaza accesul direct la fisierele .ejs (template-uri)
app.get(/\.ejs$/, (req, res) => afisareEroare(res, 400));

// Ruta pentru pagina de start (/)
app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', { ip: req.ip });
});
 
// Ruta dinamica - renderizeaza orice pagină din directorul views/pagini
app.get('/:pagina', (req, res, next) => {
    let paginaCere = req.params.pagina;
    // Daca cererea contine punct, o paseaza mai departe (nu e o pagina valida)
    if (paginaCere.includes('.')) {
        return next();
    }

    // Incerca sa randeze template-ul EJS pentru pagina solicitata
    res.render('pagini/' + paginaCere, { ip: req.ip }, function(err, html) {
        if (err) return err.message.startsWith("Failed to lookup view") ? afisareEroare(res, 404) : afisareEroare(res, null, "Eroare Server", err.message);
        res.send(html);
    });
});

// Ruta catch-all - pentru cererile care nu au putut fi procesate (404)
app.use((req, res) => afisareEroare(res, 404));

// Porneste serverul pe portul specificat
app.listen(PORT, () => console.log(`Serverul rulează la: http://localhost:${PORT}`));