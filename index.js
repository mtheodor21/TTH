const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const PORT = 8080;
const sass = require('sass');
const AccesBD = require('./AccesBD');
const db = AccesBD.getInstanta(); 


console.log("Cale fisier (__filename):", __filename);
console.log("Cale director (__dirname):", __dirname);
console.log("CWD (process.cwd()):", process.cwd());

const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate", "resurse/scss", "resurse/css", "backup/resurse/css"];
for (let folder of vect_foldere) {
    let folderPath = path.join(__dirname, folder);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
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

// CERINȚĂ: Transmiterea dinamică a categoriilor pentru meniu pe TOATE paginile site-ului
app.use((req, res, next) => {
    try {
        let produseCompletes = JSON.parse(fs.readFileSync(path.join(__dirname, 'produse.json'), 'utf8'));
        let arrayProduse = Array.isArray(produseCompletes) ? produseCompletes : (produseCompletes.produse || []);
        res.locals.categorii_meniu = [...new Set(arrayProduse.map(p => p.categorie))];
    } catch (e) {
        res.locals.categorii_meniu = [];
    }
    next();
});

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
    res.render('pagini/index.ejs', { ip: req.ip });
});

const getProduse = () => {
    let raw = fs.readFileSync(path.join(__dirname, 'produse.json'), 'utf8');
    let parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.produse || []);
};

