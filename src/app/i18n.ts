/*
 * core/i18n.ts - every piece of text the UI shows, in French and English.
 * `Strings` is the contract: both dictionaries implement it in full, so a
 * missing translation is a compile error rather than a blank label.
 */
import type { AppLanguage, CalendarState, ConfigFileErrorCode } from 'budget-lib';

export interface Strings {
  appName: string;
  nav: { transactions: string };
  common: {
    cancel: string; delete: string; save: string; add: string;
    expense: string; income: string; all: string; back: string;
    noDescription: string; ok: string;
  };
  frequency: { monthly: string; quarterly: string; yearly: string };
  months: string[];
  budget: {
    balance: string; income: string; expenses: string;
    searchPlaceholder: string; emptyTitle: string; emptyText: string;
    noMatch: string; recurringBadge: string;
    emptyRecurring: string; emptyOneOff: string; currentMonth: string;
    oneOff: string; recurring: string;
    deleteTitle: string; deleteBody(details: string): string;
    deleteScopeBody: string; thisOccurrence: string; wholeSeries: string;
    categoryFilter: string; resetFilters: string; filters: string;
    previousMonth: string; nextMonth: string; previousYear: string; nextYear: string;
  };
  levels: { critical: string; low: string; medium: string; high: string };
  editor: {
    newTitle: string; editTitle: string; amount: string; date: string; description: string;
    category: string; repeat: string; frequency: string; limited: string;
    occurrences: string; invalidAmount: string; invalidDate: string; scopeTitle: string;
    scopeBody: string; occurrenceOnly: string; seriesToo: string;
  };
  stats: {
    title: string; expensesByCategory: string; fromMonth: string; toMonth: string; recurringExpensesByCategory: string; history: string;
    noData: string;
  };
  settings: {
    title: string; general: string; language: string; currency: string; dateFormat: string;
    amountFormat: string; theme: string; themeSystem: string; themeLight: string;
    themeDark: string; formatLocale: string; thresholds: string; thresholdsHelp: string;
    low: string; medium: string; high: string; thresholdsOrder: string; thresholdsSaved: string;
    manage: string; recurrences: string; chooseOption: string;
    tabs: { general: string; budget: string; calendar: string; data: string };
  };
  calendar: {
    title: string; help: string; enable: string; url: string; username: string; password: string;
    passwordKept: string; passwordSession: string; passwordStored: string; proxy: string; proxyHelp: string; save: string; check: string; syncNow: string;
    syncInterval: string; syncIntervalHelp: string;
    states: Record<CalendarState, string>; never: string; lastSync(date: string): string;
    invalidConfig: string; passwordRequired: string; connected: string; connectedDisabled: string; authError: string;
    networkError: string; serverError(message: string): string; conflicts(count: number): string;
  };
  categories: {
    title: string; newName: string; exists(name: string): string;
    mustKeepOne: string; deleteBody(name: string): string; rename: string; pickIcon: string;
  };
  backup: {
    title: string; help: string; export: string; import: string; confirm: string; invalid: string;
    corrupted: string;
  };
  config: {
    help: string; export: string; import: string; passphrase: string; passphraseConfirm: string;
    passphraseHelp: string; passphraseMismatch: string; imported: string; importedCalendar: string;
    importedCalendarPassword: string; importedNoCalendar: string; bankIgnored: string;
    errors: Record<ConfigFileErrorCode, string>; unreadable: string;
  };
  install: { title: string; body: string; install: string; dismiss: string; settingsHelp: string };
  onboarding: {
    label: string; skip: string; next: string; start: string; replayTitle: string; replayHelp: string; replay: string;
    slides: { title: string; body: string }[];
  };
  recurrences: {
    title: string; empty: string; deleteBody(name: string): string;
    from(month: string): string; range(start: string, end: string, count: number): string;
    dayOf(day: number): string;
  };
}

