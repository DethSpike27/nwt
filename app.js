// ── Données ──────────────────────────────────────────────────────────────────
const MOIS_NOMS = ["Janvier","Février","Mars","Avril","Mai","Juin",
                   "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

let transactions = JSON.parse(localStorage.getItem("cashews_tx") || "[]");
let moisCourant  = new Date().getMonth() + 1;
let anneeCourante = new Date().getFullYear();

function sauvegarder() {
  localStorage.setItem("cashews_tx", JSON.stringify(transactions));
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("f-date").value = new Date().toISOString().slice(0,10);
  document.getElementById("btn-prev").addEventListener("click", moisPrecedent);
  document.getElementById("btn-next").addEventListener("click", moisSuivant);
  document.getElementById("btn-annee-prev").addEventListener("click", anneePrecedente);
  document.getElementById("btn-annee-next").addEventListener("click", anneeSuivante);
  majNavLabel();
  rafraichir();
  initAutocomplete();
});

// ── Navigation mois ───────────────────────────────────────────────────────────
function majNavLabel() {
  document.getElementById("lbl-mois").textContent = MOIS_NOMS[moisCourant - 1];
  document.getElementById("lbl-annee").textContent = anneeCourante;
}
function moisPrecedent() {
  if (moisCourant === 1) { moisCourant = 12; anneeCourante--; }
  else moisCourant--;
  majNavLabel(); rafraichir();
}
function moisSuivant() {
  if (moisCourant === 12) { moisCourant = 1; anneeCourante++; }
  else moisCourant++;
  majNavLabel(); rafraichir();
}

// ── Navigation année ──────────────────────────────────────────────────────────
function anneePrecedente() {
  anneeCourante--;
  majNavLabel(); rafraichir();
}
function anneeSuivante() {
  anneeCourante++;
  majNavLabel(); rafraichir();
}