app.get('/produse', async function(req, res) {
    try {
        // Cerem toate produsele din baza de date
        let rezultat = await db.selectAsync({
            tabel: "produse",
            campuri: ["*"] 
        });

        // Verificăm dacă s-a returnat ceva
        let listaProduse = rezultat ? rezultat.rows : [];

        // ====================================================
        // BONUS 14: CEL MAI IEFTIN PRODUS DIN FIECARE CATEGORIE
        // ====================================================
        if (listaProduse.length > 0) {
            let minimPerCategorie = {};
            
            // 1. Aflăm care este prețul minim pentru fiecare categorie în parte
            listaProduse.forEach(p => {
                let cat = p.categorie;
                let pret = Number(p.pret);
                // Dacă nu am mai întâlnit categoria, sau prețul curent e mai mic, îl salvăm
                if (minimPerCategorie[cat] === undefined || pret < minimPerCategorie[cat]) {
                    minimPerCategorie[cat] = pret;
                }
            });

            // 2. Parcurgem din nou și marcăm produsele care au acest preț minim
            listaProduse.forEach(p => {
                if (Number(p.pret) === minimPerCategorie[p.categorie]) {
                    p.esteCelMaiIeftin = true;
                }
            });
        }
        // ====================================================

        // --- EXTRAGERE DATE DINAMICE PENTRU BONUS 1 (8 TIPURI DE INPUT) ---
        let dateFiltre = {};
        
        if (listaProduse.length > 0) {
            // 1. Preț Minim și Maxim (pentru Range)
            dateFiltre.pretMin = Math.floor(Math.min(...listaProduse.map(p => Number(p.pret))));
            dateFiltre.pretMax = Math.ceil(Math.max(...listaProduse.map(p => Number(p.pret))));

            // 2. Greutate Maximă (pentru Select Simplu)
            dateFiltre.greutateMax = Math.ceil(Math.max(...listaProduse.map(p => Number(p.greutate))));

            // 3. Tipuri unice de teren (pentru Datalist)
            dateFiltre.terenuri = [...new Set(listaProduse.map(p => p.tip_teren))].filter(Boolean);

            // 4. Categorii unice (pentru Radio Buttons)
            dateFiltre.categorii = [...new Set(listaProduse.map(p => p.categorie))].filter(Boolean);

            // 5. Subcategorii unice (pentru Checkbox-uri)
            dateFiltre.subcategorii = [...new Set(listaProduse.map(p => p.subcategorie))].filter(Boolean);

            // 6. Culori unice din array (pentru Select Multiplu)
            dateFiltre.culori = [...new Set(listaProduse.flatMap(p => p.culori))].filter(Boolean);

            // 7 & 8. Generare exemple pentru placeholder (Input Text și Textarea)
            // Luăm un cuvânt dintr-un produs existent pentru a face placeholder-ul realist
            dateFiltre.exempluNume = (listaProduse[0].nume.split(" ")[1] || "minge").toLowerCase(); 
            dateFiltre.exempluCuloare = dateFiltre.culori[0] || "rosu";
            dateFiltre.exempluDescriere = (listaProduse[0].descriere.split(" ")[0] || "echipament").toLowerCase();
        }

        // Randăm fișierul views/pagini/produse.ejs și îi trimitem atât produsele, CÂT ȘI filtrele
        res.render('pagini/produse', { 
            produse: listaProduse, 
            filtre: dateFiltre 
        }); 

    } catch (err) {
        console.error("Eroare la extragerea produselor:", err);
        // În caz de eroare, trimitem array gol și un obiect gol pentru filtre ca să nu pice EJS-ul
        res.render('pagini/produse', { produse: [], filtre: {} }); 
    }
});
// ==========================================================
// RUTA BONUS 10a: Filtrare și Sortare Server-Side (POST)
// ==========================================================
app.post('/produse/filtrare', async (req, res) => {
    try {
        let conditii = req.body || {} ;
        
        console.log("✅ Date primite de la Fetch:", conditii);
        
        let rez = await db.selectAsync({ tabel: "produse", campuri: ["*"] });
        let produse = rez ? rez.rows : [];

        // 1. FILTRARE
        let filtrate = produse.filter(p => {
            let pass = true;
            if (conditii.text) {
                if (!p.nume.toLowerCase().includes(conditii.text)) pass = false;
            }
            if (conditii.pretMax && Number(p.pret) > Number(conditii.pretMax)) pass = false;
            if (conditii.categorie && conditii.categorie !== "toate" && p.categorie !== conditii.categorie) pass = false;
            return pass;
        });

        // 2. SORTARE (2 Chei)
        let k1 = conditii.sortKey1 || "pret";
        let k2 = conditii.sortKey2 || "nume";
        let dir = Number(conditii.sortDir) || 1; 

        filtrate.sort((a, b) => {
            let valA1 = a[k1], valB1 = b[k1];
            let valA2 = a[k2], valB2 = b[k2];
            
            if (!isNaN(valA1)) valA1 = Number(valA1);
            if (!isNaN(valB1)) valB1 = Number(valB1);
            if (!isNaN(valA2)) valA2 = Number(valA2);
            if (!isNaN(valB2)) valB2 = Number(valB2);

            if (valA1 !== valB1) {
                return valA1 > valB1 ? dir : -dir;
            } else {
                return valA2 > valB2 ? dir : -dir;
            }
        });

        // 3. Returnăm Doar Fragmentul
        res.render('fragmente/grid_produse', { produse: filtrate });

    } catch (err) {
        console.error("Eroare Filtrare Server:", err);
        res.status(500).send("<div class='alert alert-danger'>Eroare internă de server.</div>");
    }
});
// ==========================================================
// RUTA: PAGINA UNUI SINGUR PRODUS (cu Bonus 16 și Bonus 17)
// ==========================================================
app.get('/produs/:id', async (req, res) => {
    try {
        let idProdusCurent = req.params.id;
        
        let rezProduse = await db.selectAsync({ tabel: "produse", campuri: ["*"] });
        let rezSeturi = await db.selectAsync({ tabel: "seturi", campuri: ["*"] });
        let rezAsocieri = await db.selectAsync({ tabel: "asociere_set", campuri: ["*"] });

        let produse = rezProduse ? rezProduse.rows : [];
        let seturi = rezSeturi ? rezSeturi.rows : [];
        let asocieri = rezAsocieri ? rezAsocieri.rows : [];

        // Folosim == in loc de ===
        let produs = produse.find(p => p.id == idProdusCurent);

        if(!produs) {
            return res.status(404).render('pagini/eroare', { titlu: "Eroare 404", text: "Produsul nu a fost găsit.", imagine: "/resurse/imagini/erori/default.png" });
        }
        
        // BONUS 16: Produse similare
        let similare = produse.filter(p => p.categorie == produs.categorie && p.id != idProdusCurent).slice(0, 3);
        
        // BONUS 17: Găsim seturile din care face parte produsul
        let idSeturiPentruProdus = asocieri.filter(a => a.id_produs == idProdusCurent).map(a => a.id_set);
        
        let seturiProdus = seturi.filter(s => idSeturiPentruProdus.includes(s.id)).map(set => {
            // Folosim == in loc de ===
            let idProduseDinAcestSet = asocieri.filter(a => a.id_set == set.id).map(a => a.id_produs);
            let produseInSet = idProduseDinAcestSet.map(idProd => produse.find(p => p.id == idProd)).filter(Boolean);
            
            let n = produseInSet.length;
            let sumaPreturi = produseInSet.reduce((sum, p) => sum + parseFloat(p.pret), 0);
            
            let procentReducere = Math.min(5, n) * 0.05; 
            let pretFinal = sumaPreturi - (sumaPreturi * procentReducere);

            return {
                ...set,
                produse: produseInSet,
                pretInitial: sumaPreturi,
                pretFinal: pretFinal,
                reducere: procentReducere * 100
            };
        });

        res.render('pagini/produs', { produs: produs, similare: similare, seturiProdus: seturiProdus });
    } catch (err) {
        console.error("Eroare la ruta /produs/:id :", err.message);
        res.render('pagini/eroare', { titlu: "Eroare 500", text: "Eroare internă de server.", imagine: "" });
    }
});

