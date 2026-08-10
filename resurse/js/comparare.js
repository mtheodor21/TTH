document.addEventListener("DOMContentLoaded", function() {
    const CHEIE_STORAGE = "produseComparare";
    const CHEIE_TIMP = "timpComparare";
    const TIMP_O_ZI_MS = 24 * 60 * 60 * 1000; 

    let produse = JSON.parse(localStorage.getItem(CHEIE_STORAGE)) || [];
    let ultimulTimp = localStorage.getItem(CHEIE_TIMP);

    if (ultimulTimp && (Date.now() - parseInt(ultimulTimp)) > TIMP_O_ZI_MS) {
        produse = []; 
        localStorage.removeItem(CHEIE_STORAGE);
        localStorage.removeItem(CHEIE_TIMP);
    }

    const container = document.getElementById("container-comparare");
    const listaHtml = document.getElementById("lista-comparare");
    const btnAfiseaza = document.getElementById("btn-afiseaza-comparare");
    const butoaneCompara = document.querySelectorAll(".btn-compara");

    // ====================================================================
    // CERINȚA 0.2p: Tooltip-ul custom care apare în dreptul cursorului
    // ====================================================================
    const tooltip = document.createElement("div");
    tooltip.id = "tooltip-comparare";
    tooltip.textContent = "ștergeți un produs din lista de comparare";
    tooltip.style.position = "absolute";
    tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.85)";
    tooltip.style.color = "white";
    tooltip.style.padding = "6px 12px";
    tooltip.style.borderRadius = "4px";
    tooltip.style.fontSize = "13px";
    tooltip.style.pointerEvents = "none"; // Să nu blocheze click-urile dedesubt
    tooltip.style.zIndex = "9999";
    tooltip.style.display = "none";
    document.body.appendChild(tooltip);

    // Urmărim mișcarea mouse-ului pe document
    document.addEventListener("mousemove", function(e) {
        const btn = e.target.closest(".btn-compara");
        
        // Afișăm tooltip-ul doar pe butoanele dezactivate și doar când sunt deja 2 produse
        if (btn && btn.classList.contains("dezactivat-custom") && produse.length >= 2) {
            tooltip.style.display = "block";
            // +15px ca să apară exact în dreptul cursorului, nu fix sub el
            tooltip.style.left = (e.pageX + 15) + "px"; 
            tooltip.style.top = (e.pageY + 15) + "px";
        } else {
            tooltip.style.display = "none";
        }
    });
    // ====================================================================

    function salveazaSiRandeaza() {
        localStorage.setItem(CHEIE_STORAGE, JSON.stringify(produse));
        localStorage.setItem(CHEIE_TIMP, Date.now().toString()); 
        randeazaContainer();
    }

    function randeazaContainer() {
        if (produse.length === 0) {
            if(container) container.classList.add("d-none");
            if(btnAfiseaza) btnAfiseaza.classList.add("d-none");
        } else {
            if(container) container.classList.remove("d-none");
            if(listaHtml) {
                listaHtml.innerHTML = "";
                produse.forEach(p => {
                    listaHtml.innerHTML += `
                        <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light border rounded">
                            <span class="text-truncate fw-bold" style="max-width: 200px;" title="${p.nume}">${p.nume}</span>
                            <button class="btn btn-sm btn-danger btn-sterge-compara shadow-sm" data-id="${p.id}"><i class="bi bi-x-lg"></i></button>
                        </div>
                    `;
                });
            }

            if (btnAfiseaza) {
                if (produse.length === 2) {
                    btnAfiseaza.classList.remove("d-none");
                } else {
                    btnAfiseaza.classList.add("d-none");
                }
            }
        }
        actualizeazaButoane();
    }

    function actualizeazaButoane() {
        butoaneCompara.forEach(btn => {
            const id = btn.getAttribute("data-id");
            
            if (produse.length >= 2) {
                // Nu folosim disabled=true nativ, ci o clasă CSS
                btn.classList.add("dezactivat-custom"); 
                btn.style.opacity = "0.5";
                btn.style.cursor = "not-allowed";
            } else {
                btn.classList.remove("dezactivat-custom");
                btn.style.opacity = "1";
                btn.style.cursor = "pointer";
                
                // Dezactivăm vizual butonul dacă produsul e deja în listă
                if(produse.some(p => p.id == id)) {
                    btn.classList.add("dezactivat-custom"); 
                    btn.style.opacity = "0.5";
                    btn.style.cursor = "not-allowed";
                }
            }
        });
    }

    butoaneCompara.forEach(btn => {
        btn.addEventListener("click", function(e) {
            // Blocăm acțiunea dacă butonul e "dezactivat"
            if (this.classList.contains("dezactivat-custom")) {
                e.preventDefault();
                return;
            }

            if (produse.length < 2) {
                const id = this.getAttribute("data-id");
                const nume = this.getAttribute("data-nume");
                if (!produse.some(p => p.id == id)) {
                    produse.push({ id: id, nume: nume });
                    salveazaSiRandeaza();
                }
            }
        });
    });

    if(listaHtml) {
        listaHtml.addEventListener("click", function(e) {
            const btnSterge = e.target.closest(".btn-sterge-compara");
            if (btnSterge) {
                const id = btnSterge.getAttribute("data-id");
                produse = produse.filter(p => p.id != id); 
                salveazaSiRandeaza();
            }
        });
    }

    if (btnAfiseaza) {
        btnAfiseaza.addEventListener("click", function() {
            if (produse.length === 2) {
                window.open(`/compara?id1=${produse[0].id}&id2=${produse[1].id}`, '_blank');
            }
        });
    }

    if(container) {
        randeazaContainer();
    }
});