// ── Rafraîchir ────────────────────────────────────────────────────────────────
function rafraichir() {
  const prefix  = `${anneeCourante}-${String(moisCourant).padStart(2,"0")}`;
  const filtre  = document.querySelector('input[name="filtre"]:checked').value;
  const duMois  = transactions.filter(t => t.date.startsWith(prefix));
  const visible = duMois.filter(t => filtre === "tous" || t.type === filtre);

  // Tableau
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";
  [...visible].sort((a,b) => b.date.localeCompare(a.date)).forEach((t, i) => {
    const signe = t.type === "entrée" ? "+" : "-";
    const cls   = t.type === "entrée" ? "entree" : "sortie";
    const idx   = transactions.indexOf(t);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.date}</td>
      <td>${t.description}</td>
      <td>${t.categorie}</td>
      <td class="${cls}">${t.type.charAt(0).toUpperCase()+t.type.slice(1)}</td>
      <td class="${cls}">${signe}${parseFloat(t.montant).toFixed(2)} $</td>
      <td>
        <button class="btn-edit" onclick="ouvrirModal(${idx})" title="Modifier">✏️</button>
        <button class="btn-del"  onclick="supprimer(${idx})"  title="Supprimer">🗑</button>
      </td>`;
    tbody.appendChild(tr);
  });

  // Cartes & relevé
  const entrees = duMois.filter(t=>t.type==="entrée").reduce((s,t)=>s+t.montant,0);
  const sorties = duMois.filter(t=>t.type==="sortie").reduce((s,t)=>s+t.montant,0);
  const solde   = entrees - sorties;

  document.getElementById("c-entrees").textContent = `+${entrees.toFixed(2)} $`;
  document.getElementById("c-sorties").textContent = `-${sorties.toFixed(2)} $`;
  document.getElementById("c-solde").textContent   = (solde>=0?"+":"")+solde.toFixed(2)+" $";

  document.getElementById("r-entrees").textContent = `+${entrees.toFixed(2)} $`;
  document.getElementById("r-sorties").textContent = `-${sorties.toFixed(2)} $`;
  const rSolde = document.getElementById("r-solde");
  rSolde.textContent = (solde>=0?"+":"")+solde.toFixed(2)+" $";
  rSolde.style.color = solde >= 0 ? "var(--green)" : "var(--red)";

  const bilan = document.getElementById("r-bilan");
  if (entrees===0 && sorties===0) {
    bilan.textContent = "Aucune transaction";
    bilan.style.color = "var(--sub)";
  } else if (solde >= 0) {
    bilan.textContent = `✅ Excédent de ${solde.toFixed(2)} $`;
    bilan.style.color = "var(--green)";
  } else {
    bilan.textContent = `⚠️ Déficit de ${Math.abs(solde).toFixed(2)} $`;
    bilan.style.color = "var(--red)";
  }
}

// ── Ajouter ───────────────────────────────────────────────────────────────────
function ajouterTransaction() {
  const desc    = document.getElementById("f-desc").value.trim();
  const montant = parseFloat(document.getElementById("f-montant").value);
  const date    = document.getElementById("f-date").value;
  const type    = document.querySelector('input[name="type"]:checked').value;
  const cat     = document.getElementById("f-cat").value;

  if (!desc)            return alert("Veuillez entrer une description.");
  if (!montant || montant <= 0) return alert("Veuillez entrer un montant positif.");
  if (!date)            return alert("Veuillez entrer une date.");

  transactions.push({ date, description: desc, categorie: cat, type, montant });
  sauvegarder();

  document.getElementById("f-desc").value    = "";
  document.getElementById("f-montant").value = "";
  document.getElementById("f-date").value    = new Date().toISOString().slice(0,10);
  cacherSuggestions();
  rafraichir();
}

// ── Supprimer ─────────────────────────────────────────────────────────────────
function supprimer(idx) {
  const t = transactions[idx];
  if (confirm(`Supprimer « ${t.description} » ?`)) {
    transactions.splice(idx, 1);
    sauvegarder();
    rafraichir();
  }
}

// ── Autocomplétion ────────────────────────────────────────────────────────────
function initAutocomplete() {
  const input = document.getElementById("f-desc");
  const list  = document.getElementById("suggestions");
  let activeIdx = -1;

  input.addEventListener("input", () => {
    const val = input.value.trim().toLowerCase();
    list.innerHTML = "";
    activeIdx = -1;
    if (!val) { cacherSuggestions(); return; }

    const uniques = [...new Set(transactions.map(t=>t.description))];
    const matches = uniques.filter(d => d.toLowerCase().includes(val));
    if (!matches.length) { cacherSuggestions(); return; }

    matches.forEach(m => {
      const li = document.createElement("li");
      li.textContent = m;
      li.addEventListener("mousedown", () => {
        input.value = m;
        cacherSuggestions();
      });
      list.appendChild(li);
    });
    list.style.display = "block";
  });

  input.addEventListener("keydown", e => {
    const items = list.querySelectorAll("li");
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      activeIdx = Math.min(activeIdx+1, items.length-1);
      items.forEach((li,i) => li.classList.toggle("active", i===activeIdx));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      activeIdx = Math.max(activeIdx-1, -1);
      items.forEach((li,i) => li.classList.toggle("active", i===activeIdx));
      e.preventDefault();
    } else if (e.key === "Enter" && activeIdx >= 0) {
      input.value = items[activeIdx].textContent;
      cacherSuggestions();
      e.preventDefault();
    } else if (e.key === "Escape") {
      cacherSuggestions();
    }
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".autocomplete-wrap")) cacherSuggestions();
  });
}

function cacherSuggestions() {
  const list = document.getElementById("suggestions");
  list.innerHTML = "";
  list.style.display = "none";
}

// ── Modal Édition ─────────────────────────────────────────────────────────────
let idxEnEdition = -1;

function ouvrirModal(idx) {
  idxEnEdition = idx;
  const t = transactions[idx];
  document.getElementById("m-desc").value    = t.description;
  document.getElementById("m-montant").value = t.montant;
  document.getElementById("m-date").value    = t.date;
  document.getElementById("m-cat").value     = t.categorie;
  document.querySelectorAll('input[name="m-type"]').forEach(r => {
    r.checked = r.value === t.type;
  });
  document.getElementById("modal-overlay").style.display = "flex";
}

function fermerModal(event) {
  if (event && event.target !== document.getElementById("modal-overlay")) return;
  document.getElementById("modal-overlay").style.display = "none";
  idxEnEdition = -1;
}

function sauvegarderModif() {
  if (idxEnEdition < 0) return;
  const desc    = document.getElementById("m-desc").value.trim();
  const montant = parseFloat(document.getElementById("m-montant").value);
  const date    = document.getElementById("m-date").value;
  const type    = document.querySelector('input[name="m-type"]:checked').value;
  const cat     = document.getElementById("m-cat").value;

  if (!desc)             return alert("Veuillez entrer une description.");
  if (!montant || montant <= 0) return alert("Veuillez entrer un montant positif.");
  if (!date)             return alert("Veuillez entrer une date.");

  transactions[idxEnEdition] = { date, description: desc, categorie: cat, type, montant };
  sauvegarder();
  document.getElementById("modal-overlay").style.display = "none";
  idxEnEdition = -1;
  rafraichir();
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exporterCSV() {
  const prefix = `${anneeCourante}-${String(moisCourant).padStart(2,"0")}`;
  const data   = transactions.filter(t => t.date.startsWith(prefix));
  if (!data.length) return alert("Aucune transaction ce mois-ci.");
  const header = "date,description,categorie,type,montant\n";
  const rows   = data.map(t =>
    `${t.date},"${t.description}","${t.categorie}",${t.type},${t.montant}`).join("\n");
  telecharger(header+rows, `cashews_${anneeCourante}_${String(moisCourant).padStart(2,"0")}.csv`, "text/csv");
}

// ── Export JSON ───────────────────────────────────────────────────────────────
function exporterJSON() {
  const prefix = `${anneeCourante}-${String(moisCourant).padStart(2,"0")}`;
  const data   = transactions.filter(t => t.date.startsWith(prefix));
  if (!data.length) return alert("Aucune transaction ce mois-ci.");
  telecharger(JSON.stringify(data, null, 2),
    `cashews_${anneeCourante}_${String(moisCourant).padStart(2,"0")}.json`, "application/json");
}

function telecharger(contenu, nom, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contenu], {type}));
  a.download = nom;
  a.click();
}

// ── Import ────────────────────────────────────────────────────────────────────
function importerFichier() {
  document.getElementById("file-input").click();
}

function lireFichier(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let nouvelles = [];
      if (file.name.endsWith(".json")) {
        nouvelles = JSON.parse(e.target.result);
      } else {
        const lines = e.target.result.trim().split("\n");
        const headers = lines[0].split(",");
        nouvelles = lines.slice(1).map(line => {
          const vals = line.match(/(".*?"|[^,]+)/g) || [];
          const obj  = {};
          headers.forEach((h,i) => obj[h.trim()] = (vals[i]||"").replace(/^"|"$/g,"").trim());
          obj.montant = parseFloat(obj.montant);
          return obj;
        });
      }
      if (!confirm(`Importer ${nouvelles.length} transaction(s) ?\n⚠️ Cela remplacera toutes vos données actuelles.`)) return;
      transactions.length = 0;
      nouvelles.forEach(n => transactions.push(n));
      sauvegarder();
      rafraichir();
      alert(`✅ ${nouvelles.length} transaction(s) importée(s) avec succès.`);
    } catch(err) {
      alert("Erreur lors de l'import : " + err.message);
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}