const en: Strings = {
  appName: 'Budget',
  nav: { transactions: 'Transactions' },
  common: {
    cancel: 'Cancel', delete: 'Delete', save: 'Save', add: 'Add',
    expense: 'Expense', income: 'Income', all: 'All', back: 'Back',
    noDescription: '(no description)', ok: 'OK',
  },
  frequency: { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' },
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'],
  budget: {
    balance: 'Balance', income: 'Income', expenses: 'Expenses',
    searchPlaceholder: 'Search...', emptyTitle: 'No transactions',
    emptyText: 'Tap + to add your first transaction of the month.',
    noMatch: 'No transaction matches these filters.', recurringBadge: 'recurring',
    currentMonth: 'Current month',
    emptyRecurring: 'No recurring transactions this month.', emptyOneOff: 'No one-off transactions this month.',
    oneOff: 'One-off', recurring: 'Recurring',
    deleteTitle: 'Delete transaction?',
    deleteBody: (details) => `${details} will be permanently deleted.`,
    deleteScopeBody: 'This transaction belongs to a recurring series.',
    thisOccurrence: 'This occurrence only', wholeSeries: 'Delete the whole series',
    categoryFilter: 'Category', resetFilters: 'Reset', filters: 'Filters',
    previousMonth: 'Previous month', nextMonth: 'Next month', previousYear: 'Previous year', nextYear: 'Next year',
  },
  levels: { critical: 'Critical', low: 'Low', medium: 'Medium', high: 'Comfortable' },
  editor: {
    newTitle: 'New transaction', editTitle: 'Edit transaction', amount: 'Amount', date: 'Date',
    description: 'Description', category: 'Category', repeat: 'Repeat',
    frequency: 'Frequency', limited: 'Limit the number of occurrences',
    occurrences: 'Occurrences', invalidAmount: 'Enter an amount greater than zero.', invalidDate: 'Enter a valid date.',
    scopeTitle: 'Apply the change to',
    scopeBody: 'This transaction is part of a recurring series.',
    occurrenceOnly: 'This occurrence only', seriesToo: 'The whole series',
  },
  stats: {
    title: 'Statistics', expensesByCategory: 'Other expenses by category',
    fromMonth: 'From', toMonth: 'To',
    recurringExpensesByCategory: 'Recurring expenses by category',
    history: 'History', noData: 'Nothing to show yet.',
  },
  settings: {
    title: 'Settings', general: 'General', language: 'Language', currency: 'Currency',
    dateFormat: 'Date format', amountFormat: 'Amount format', theme: 'Theme',
    themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark', formatLocale: 'Language default',
    thresholds: 'Balance thresholds',
    thresholdsHelp: 'Below Low: critical. Low to Medium: low. Medium to High: medium. Above High: comfortable.',
    low: 'Low (x)', medium: 'Medium (y)', high: 'High (z)',
    thresholdsOrder: 'Thresholds must satisfy x < y < z.', thresholdsSaved: 'Thresholds saved',
    manage: 'Manage', recurrences: 'Recurring transactions',
    chooseOption: 'Choose',
    tabs: { general: 'General', budget: 'Budget', calendar: 'Calendar', data: 'Data' },
  },
  calendar: {
    title: 'Calendar synchronisation',
    help: 'Transactions are stored as all-day events in this CalDAV calendar, shared between desktop, mobile and web. Recurrence templates stay on this device.',
    enable: 'Enable synchronisation', url: 'Calendar URL', username: 'Username', password: 'Password / app password',
    passwordKept: 'Leave empty to keep the saved password',
    passwordSession: 'This browser cannot keep secrets: the password stays in memory for this session only. Enter it again after reloading the app.',
    passwordStored: 'The password is stored encrypted on this device only; it is never shown again and never leaves the device except to reach the calendar server.',
    proxy: 'CORS proxy (optional)',
    proxyHelp: 'Address of a budget-caldav-proxy deployment, needed when the calendar server does not allow web apps (most hosted providers). Leave empty for direct access.',
    save: 'Save settings', check: 'Test connection', syncNow: 'Synchronise now',
    syncInterval: 'Automatic synchronisation (minutes)', syncIntervalHelp: 'Synchronise every N minutes while the app is open. 0 turns it off.',
    states: { disabled: 'Synchronisation off', syncing: 'Synchronising...', online: 'Connected', offline: 'Offline', error: 'Error' },
    never: 'never', lastSync: (date) => 'Last synchronisation: ' + date,
    invalidConfig: 'Enter an HTTP(S) calendar URL and a username.',
    passwordRequired: 'Enter the calendar password for this session in Settings.',
    connected: 'Connection successful.',
    connectedDisabled: 'Connection successful. Turn on "Enable synchronisation" to start exchanging transactions.',
    authError: 'Authentication failed. Check the username and password.',
    networkError: 'Calendar unreachable. Changes stay on this device. Check your connection and the server CORS settings.',
    serverError: (message) => 'Calendar error: ' + message,
    conflicts: (count) => count + ' conflict(s) skipped. Synchronise again to retry.',
  },
  categories: {
    title: 'Categories', newName: 'New category',
    exists: (name) => `The category "${name}" already exists.`,
    mustKeepOne: 'At least one category must remain.',
    deleteBody: (name) => `Delete "${name}"? Existing transactions keep it; only the list offered for new ones changes.`,
    rename: 'Rename', pickIcon: 'Change the icon',
  },
  backup: {
    title: 'Backup', help: 'Export the budget to a file, or restore it from a previous export.',
    export: 'Export a backup', import: 'Import a backup',
    confirm: 'Replace all the data of this device with this backup?',
    invalid: 'This file is not a recognised Budget backup.',
    corrupted: 'The saved budget could not be read and was set aside. The app starts empty; restore a backup if you have one.',
  },
  config: {
    help: 'Settings, thresholds and calendar access (including its password) can be moved to another device in a file encrypted with a passphrase. Nothing can be recovered without it.',
    export: 'Export the configuration', import: 'Import a configuration',
    passphrase: 'Passphrase', passphraseConfirm: 'Confirm the passphrase',
    passphraseHelp: 'At least 8 characters. Keep it safe: it cannot be recovered.',
    passphraseMismatch: 'The two passphrases differ.',
    imported: 'Configuration imported.', importedCalendar: 'Calendar access applied.',
    importedCalendarPassword: 'Calendar password applied.',
    importedNoCalendar: 'No calendar access in this file.',
    bankIgnored: 'The bank configuration of the file was ignored: this app has no bank import.',
    errors: {
      format: 'This file is not a Budget configuration, or comes from a newer version.',
      passphrase: 'Wrong passphrase, or damaged file.',
      content: 'The content of this file is not a valid configuration.',
      'weak-passphrase': 'The passphrase must have at least 8 characters.',
    },
    unreadable: 'The file could not be read.',
  },
  install: {
    title: 'Install Budget', body: 'Add the app to your home screen to use it full screen and offline.',
    install: 'Install', dismiss: 'No thanks',
    settingsHelp: 'Install the app on this device to use it full screen and offline.',
  },
  onboarding: {
    label: 'Welcome tour', skip: 'Skip', next: 'Next', start: 'Get started',
    replayTitle: 'Introduction', replayHelp: 'Replay the presentation of the app.', replay: 'Show the tour',
    slides: [
      { title: 'Welcome to Budget', body: 'Track your income and expenses month by month, simply and privately.' },
      { title: 'Add transactions', body: 'Tap the plus button to record an expense or an income, with its date, amount and category.' },
      { title: 'Recurring transactions', body: 'Turn on "Repeat" for rent, salary or subscriptions: they come back automatically every month, quarter or year.' },
      { title: 'Stats and history', body: 'See where your money goes by category and follow your balance over the months.' },
      { title: 'Sync with your calendar', body: 'Connect an online calendar in Settings to keep your transactions on all your devices.' },
    ],
  },
  recurrences: {
    title: 'Recurring transactions', empty: 'No recurring transaction yet. Enable "Repeat" when adding a transaction.',
    deleteBody: (name) => `Stop "${name}"? Occurrences already created stay in their months.`,
    from: (month) => `from ${month}`, range: (start, end, count) => `${start} - ${end} (${count} times)`,
    dayOf: (day) => `day ${day}`,
  },
};

const fr: Strings = {
  appName: 'Budget',
  nav: { transactions: 'Transactions' },
  common: {
    cancel: 'Annuler', delete: 'Supprimer', save: 'Enregistrer', add: 'Ajouter',
    expense: 'Dépense', income: 'Revenu', all: 'Tout', back: 'Retour',
    noDescription: '(sans description)', ok: 'OK',
  },
  frequency: { monthly: 'Mensuelle', quarterly: 'Trimestrielle', yearly: 'Annuelle' },
  months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août',
    'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  budget: {
    balance: 'Solde', income: 'Revenus', expenses: 'Dépenses',
    searchPlaceholder: 'Rechercher...', emptyTitle: 'Aucune transaction',
    emptyText: 'Appuyez sur + pour ajouter votre première transaction du mois.',
    noMatch: 'Aucune transaction ne correspond à ces filtres.', recurringBadge: 'récurrente',
    currentMonth: 'Mois en cours',
    emptyRecurring: 'Aucune transaction récurrente ce mois-ci.', emptyOneOff: 'Aucune transaction ponctuelle ce mois-ci.',
    oneOff: 'Ponctuelles', recurring: 'Récurrentes',
    deleteTitle: 'Supprimer la transaction ?',
    deleteBody: (details) => `${details} sera définitivement supprimée.`,
    deleteScopeBody: 'Cette transaction fait partie d’une série récurrente.',
    thisOccurrence: 'Cette occurrence uniquement', wholeSeries: 'Supprimer toute la série',
    categoryFilter: 'Catégorie', resetFilters: 'Réinitialiser', filters: 'Filtres',
    previousMonth: 'Mois précédent', nextMonth: 'Mois suivant', previousYear: 'Année précédente', nextYear: 'Année suivante',
  },
  levels: { critical: 'Critique', low: 'Faible', medium: 'Moyen', high: 'Confortable' },
  editor: {
    newTitle: 'Nouvelle transaction', editTitle: 'Modifier la transaction',
    amount: 'Montant', date: 'Date', description: 'Description', category: 'Catégorie',
    repeat: 'Répéter', frequency: 'Fréquence', limited: "Limiter le nombre d'occurrences",
    occurrences: 'Occurrences', invalidAmount: 'Saisissez un montant supérieur à zéro.', invalidDate: 'Saisissez une date valide.',
    scopeTitle: 'Appliquer la modification à',
    scopeBody: 'Cette transaction fait partie d’une série récurrente.',
    occurrenceOnly: 'Cette occurrence uniquement', seriesToo: 'Toute la série',
  },
  stats: {
    title: 'Statistiques', expensesByCategory: 'Autres dépenses par catégorie',
    fromMonth: 'Du', toMonth: 'Au',
    recurringExpensesByCategory: 'Dépenses récurrentes par catégorie',
    history: 'Historique', noData: 'Rien à afficher pour le moment.',
  },
  settings: {
    title: 'Réglages', general: 'Général', language: 'Langue', currency: 'Devise',
    dateFormat: 'Format de date', amountFormat: 'Format des montants', theme: 'Thème',
    themeSystem: 'Système', themeLight: 'Clair', themeDark: 'Sombre', formatLocale: 'Selon la langue',
    thresholds: 'Seuils du solde',
    thresholdsHelp: 'Sous Faible : critique. De Faible à Moyen : faible. De Moyen à Élevé : moyen. Au-delà d’Élevé : confortable.',
    low: 'Faible (x)', medium: 'Moyen (y)', high: 'Élevé (z)',
    thresholdsOrder: 'Les seuils doivent respecter x < y < z.', thresholdsSaved: 'Seuils enregistrés',
    manage: 'Gérer', recurrences: 'Transactions récurrentes',
    chooseOption: 'Choisir',
    tabs: { general: 'Général', budget: 'Budget', calendar: 'Agenda', data: 'Données' },
  },
  calendar: {
    title: 'Synchronisation du calendrier',
    help: 'Les transactions sont stock\u00e9es comme des \u00e9v\u00e9nements sur toute la journ\u00e9e dans ce calendrier CalDAV, partag\u00e9 entre bureau, mobile et web. Les mod\u00e8les de r\u00e9currence restent sur cet appareil.',
    enable: 'Activer la synchronisation', url: 'URL du calendrier', username: 'Identifiant', password: 'Mot de passe / mot de passe d\'application',
    passwordKept: 'Laisser vide pour conserver le mot de passe enregistr\u00e9',
    passwordSession: 'Ce navigateur ne peut pas conserver de secret : le mot de passe reste en m\u00e9moire pour cette session uniquement. Saisissez-le \u00e0 nouveau apr\u00e8s rechargement.',
    passwordStored: 'Le mot de passe est conserv\u00e9 chiffr\u00e9 sur cet appareil uniquement ; il n\u2019est jamais r\u00e9affich\u00e9 et ne quitte l\u2019appareil que pour joindre le serveur de calendrier.',
    proxy: 'Proxy CORS (optionnel)',
    proxyHelp: 'Adresse d\u2019un d\u00e9ploiement de budget-caldav-proxy, n\u00e9cessaire quand le serveur de calendrier n\u2019autorise pas les applications web (la plupart des h\u00e9bergeurs). Laisser vide pour un acc\u00e8s direct.',
    save: 'Enregistrer les r\u00e9glages', check: 'Tester la connexion', syncNow: 'Synchroniser maintenant',
    syncInterval: 'Synchronisation automatique (minutes)', syncIntervalHelp: 'Synchronise toutes les N minutes tant que l\'application est ouverte. 0 la d\u00e9sactive.',
    states: { disabled: 'Synchronisation d\u00e9sactiv\u00e9e', syncing: 'Synchronisation...', online: 'Connect\u00e9', offline: 'Hors ligne', error: 'Erreur' },
    never: 'jamais', lastSync: (date) => 'Derni\u00e8re synchronisation : ' + date,
    invalidConfig: 'Saisissez une URL de calendrier HTTP(S) et un identifiant.',
    passwordRequired: 'Saisissez le mot de passe du calendrier pour cette session dans les r\u00e9glages.',
    connected: 'Connexion r\u00e9ussie.',
    connectedDisabled: 'Connexion r\u00e9ussie. Activez \u00ab Activer la synchronisation \u00bb pour commencer \u00e0 \u00e9changer les transactions.',
    authError: 'Authentification refus\u00e9e. V\u00e9rifiez l\'identifiant et le mot de passe.',
    networkError: 'Calendrier inaccessible. Les changements restent sur cet appareil. V\u00e9rifiez la connexion et les r\u00e9glages CORS du serveur.',
    serverError: (message) => 'Erreur du calendrier : ' + message,
    conflicts: (count) => count + ' conflit(s) ignor\u00e9(s). Relancez la synchronisation.',
  },
  categories: {
    title: 'Catégories', newName: 'Nouvelle catégorie',
    exists: (name) => `La catégorie « ${name} » existe déjà.`,
    mustKeepOne: 'Il faut conserver au moins une catégorie.',
    deleteBody: (name) => `Supprimer « ${name} » ? Les transactions existantes la gardent ; seule la liste proposée à la saisie change.`,
    rename: 'Renommer', pickIcon: "Changer l'icône",
  },
  backup: {
    title: 'Sauvegarde', help: 'Exporte le budget dans un fichier, ou le restaure depuis un export précédent.',
    export: 'Exporter une sauvegarde', import: 'Importer une sauvegarde',
    confirm: 'Remplacer toutes les données de cet appareil par cette sauvegarde ?',
    invalid: 'Ce fichier n’est pas une sauvegarde Budget reconnue.',
    corrupted: 'Le budget enregistré est illisible et a été mis de côté. L’application démarre vide ; restaurez une sauvegarde si vous en avez une.',
  },
  config: {
    help: 'Les réglages, les seuils et l’accès au calendrier (avec son mot de passe) peuvent passer sur un autre appareil dans un fichier chiffré par une phrase secrète. Rien n’est récupérable sans elle.',
    export: 'Exporter la configuration', import: 'Importer une configuration',
    passphrase: 'Phrase secrète', passphraseConfirm: 'Confirmer la phrase secrète',
    passphraseHelp: 'Au moins 8 caractères. Conservez-la précieusement : elle ne peut pas être retrouvée.',
    passphraseMismatch: 'Les deux phrases secrètes diffèrent.',
    imported: 'Configuration importée.', importedCalendar: 'Accès au calendrier appliqué.',
    importedCalendarPassword: 'Mot de passe du calendrier appliqué.',
    importedNoCalendar: 'Aucun accès au calendrier dans ce fichier.',
    bankIgnored: 'La configuration bancaire du fichier a été ignorée : cette application n’a pas d’import bancaire.',
    errors: {
      format: 'Ce fichier n’est pas une configuration Budget, ou provient d’une version plus récente.',
      passphrase: 'Phrase secrète incorrecte, ou fichier endommagé.',
      content: 'Le contenu de ce fichier n’est pas une configuration valide.',
      'weak-passphrase': 'La phrase secrète doit compter au moins 8 caractères.',
    },
    unreadable: 'Le fichier n’a pas pu être lu.',
  },
  install: {
    title: 'Installer Budget', body: 'Ajoutez l’application à votre écran d’accueil pour l’utiliser en plein écran et hors ligne.',
    install: 'Installer', dismiss: 'Non merci',
    settingsHelp: 'Installez l’application sur cet appareil pour l’utiliser en plein écran et hors ligne.',
  },
  onboarding: {
    label: 'Présentation', skip: 'Passer', next: 'Suivant', start: 'Commencer',
    replayTitle: 'Présentation', replayHelp: 'Revoir la présentation de l’application.', replay: 'Afficher la présentation',
    slides: [
      { title: 'Bienvenue dans Budget', body: 'Suivez vos revenus et vos dépenses mois par mois, simplement et en toute confidentialité.' },
      { title: 'Ajouter des transactions', body: 'Touchez le bouton plus pour saisir une dépense ou un revenu, avec sa date, son montant et sa catégorie.' },
      { title: 'Transactions récurrentes', body: 'Activez « Répéter » pour le loyer, le salaire ou les abonnements : ils reviennent automatiquement chaque mois, trimestre ou année.' },
      { title: 'Stats et historique', body: 'Voyez où va votre argent par catégorie et suivez votre solde au fil des mois.' },
      { title: 'Synchronisation avec votre agenda', body: 'Connectez un agenda en ligne dans les réglages pour retrouver vos transactions sur tous vos appareils.' },
    ],
  },
  recurrences: {
    title: 'Transactions récurrentes', empty: 'Aucune transaction récurrente. Activez « Répéter » en ajoutant une transaction.',
    deleteBody: (name) => `Arrêter « ${name} » ? Les occurrences déjà créées restent dans leurs mois.`,
    from: (month) => `à partir de ${month}`, range: (start, end, count) => `${start} - ${end} (${count} fois)`,
    dayOf: (day) => `le ${day}`,
  },
};

export const STRINGS: Record<AppLanguage, Strings> = { en, fr };
