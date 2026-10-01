# Vanilla HTML Designer : créer du contenu HTML visuellement, sans imposer de framework

Écrire du contenu pour le Web ne devrait pas obliger à choisir entre un simple champ de texte enrichi et un constructeur de pages lourd, étroitement lié à une technologie particulière. **Vanilla HTML Designer**, ou VHD, propose une voie intermédiaire : un éditeur visuel léger, modulaire et intégrable, développé en JavaScript natif.

Le projet s’adresse aux développeurs, aux éditeurs de sites, aux CMS et aux applications métier qui souhaitent proposer une véritable expérience de composition visuelle tout en conservant un document structuré et un HTML propre.

- [Essayer la démonstration](https://anshare.org/projects/Vanilla-HTML-Designer/)
- [Voir la présentation vidéo](https://www.youtube.com/watch?v=9q2zI6bTcwM)
- [Consulter le projet sur GitHub](https://github.com/crainios/Vanilla-HTML-Designer)

## Entre éditeur de texte et constructeur de pages

Un éditeur WYSIWYG traditionnel convient bien à la rédaction d’un article, mais atteint rapidement ses limites lorsqu’il faut organiser plusieurs colonnes, combiner des composants ou contrôler précisément la structure produite. À l’autre extrémité, un constructeur de pages complet peut apporter de nombreuses possibilités, au prix d’une intégration plus lourde et d’un contenu parfois difficile à réutiliser.

VHD a été conçu pour occuper l’espace entre ces deux approches. L’utilisateur travaille dans une interface visuelle, tandis que l’application conserve une représentation JSON structurée du document. Le contenu peut ensuite être exporté sous forme de HTML destiné à l’affichage public.

Cette séparation est essentielle : le JSON reste la source éditable, alors que le HTML constitue le résultat publiable. Une application peut ainsi enregistrer le projet, le rouvrir sans perdre sa structure et produire à tout moment une version HTML autonome.

## Une mise en page structurée

Le document est organisé en sections, colonnes et blocs de contenu. Une section peut contenir d’une à six colonnes responsives. Dans chaque colonne, l’utilisateur ajoute et déplace les composants nécessaires à sa page.

VHD fournit notamment les contenus suivants :

- texte et titres ;
- images, y compris les images insérées dans un texte ;
- boutons ;
- séparateurs et espacements ;
- tableaux éditables ;
- citations ;
- code ;
- HTML libre sécurisé.

Les sections et les blocs peuvent être réorganisés directement. Un bouton d’ajout placé sous le dernier contenu facilite la poursuite de la composition sans devoir revenir en haut de l’interface.

## Une véritable mise en forme éditoriale

La barre d’outils réunit sur deux lignes les commandes utiles à la rédaction. Elle reste visible pendant le défilement d’un document long et permet d’appliquer les mises en forme courantes : gras, italique, souligné, barré, exposant, indice, couleurs, liens, alignement ou espacement des caractères.

Les commandes de paragraphe comprennent les titres, les citations, le code, les listes, les retraits et l’interligne. Plusieurs styles de listes sont disponibles, avec détection des tirets déjà présents lors de la transformation d’un texte en liste.

VHD propose également des fonctions plus éditoriales, comme les lettrines configurables. Leur hauteur, leur couleur et leur espacement peuvent être adaptés sans transformer le paragraphe en construction HTML artificielle.

La commande d’effacement de la mise en forme agit sur la sélection et restitue le texte seul, y compris lorsque celle-ci contient des titres, des citations, du code ou des listes.

## Images et galerie existante

L’éditeur n’impose pas son propre gestionnaire de médias. L’application hôte peut raccorder sa galerie grâce à une URL ou à une fonction asynchrone. VHD reçoit alors l’adresse de l’image, son texte alternatif et son titre.

Les images disposent de propriétés de largeur, d’alignement, de bordure, d’arrondi et de légende. Elles peuvent constituer un bloc autonome ou être insérées dans une zone de texte. Cette approche permet d’intégrer VHD à une médiathèque existante sans dupliquer la gestion des fichiers.

## Des tableaux réellement éditables

Le composant Tableau ne se limite pas à une grille figée. Il permet de modifier directement les cellules, d’ajouter ou de retirer des lignes et des colonnes, de régler leur largeur, de sélectionner plusieurs cellules et de les fusionner.

Les bordures, espacements, couleurs et alignements sont configurables. Le résultat reste un véritable tableau HTML portable, tandis que les informations nécessaires à sa reprise sont conservées dans le projet JSON.

## Du HTML libre, avec des garde-fous

Certaines intégrations exigent un fragment HTML particulier. Le composant **HTML libre** répond à ce besoin sans transformer l’éditeur en zone d’exécution arbitraire.

Le contenu est nettoyé avant son utilisation. Les scripts, gestionnaires d’événements, formulaires, protocoles dangereux, styles embarqués et règles de positionnement risquées sont retirés. Les sources d’iframe non autorisées sont également rejetées.

L’application hôte peut masquer entièrement ce composant si son contexte ne nécessite pas de HTML personnalisé.

## Un historique cohérent

Les fonctions Annuler et Rétablir prennent en compte les modifications de texte, les propriétés des composants, les opérations sur les tableaux ainsi que les actions personnalisées. L’objectif est de conserver un comportement prévisible, quel que soit le composant manipulé.

Cette cohérence est particulièrement importante dans un éditeur visuel : une modification de citation, une couleur, un déplacement ou une insertion doivent pouvoir être annulés comme une simple frappe de texte.

## Pensé pour être intégré

VHD ne dépend ni de React, ni de Vue, ni d’Angular, ni de jQuery. Ses sources sont constituées de modules JavaScript natifs et ne nécessitent aucune étape de compilation.

Une intégration minimale demande une feuille de style, un conteneur HTML et l’import du module principal :

```html
<link rel="stylesheet" href="/Vanilla-HTML-Designer/src/html-designer.css">

<div id="htmlDesigner"></div>

<script type="module">
import HtmlDesigner from '/Vanilla-HTML-Designer/src/HtmlDesigner.js';
import fr from '/Vanilla-HTML-Designer/src/lang/fr.js';

const editor = new HtmlDesigner('#htmlDesigner', {
    translations: fr
});
</script>
```

L’API permet ensuite de charger un projet JSON, d’importer du HTML existant, de récupérer les données éditables ou d’exporter le HTML final. Les boutons de la barre d’outils et les types de contenus disponibles peuvent être filtrés selon les besoins de l’application.

Un système de plugins permet aussi d’enregistrer de nouvelles actions, propriétés ou familles de blocs sans modifier le cœur de l’éditeur.

## À qui VHD peut-il servir ?

Vanilla HTML Designer peut convenir à différents contextes :

- un CMS souhaitant dépasser le simple champ de texte enrichi ;
- un back-office destiné à produire des pages ou des fiches structurées ;
- un blog nécessitant des colonnes, tableaux, citations et médias ;
- une application métier qui doit conserver un modèle JSON maîtrisable ;
- un projet JavaScript qui ne souhaite pas adopter un framework uniquement pour son éditeur.

VHD ne cherche pas à devenir un outil complet de création de sites avec hébergement, thèmes et publication. Il fournit le composant d’édition que l’application hôte peut adapter à son propre modèle, à sa galerie, à ses droits et à son processus d’enregistrement.

## Un projet ouvert et déjà utilisable

Vanilla HTML Designer est distribué sous licence **GNU Affero General Public License v3.0**. Son interface est disponible en français et en anglais. Une démonstration publique permet d’explorer immédiatement la mise en page, la typographie, les images, les citations et les tableaux.

Le projet a été initié, dirigé et validé par **François Milhiet**. Sa conception et son développement sont réalisés en collaboration avec ChatGPT d’OpenAI, tandis que les orientations fonctionnelles, les décisions d’architecture, les essais en situation réelle et la validation finale restent sous la responsabilité de l’initiateur du projet.

VHD est désormais suffisamment complet pour être essayé dans une intégration réelle. Les retours, propositions et contributions peuvent être déposés sur GitHub.

**Démonstration :** <https://anshare.org/projects/Vanilla-HTML-Designer/>  
**Vidéo :** <https://www.youtube.com/watch?v=9q2zI6bTcwM>  
**Code source :** <https://github.com/crainios/Vanilla-HTML-Designer>
