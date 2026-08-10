window.addEventListener('DOMContentLoaded', function() {

    /// 1. SISTEMUL DE PAGINARE
    let currentPage = 1;
    const K = 6; // Numarul produselor pe pagina
    let currentProducts = [];

    function renderPagination() {
        let N = currentProducts.length;
        let NRL = Math.ceil(N / K);
        
        if (currentPage > NRL) currentPage = 1;
        if (currentPage === 0 && NRL > 0) currentPage = 1;
        
        let toateProdusele = document.getElementsByClassName("produs");
        for (let prod of toateProdusele) {
            prod.style.display = "none";
        }
        
        let container = document.getElementById("pagination-container");
        if (container) container.innerHTML = "";
        
        let infoAfisate = document.getElementById("info-afisate");
        if (infoAfisate) infoAfisate.innerHTML = `Echipamente afișate: ${N}`;

        let msgExist = document.getElementById("msg-lipsa");
        if (N === 0) {
            if(!msgExist) {
                document.getElementById("grid-produse").insertAdjacentHTML('beforebegin', '<div id="msg-lipsa" class="alert alert-danger text-center mt-3">Nu s-a găsit niciun echipament conform filtrelor.</div>');
            }
            return;
        } else {
            if(msgExist) msgExist.remove();
        }
        
        let startIndex = (currentPage - 1) * K;
        let endIndex = startIndex + K - 1;
        
        for (let i = startIndex; i <= endIndex && i < N; i++) {
            currentProducts[i].style.display = ""; 
        }
        
        if (container && NRL > 1) {
            for (let i = 1; i <= NRL; i++) {
                let btn = document.createElement("button");
                btn.className = "btn " + (i === currentPage ? "btn-primary shadow" : "btn-outline-primary");
                btn.innerHTML = i;
                btn.onclick = function() {
                    currentPage = i;
                    renderPagination();
                    document.getElementById("filtre").scrollIntoView({ behavior: 'smooth', block: 'start' });
                };
                container.appendChild(btn);
            }
        }
    }

    /// 2. VALIDAREA INPUTURILOR
    function valideazaInputuri() {
        let isValid = true;
        let mesajEroare = [];

        let inpDescriere = document.getElementById("inp-descriere");
        if (inpDescriere && /\d/.test(inpDescriere.value)) {
            isValid = false;
            mesajEroare.push("Descrierea nu are voie să conțină cifre!");
            inpDescriere.classList.add("is-invalid");
        } else if (inpDescriere) {
            inpDescriere.classList.remove("is-invalid");
        }

        if (!isValid) { 
            alert(mesajEroare.join("\n")); 
        }
        return isValid;
    }

    /// 3. INITIALIZARE RANGE PRET
    let maxPret = 1500; 
    let valPretElements = document.getElementsByClassName("val-pret");
    if (valPretElements.length > 0) {
        let preturi = Array.from(valPretElements).map(el => parseFloat(el.textContent));
        maxPret = Math.max(...preturi);
    }
    
    let inpPret = document.getElementById("inp-pret");
    let infoRange = document.getElementById("infoRange");
    
    if(inpPret) {
        inpPret.max = maxPret;
        inpPret.value = maxPret;
        if(infoRange) infoRange.textContent = maxPret;
        
        inpPret.oninput = function() {
            if(infoRange) infoRange.textContent = this.value;
        };
    }

    /// 4. LOGICA SESIUNI (Pin, Hide, Delete) PRIN EVENT DELEGATION
    let gridProduse = document.getElementById("grid-produse");
    if (gridProduse) {
        gridProduse.addEventListener("click", function(e) {
            
            // Logica PIN
            let btnPin = e.target.closest(".btn-pin");
            if (btnPin) {
                let article = btnPin.closest(".produs");
                article.classList.toggle("pinned");
                if (article.classList.contains("pinned")) {
                    btnPin.classList.replace("btn-outline-success", "btn-success");
                    article.querySelector(".card").style.boxShadow = "0 0 10px 3px rgba(40, 167, 69, 0.5)";
                    article.querySelector(".card").style.border = "2px solid #28a745";
                } else {
                    btnPin.classList.replace("btn-success", "btn-outline-success");
                    article.querySelector(".card").style.boxShadow = "";
                    article.querySelector(".card").style.border = "1px solid var(--color-border, #ddd)";
                }
            }

            // Logica HIDE
            let btnHide = e.target.closest(".btn-hide-temp");
            if (btnHide) {
                let article = btnHide.closest(".produs");
                article.style.display = "none";
                currentProducts = currentProducts.filter(p => p !== article);
                renderPagination();
            }

            // Logica DELETE SESSION
            let btnDelete = e.target.closest(".btn-delete-session");
            if (btnDelete) {
                let article = btnDelete.closest(".produs");
                let id = article.id.split("_")[1]; 
                
                let deletedIds = sessionStorage.getItem("deletedProducts");
                deletedIds = deletedIds ? JSON.parse(deletedIds) : [];
                if (!deletedIds.includes(id)) {
                    deletedIds.push(id);
                    sessionStorage.setItem("deletedProducts", JSON.stringify(deletedIds));
                }
                
                article.style.display = "none";
                currentProducts = currentProducts.filter(p => p !== article);
                renderPagination();
            }
        });
    }

    function eliminaDiacritice(text) {
        if (!text) return "";
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    /// 5. FILTRAREA CLIENT (Bonus 4)
    function filtreazaProduse(){
        if (!valideazaInputuri()) return;

        let inpText = eliminaDiacritice((document.getElementById("inp-text")?.value || "").trim().toLowerCase());
        let valPretMax = inpPret ? parseFloat(inpPret.value) : 999999;
        let inpDatalist = eliminaDiacritice((document.getElementById("inp-datalist")?.value || "").trim().toLowerCase());
        let inpDescriere = eliminaDiacritice((document.getElementById("inp-descriere")?.value || "").trim().toLowerCase());

        let grupRadio = document.getElementsByName("gr_rad");
        let valRadio = "toate";
        for (let rad of grupRadio){
            if (rad.checked) { valRadio = rad.value.toLowerCase(); break; }
        }

        let checkboxuri = document.querySelectorAll('.chk-subcategorie:checked');
        let valoriCheckbox = Array.from(checkboxuri).map(cb => eliminaDiacritice(cb.value.toLowerCase()));

        let selectGreutate = document.getElementById("inp-categorie"); 
        let valGreutateMax = (selectGreutate && selectGreutate.value !== "toate") ? parseInt(selectGreutate.value) : 999999;

        let selectMateriale = document.getElementById("inp-materiale"); 
        let culoriExcluse = selectMateriale ? Array.from(selectMateriale.selectedOptions).map(opt => opt.value.toLowerCase()) : [];

        let produse = document.getElementsByClassName("produs");
        let produseFiltrate = [];

        let deletedIds = sessionStorage.getItem("deletedProducts");
        deletedIds = deletedIds ? JSON.parse(deletedIds) : [];

        for(let produs of produse) {
            produs.style.display = "none";

            let idProdus = produs.id.split("_")[1];
            if (deletedIds.includes(idProdus)) continue;

            if (produs.classList.contains("pinned")) {
                produseFiltrate.push(produs);
                continue;
            }
            
            let valCuloare = produs.getElementsByClassName("val-materiale")[0];
            let culoriStr = valCuloare ? eliminaDiacritice(valCuloare.textContent.trim().toLowerCase()) : "";
            let culoriArray = culoriStr.split(/[\s,]+/).filter(x => x !== "");
            
            let valNume = produs.getElementsByClassName("val-nume")[0];
            let nume = valNume ? eliminaDiacritice(valNume.textContent.trim().toLowerCase()) : "";
            
            let valPretElement = produs.getElementsByClassName("val-pret")[0];
            let pret = valPretElement ? parseFloat(valPretElement.textContent.trim()) : 0;
            
            let valTeren = produs.getElementsByClassName("val-tip_produs")[0];
            let teren = valTeren ? eliminaDiacritice(valTeren.textContent.trim().toLowerCase()) : "";
            
            let valDesc = produs.getElementsByClassName("val-descriere")[0];
            let descriere = valDesc ? eliminaDiacritice(valDesc.textContent.trim().toLowerCase()) : "";
            
            let valSubcat = produs.getElementsByClassName("val-subcategorie")[0];
            let subcat = valSubcat ? eliminaDiacritice(valSubcat.textContent.trim().toLowerCase()) : "";
            
            let valGreutateElem = produs.getElementsByClassName("val-masa")[0];
            let greutate = valGreutateElem ? parseInt(valGreutateElem.textContent.trim()) : 0;

            let cond1 = inpText === "" || culoriArray.some(c => c.includes(inpText)) || nume.includes(inpText);
            let cond2 = pret <= valPretMax;
            let cond3 = inpDatalist === "" || inpDatalist === "orice" || teren === "orice" || teren.includes(inpDatalist);
            let cond4 = inpDescriere === "" || descriere.includes(inpDescriere);
            let cond5 = valRadio === "toate" || produs.classList.contains(valRadio);
            let cond6 = valoriCheckbox.length === 0 || valoriCheckbox.includes(subcat);
            let cond7 = greutate <= valGreutateMax;
            
            let cond8 = true; 
            if (culoriExcluse.length > 0 && culoriExcluse.some(exclus => culoriArray.includes(exclus))) {
                cond8 = false;
            }

            if(cond1 && cond2 && cond3 && cond4 && cond5 && cond6 && cond7 && cond8){
                produseFiltrate.push(produs);
            }
        }
        
        currentProducts = produseFiltrate;
        currentPage = 1;
        renderPagination();
    }

    let btnFiltreaza = document.getElementById("btn-filtreaza");
    if(btnFiltreaza) btnFiltreaza.onclick = filtreazaProduse;
    
    // Ascultatori pentru filtrare automata
    let elementeFiltru = ["inp-text", "inp-pret", "inp-datalist", "inp-descriere", "inp-categorie", "inp-materiale"];
    elementeFiltru.forEach(id => {
        let el = document.getElementById(id);
        if(el) {
            el.addEventListener("input", filtreazaProduse);
            el.addEventListener("change", filtreazaProduse);
        }
    });
    document.querySelectorAll('.chk-subcategorie, input[name="gr_rad"]').forEach(el => {
        el.addEventListener("change", filtreazaProduse);
    });

    /// 6. RESETARE 
    let btnResetare = document.getElementById("resetare");
    if(btnResetare) {
        btnResetare.onclick = function() {
            if(confirm("Sunteți sigur că doriți să resetați toate filtrele și să anulați sortarea?")) {
                location.reload(); // Cea mai sigură metodă de resetare curată
            }
        };
    }

    /// 7. FETCH CĂTRE SERVER (Bonus 8 și 10b)
    const btnFetch = document.getElementById("btn-fetch-filtre");
    if (btnFetch) {
        btnFetch.addEventListener("click", async function() {
            let textValue = document.getElementById("inp-text")?.value.toLowerCase() || "";
            let pretValue = document.getElementById("inp-pret")?.value || "";
            
            let radioChecked = document.querySelector('input[name="gr_rad"]:checked');
            let catValue = radioChecked ? radioChecked.value : "toate";

            let sort1 = document.getElementById("sort-key-1").value;
            let sort2 = document.getElementById("sort-key-2").value;
            let sortDir = document.getElementById("sort-dir").value;

            let payload = {
                text: textValue,
                pretMax: pretValue,
                categorie: catValue,
                sortKey1: sort1,
                sortKey2: sort2,
                sortDir: sortDir
            };

            btnFetch.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Se procesează...`;
            btnFetch.disabled = true;

            try {
                let response = await fetch('/produse/filtrare', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                let fragmentHTML = await response.text();
                
                // Injectăm noul HTML
                let grid = document.getElementById("grid-produse");
                grid.innerHTML = fragmentHTML;

                // Re-calculăm produsele curente pentru paginare
                currentProducts = Array.from(grid.getElementsByClassName("produs"));
                currentPage = 1;
                renderPagination();

            } catch(e) {
                console.error("Eroare la Fetch:", e);
                alert("Nu am putut filtra produsele pe server!");
            } finally {
                btnFetch.innerHTML = `<i class="bi bi-cloud-arrow-up"></i> Aplică (Fetch)`;
                btnFetch.disabled = false;
            }
        });
    }

    /// 8. CALCULARE SUMA
    let btnCalcul = document.getElementById("btn-calculeaza");
    if(btnCalcul) {
        btnCalcul.onclick = function() {
            if (!valideazaInputuri()) return;

            let suma = 0;
            let nr = 0;
            for(let prod of currentProducts) {
                let pret = parseFloat(prod.querySelector(".val-pret").textContent);
                if(!isNaN(pret)){
                    suma += pret;
                    nr++;
                }
            }

            let vechi = document.getElementById("infoSumaFix");
            if(vechi) vechi.remove();

            let div = document.createElement("div");
            div.id = "infoSumaFix";
            div.className = "alert alert-success position-fixed top-50 start-50 translate-middle shadow-lg z-3 text-center border-success";
            div.innerHTML = `<h4><i class="bi bi-calculator"></i> Statistici</h4><p class="mb-0">Valoarea celor <b>${nr}</b> produse afișate este:<br><b class="fs-4">${suma.toFixed(2)} Lei</b></p>`;
            document.body.appendChild(div);

            setTimeout(function(){
                let d = document.getElementById("infoSumaFix");
                if(d) d.remove();
            }, 2000);
        };
    }

    // Initializare pe prima pagina
    filtreazaProduse();
});