// ==========================================================
// RUTA: TOATE SETURILE (Bonus 17)
// ==========================================================
app.get('/seturi', async (req, res) => {
    try {
        let rezProduse = await db.selectAsync({ tabel: "produse", campuri: ["*"] });
        let rezSeturi = await db.selectAsync({ tabel: "seturi", campuri: ["*"] });
        let rezAsocieri = await db.selectAsync({ tabel: "asociere_set", campuri: ["*"] });

        let produse = rezProduse ? rezProduse.rows : [];
        let seturi = rezSeturi ? rezSeturi.rows : [];
        let asocieri = rezAsocieri ? rezAsocieri.rows : [];

        let seturiCuDetalii = seturi.map(set => {
            // Folosim == in loc de ===
            let idProduseDinSet = asocieri.filter(a => a.id_set == set.id).map(a => a.id_produs);
            let produseInSet = idProduseDinSet.map(idProd => produse.find(p => p.id == idProd)).filter(Boolean);

            let n = produseInSet.length;
            let sumaPreturi = produseInSet.reduce((sum, p) => sum + parseFloat(p.pret), 0);
            
            let procentReducere = Math.min(5, n) * 0.05;
            let pretFinal = sumaPreturi - (sumaPreturi * procentReducere);

            return {
                ...set,
                produse: produseInSet,
                pretInitial: sumaPreturi,
                pretFinal: pretFinal,
                reducere: procentReducere * 100
            };
        }).filter(set => set.produse.length >= 2); 

        res.render('pagini/seturi', { seturi: seturiCuDetalii });
    } catch (err) {
        console.error("Eroare la ruta /seturi:", err.message);
        res.render('pagini/seturi', { seturi: [] });
    }
});

app.get('/compara', (req, res) => {
    let produse = getProduse();
    let p1 = produse.find(p => p.id == req.query.id1);
    let p2 = produse.find(p => p.id == req.query.id2);
    res.render('pagini/compara', { p1, p2 });
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


// bonus 13- stergere backup
const BACKUP_FOLDER = path.join(__dirname, 'backup');
const TIMP_EXPIRARE_MINUTE = 2; // T = 2 minute (pentru demonstrația la prof)
const INTERVAL_VERIFICARE_MS = 10000; // Verifică o dată la 10 secunde

setInterval(() => {
    if (fs.existsSync(BACKUP_FOLDER)) {
        fs.readdir(BACKUP_FOLDER, (err, files) => {
            if (err) return;
            let now = Date.now();
            
            files.forEach(file => {
                let filePath = path.join(BACKUP_FOLDER, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    
                    // Verificăm dacă e fișier și dacă a depășit T minute
                    let diferentaMinute = (now - stats.mtime.getTime()) / 60000;
                    
                    if (diferentaMinute > TIMP_EXPIRARE_MINUTE && fs.lstatSync(filePath).isFile()) {
                        fs.unlink(filePath, () => console.log(`[Bonus 13] Backup vechi șters automat: ${file}`));
                    }
                });
            });
        });
    }
}, INTERVAL_VERIFICARE_MS);

app.listen(PORT, () => console.log(`Serverul rulează la: http://localhost:${PORT}`));