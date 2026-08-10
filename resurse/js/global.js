document.addEventListener("DOMContentLoaded", () => {
    // BONUS 2: Teme persistente în localStorage
    const themeSelect = document.getElementById("themeSelect");
    if(themeSelect) {
        let savedTheme = localStorage.getItem("tth_theme") || "light";
        document.body.setAttribute("data-theme", savedTheme);
        themeSelect.value = savedTheme;

        themeSelect.addEventListener("change", function() {
            document.body.setAttribute("data-theme", this.value);
            localStorage.setItem("tth_theme", this.value);
        });
    } else {
        document.body.setAttribute("data-theme", localStorage.getItem("tth_theme") || "light");
    }

    // BONUS 19: Logica pentru Orar Dropdown/Modal
    let btnOrar = document.getElementById("btn-show-orar");
    let containerOrar = document.getElementById("orar-container");
    if(btnOrar && containerOrar) {
        let data = new Date(), zi = data.getDay(), ora = data.getHours();
        
        let row = document.querySelector(`tr[data-zi="${zi}"]`);
        if(row) row.style.backgroundColor = "rgba(0, 123, 255, 0.3)";

        let statusDiv = document.getElementById("status-orar");
        let deschis = (zi >= 1 && zi <= 4 && ora >= 9 && ora < 18) || 
                      (zi === 5 && ora >= 9 && ora < 16) || 
                      (zi === 6 && ora >= 10 && ora < 14);
        
        statusDiv.innerHTML = deschis ? "Suntem DESCHISI!" : "Suntem ÎNCHIȘI!";
        statusDiv.classList.add(deschis ? "bg-success" : "bg-danger");

        btnOrar.onclick = () => containerOrar.classList.remove("d-none");
        document.getElementById("inchide-orar").onclick = () => containerOrar.classList.add("d-none");
    }

    // BONUS 20: Functionalitate de Comparare persistenta în tot site-ul
    window.listaComparare = JSON.parse(localStorage.getItem('comparare')) || [];
    let lastTime = localStorage.getItem('last_compare_time') || Date.now();
    if (Date.now() - lastTime > 86400000) { listaComparare = []; } // Reset la 1 zi

    window.randeazaComparare = function() {
        let box = document.getElementById("box-comparare");
        if(listaComparare.length === 0) {
            if(box) box.remove();
            document.querySelectorAll(".btn-compara").forEach(b => b.disabled = false);
            return;
        }

        if(!box) {
            box = document.createElement("div");
            box.id = "box-comparare";
            box.className = "position-fixed bottom-0 start-0 m-3 p-3 border shadow rounded z-3";
            box.style.backgroundColor = "var(--card-bg)";
            document.body.appendChild(box);
        }

        box.innerHTML = `<h6 class="border-bottom pb-2">Comparare Produse</h6>`;
        listaComparare.forEach(p => {
            box.innerHTML += `<div class="d-flex justify-content-between mb-2 small align-items-center">
                <span>${p.nume}</span>
                <button class="btn btn-sm btn-danger py-0 px-2 ms-3" onclick="stergeComparare(${p.id})">X</button>
            </div>`;
        });

        if(listaComparare.length === 2) {
            box.innerHTML += `<button class="btn btn-primary w-100 btn-sm mt-2" onclick="window.location.href='/compara?id1=${listaComparare[0].id}&id2=${listaComparare[1].id}'">Compară</button>`;
            document.querySelectorAll(".btn-compara").forEach(b => { b.disabled = true; });
        } else {
            document.querySelectorAll(".btn-compara").forEach(b => { b.disabled = false; });
        }
        localStorage.setItem('comparare', JSON.stringify(listaComparare));
        localStorage.setItem('last_compare_time', Date.now());
    };

    window.adaugaComparare = function(id, nume) {
        if(listaComparare.length < 2 && !listaComparare.find(x => x.id === id)) {
            listaComparare.push({id, nume});
            randeazaComparare();
        }
    };
    window.stergeComparare = function(id) {
        listaComparare = listaComparare.filter(p => p.id !== id);
        randeazaComparare();
    };
    randeazaComparare();
});