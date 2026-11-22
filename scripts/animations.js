// =========================================================
// Animations communes à toutes les pages
// - onde lumineuse au toucher des boutons
// - transition douce quand on change de page
// =========================================================

const animationsReduites = window.matchMedia("(prefers-reduced-motion: reduce)").matches

// Onde lumineuse qui part de l'endroit touché
document.addEventListener("pointerdown", function (e) {
    const bouton = e.target.closest(".btn")
    if (!bouton || animationsReduites) return
    const rect = bouton.getBoundingClientRect()
    const taille = Math.max(rect.width, rect.height) * 2.2
    const onde = document.createElement("span")
    onde.className = "onde"
    onde.style.width = onde.style.height = taille + "px"
    onde.style.left = (e.clientX - rect.left - taille / 2) + "px"
    onde.style.top = (e.clientY - rect.top - taille / 2) + "px"
    bouton.appendChild(onde)
    onde.addEventListener("animationend", function () { onde.remove() })
})

// Fondu de sortie avant d'ouvrir une autre page du site
document.addEventListener("click", function (e) {
    const lien = e.target.closest("a[href]")
    if (!lien || animationsReduites) return
    const href = lien.getAttribute("href")
    if (!href || href.startsWith("#") || lien.target === "_blank" || /^https?:/.test(href)) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    const ecran = document.querySelector(".ecran.actif")
    if (!ecran) return
    e.preventDefault()
    ecran.classList.add("sortie")
    setTimeout(function () { window.location.href = href }, 260)
})

// Quand on revient en arrière avec le navigateur, réafficher la page normalement
window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
        document.querySelectorAll(".ecran.sortie").forEach(function (el) { el.classList.remove("sortie") })
    }
})
