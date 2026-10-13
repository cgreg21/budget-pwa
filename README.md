# Budget PWA

Application de budget installable dans un navigateur, construite avec Angular et TypeScript. Son interface reprend l’organisation et les couleurs de `budget-mobile`, avec une navigation adaptée au bureau et au téléphone.

La navigation utilise Angular Router : la coque est partagée entre les pages, et Transactions, Catégories, Statistiques, Historique et Réglages (dont `/settings/recurrences`) sont des composants routés chargés à la demande sur `/budget`, `/categories`, `/stats`, `/history` et `/settings`.

Le style utilise Tailwind CSS v4 (`src/styles.css`, thème sombre/clair via variables `--c-*`) et reproduit à l’identique l’UX/UI de `budget-mobile` : tiroir, barre de mois, feuilles modales, onglets avec bouton flottant, lignes à balayer, graphiques SVG. L’import bancaire n’est volontairement pas repris. Les composants réutilisables sont dans `src/app/shared/` et les écrans dans `src/app/pages/`.

## Fonctionnalités

- Transactions par mois : création, modification, suppression, recherche, filtre revenu/dépense et récurrences mensuelles, trimestrielles ou annuelles.
- Catégories, indicateurs de solde, statistiques par catégorie et historique.
- Réglages de devise, langue de formatage, thème et seuils du solde.
- Export et restauration de sauvegardes JSON au format commun de `budget-lib`.
- Synchronisation optionnelle des transactions via un calendrier CalDAV.
- Service worker Angular pour la mise en cache de l’application et son ouverture hors ligne.

## Développement

Node.js 22 ou plus récent (exigé par Angular CLI 22).

```sh
npm install
npm start
npm run typecheck
npm test
npm run build
```

Les tests unitaires (`src/app/**/*.spec.ts`) s’exécutent avec vitest via `ng test` (environnement jsdom, `localStorage` et IndexedDB simulés dans `src/test-setup.ts`) ; `npm run test:coverage` affiche la couverture.

Pour installer la PWA, publier le build de production sur un hôte HTTPS puis utiliser l’action d’installation du navigateur. Le service worker est désactivé par le serveur de développement.

## Déploiement sur GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` publie l’application sur `https://cgreg21.github.io/budget-pwa/` à chaque push sur `master` (ou manuellement via *Run workflow*). Il clone `budget-lib` à côté de l’application, car `package.json` la référence par `file:../budget-lib`, puis exécute `npm run build:pages -- --base-href /<nom-du-dépôt>/`, copie `index.html` en `404.html` pour que les liens profonds (`/budget-pwa/stats`, …) tombent sur le routeur Angular, et ajoute `.nojekyll`.

Activation, une seule fois, dans les réglages du dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

Le manifeste utilise `start_url` et `scope` relatifs (`./`), et le service worker est enregistré par un chemin relatif : l’application fonctionne donc aussi bien à la racine d’un domaine que dans un sous-répertoire. Pour reproduire le build localement :

```sh
npm run build:pages -- --base-href /budget-pwa/
```

Le serveur CalDAV doit autoriser l’origine `https://cgreg21.github.io` (voir [CORS et hébergement web](#cors-et-hébergement-web)).

## Stockage et confidentialité

Les transactions, catégories, récurrences et seuils sont conservés dans le `localStorage` du navigateur, sous la clé `budget-pwa:data:v1`. Sans synchronisation activée, les données restent locales. Lorsque le calendrier est activé, seules les transactions sont échangées avec le serveur CalDAV choisi. Les sauvegardes JSON restent exportées et restaurées manuellement depuis les réglages. Le contenu local n’est pas chiffré : protégez l’accès au profil de navigateur et exportez régulièrement une sauvegarde.

## Synchronisation avec un calendrier CalDAV

Dans les réglages, renseignez l’URL de la collection de calendrier (par exemple `https://cloud.example.com/remote.php/dav/calendars/user/budget`), l’identifiant et le mot de passe, puis testez la connexion et activez la synchronisation. Utilisez de préférence un calendrier dédié et un mot de passe d’application. Les transactions de tous les mois deviennent des événements sur toute la journée, partagés entre bureau, mobile et web via `budget-lib`. Les autres événements du calendrier ne sont pas modifiés.

Les modèles de récurrence, seuils et réglages restent locaux. Les occurrences sont des transactions ordinaires dans le calendrier, sans récurrence CalDAV ; leur identifiant de récurrence est conservé pour ne pas les recréer lors de l’application d’un modèle local. Les catégories manquantes des transactions reçues sont ajoutées avec l’icône par défaut. En cas de modifications simultanées, la version du calendrier prend la priorité. Les suppressions sont propagées dans les deux sens ; les conflits de version refusés par le serveur sont signalés et retentés à la prochaine synchronisation.

La synchronisation est sérialisée, automatique au démarrage lorsqu’elle est activée, environ deux secondes après une modification locale, au retour de la connexion ou au premier plan. Le bouton **Synchroniser maintenant** permet aussi de la lancer. Les changements faits pendant une synchronisation sont conservés et traités au passage suivant. Hors ligne, les modifications restent possibles et enregistrées localement.

La configuration non secrète est enregistrée sous `budget-pwa:calendar:v1` et la référence de synchronisation (avec la date du dernier passage) sous `budget-pwa:calendar-baseline:v1`. Changer de calendrier ou d’identifiant réinitialise cette référence et oublie le mot de passe. **Le mot de passe est conservé chiffré sur l’appareil** (`src/app/secrets.ts`) : une clé AES-GCM 256 bits non extractible est générée à la première utilisation et stockée comme `CryptoKey` dans IndexedDB (`budget-pwa-secrets`), le chiffré étant rangé à côté ; la clé ne peut pas être exportée par du script et le mot de passe n’apparaît jamais en clair dans `localStorage` ni dans les sauvegardes. Si le navigateur ne le permet pas (mode privé, stockage effacé), le mot de passe ne vit que le temps de la session et l’écran le signale.

### CORS et hébergement web

Le transport utilise `fetch`. Le serveur CalDAV doit autoriser l’origine HTTPS de la PWA via CORS, y compris les requêtes de précontrôle `OPTIONS`, les méthodes **PROPFIND, REPORT, PUT, DELETE**, les en-têtes **Authorization, Depth, Content-Type, If-Match, If-None-Match**, et exposer **ETag** via `Access-Control-Expose-Headers`. Une PWA servie en HTTPS doit utiliser un calendrier HTTPS pour éviter le blocage du contenu mixte. Une erreur réseau ou un refus CORS apparaît comme un état hors ligne ; une authentification refusée ou une erreur HTTP est affichée comme une erreur. Le service worker continue de mettre en cache l’application, pas les identifiants ni les appels CalDAV.

Les hébergeurs grand public (Infomaniak, Murena, Disroot, Mailo…) n’envoient pas d’en-têtes CORS. Pour les utiliser depuis la PWA, déployez le proxy du projet voisin [`budget-caldav-proxy`](../budget-caldav-proxy/README.md) (Worker Cloudflare gratuit) et saisissez son adresse dans le champ **Proxy CORS** des réglages Calendrier ; l’URL du calendrier reste celle du serveur. La PWA envoie alors chaque requête au Worker en gardant le chemin et en indiquant le serveur dans un en-tête `X-Upstream`. Ce réglage est propre à la PWA (stocké dans `localStorage`, clé `budget-pwa:calendar-proxy:v1`) ; les applications mobile et bureau n’en ont pas besoin.
