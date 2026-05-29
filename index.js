const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8080;
const sass = require('sass'); 
app.set('view engine', 'ejs');

console.log("Cale fisier (__filename):", __filename);
console.log("Cale director (__dirname):", __dirname);
console.log("CWD (process.cwd()):", process.cwd());

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
        
        const rezCompilare = sass.compile(caleIn, { 
    quietDeps: true,
    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function']
});
        let statScss = fs.statSync(caleIn);
        if (fs.existsSync(caleOut)) {
        let statCss = fs.statSync(caleOut);
        if (statScss.mtime < statCss.mtime) {
        console.log(`[SCSS] Fișierul ${path.basename(caleIn)} este deja la zi.`);
        return; 
    }
}
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

function initErori() {
    let caleJson = path.join(__dirname, 'erori.json');
    if (!fs.existsSync(caleJson)) {
        console.error("Eroare: Nu există fișierul erori.json!");
        process.exit(1);
    }

    let textJson = fs.readFileSync(caleJson, 'utf8');
    let blocuriObiecte = textJson.split('}');
    blocuriObiecte.forEach(bucata => {
        let potriviriTitlu = bucata.match(/"titlu"\s*:/g);
        if (potriviriTitlu && potriviriTitlu.length > 1) {
            console.error("Eroare: Proprietatea 'titlu' apare de mai multe ori!");
        }
    });

    let jsonErori = JSON.parse(textJson);
    if (!jsonErori.info_erori || !jsonErori.cale_baza || !jsonErori.eroare_default) {
        console.error("Eroare: Lipsesc proprietăți de bază!");
        process.exit(1);
    }
    if (!jsonErori.eroare_default.titlu || !jsonErori.eroare_default.text || !jsonErori.eroare_default.imagine) {
        console.error("Eroare: Erorii default îi lipsesc sub-proprietati!");
        process.exit(1);
    }
    let caleBazaAbsoluta = path.join(__dirname, jsonErori.cale_baza);
    if (!fs.existsSync(caleBazaAbsoluta)) {
        console.error(`Eroare: Folderul ${caleBazaAbsoluta} nu există!`);
        fs.mkdirSync(caleBazaAbsoluta, { recursive: true });
    }


    });
    global.obGlobal.obErori = jsonErori;
}
initErori();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let errGasita = global.obGlobal.obErori.info_erori.find(e => e.identificator == identificator);
    let dateEroare = errGasita || global.obGlobal.obErori.eroare_default;

   let titluFinal = titlu || dateEroare.titlu;
    let textFinal = text || dateEroare.text;

    let numeFisier = path.basename(dateEroare.imagine);
    let caleaSprePoza = imagine || `/resurse/imagini/erori/${numeFisier}`;
    res.status(errGasita?.status ? identificator : 500);

    res.render('pagini/eroare', {
        titlu: titluFinal,
        text: textFinal,
        imagine: caleaSprePoza,
        ip: res.req.ip
    });
}

app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'resurse/imagini/favicon/favicon.ico')));

app.get('/galerie', (req, res) => {
    let jsonCale = path.join(__dirname, 'resurse', 'imagini', 'galerie' ,'galerie.json');
    let date = JSON.parse(fs.readFileSync(jsonCale, 'utf8'));

    let timpCurent = new Date();
    let minuteCurente = timpCurent.getHours() * 60 + timpCurent.getMinutes();

    let imaginiFiltrate = date.imagini.filter(img => {
        
        let [start, end] = img.timp.split('-'); 
        
        let [startOra, startMin] = start.split(':').map(Number);
        let [endOra, endMin] = end.split(':').map(Number); 

        let minuteStart = startOra * 60 + startMin; 
        let minuteEnd = endOra * 60 + endMin;       
        return minuteCurente >= minuteStart && minuteCurente <= minuteEnd;
    });

    res.render('pagini/galerie-statica', { imagini: imaginiFiltrate, cale_galerie: date.cale_galerie, ip: req.ip });
});

app.get('/galerie-dinamica', (req, res) => {
    try {
        let jsonCale = path.join(__dirname, 'resurse', 'imagini', 'galerie', 'galerie.json');
        
        if (!fs.existsSync(jsonCale)) {
            return res.send(`<b>DIAGNOSTIC:</b> Fișierul JSON NU există la calea: <br><small>${jsonCale}</small>`);
        }

        let dateRaw = fs.readFileSync(jsonCale, 'utf8');
        let date = JSON.parse(dateRaw);
        
        let toateImaginile = date.imagini.filter(img => img['galerie-animata'] === true);
        
        const optiuni = [9, 12, 15];
        const nrImagini = optiuni[Math.floor(Math.random() * optiuni.length)];
        let imaginiAnimate = toateImaginile.slice(0, nrImagini);

        let caleScss = path.join(global.folderScss, 'galerie_animata.scss');
        let caleCss = path.join(global.folderCss, 'galerie_animata.css');
        if (fs.existsSync(caleScss)) {
            let continutScss = fs.readFileSync(caleScss, 'utf8');
            let scssInjectat = `$nr-imagini: ${imaginiAnimate.length};\n` + continutScss;
            
            try {
                const rezCompilare = sass.compileString(scssInjectat, { 
                    quietDeps: true,
                    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function']
                });
                fs.writeFileSync(caleCss, rezCompilare.css);
            } catch(scssErr) {
                return res.send(`<b>DIAGNOSTIC:</b> Eroare de sintaxă în fișierul galerie_animata.scss: <br><pre>${scssErr.message}</pre>`);
            }
        } else {
            return res.send(`<b>DIAGNOSTIC:</b> Fișierul SCSS obligatoriu NU există la calea: <br><small>${caleScss}</small>`);
        }

    
        res.render('pagini/galerie-dinamica', { 
            imagini: imaginiAnimate, 
            cale_galerie: date.cale_galerie, 
            ip: req.ip 
        });
    } catch (err) {
        return res.send(`<b>DIAGNOSTIC:</b> Eroare generală neprevăzută: <br><pre>${err.message}</pre>`);
    }
});

app.get(/^\/resurse\/[a-zA-Z0-9_-]+\/$/, (req, res) => afisareEroare(res, 403));

app.get(/\.ejs$/, (req, res) => afisareEroare(res, 400));


app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', { ip: req.ip });
});
 
app.get('/:pagina', (req, res, next) => {
    let paginaCere = req.params.pagina;
    if (paginaCere.includes('.')) {
        return next();
    }

    res.render('pagini/' + paginaCere, { ip: req.ip }, function(err, html) {
        if (err) return err.message.startsWith("Failed to lookup view") ? afisareEroare(res, 404) : afisareEroare(res, null, "Eroare Server", err.message);
        res.send(html);
    });
});
app.use((req, res) => afisareEroare(res, 404));
app.listen(PORT, () => console.log(`Serverul rulează la: http://localhost:${PORT}`));


